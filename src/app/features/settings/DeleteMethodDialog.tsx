import { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { type PaymentMethodConfig } from '@/data/settings';
import { type Transaction } from '@/data/transactions';
import { useSettings } from '@/state/SettingsContext';
import { OptionSelect } from '@/components/shared/OptionSelect';
import { getIcon } from '@/data/icons';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useNotify } from '@/state/NotificationsContext';
import { useI18n } from '@/i18n';

type DeleteMethodDialogProps = {
  method: PaymentMethodConfig | null;
  onClose: () => void;
  transactions: Transaction[];
  onTransactionsChange: (txs: Transaction[]) => void;
};

export function DeleteMethodDialog({ method, onClose, transactions, onTransactionsChange }: DeleteMethodDialogProps) {
  const { settings, dispatch } = useSettings();
  const { t } = useI18n();
  const notify = useNotify();
  const [replacementMethodId, setReplacementMethodId] = useState<string>('');

  const open = Boolean(method);

  // Filter transactions that use this payment method
  const matchingTransactions = useMemo(() => {
    if (!method) return [];
    return transactions.filter(t => t.paymentMethodId === method.id);
  }, [method, transactions]);

  // Is this a system method that cannot be deleted?
  const isSystemMethod = Boolean(method && (method.id === 'cash' || method.behavior === 'credit-card'));

  // Available replacement methods: excluding current method
  const availableReplacements = useMemo(() => {
    if (!method) return [];
    return settings.paymentMethods.filter(m => m.id !== method.id);
  }, [method, settings.paymentMethods]);

  const replacementOptions = useMemo(() => {
    return availableReplacements.map(m => {
      const Icon = getIcon(m.icon);
      return {
        value: m.id,
        label: m.name,
        customContent: (
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 text-theme-cyan" />
            <span>{m.name}</span>
          </div>
        ),
      };
    });
  }, [availableReplacements]);

  if (!method) return null;

  const hasTransactions = matchingTransactions.length > 0;
  const isReplacementValid = availableReplacements.some(r => r.id === replacementMethodId);
  const effectiveReplacementId = isReplacementValid ? replacementMethodId : '';
  const canDelete = !isSystemMethod && (!hasTransactions || Boolean(effectiveReplacementId));

  function handleClose() {
    setReplacementMethodId('');
    onClose();
  }

  function handleDelete() {
    if (!canDelete || !method) return;

    if (hasTransactions && effectiveReplacementId) {
      // Reassign transactions in memory
      const nextTxs = transactions.map(t => {
        if (t.paymentMethodId === method.id) {
          return { ...t, paymentMethodId: effectiveReplacementId };
        }
        return t;
      });
      onTransactionsChange(nextTxs);
    }

    const deletedName = method.name;
    const targetMethod = availableReplacements.find(r => r.id === effectiveReplacementId);

    dispatch({
      type: 'method/remove',
      payload: {
        id: method.id,
        replacementId: hasTransactions && effectiveReplacementId ? effectiveReplacementId : undefined,
      },
    });

    notify.success('notifications.ops.methodDeleted', {
      id: `method-delete-${method.id}`,
      params: {
        name: deletedName,
        target: targetMethod ? targetMethod.name : '',
      },
    });

    handleClose();
  }

  const methodName = method.name;

  return (
    <AlertDialog open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <AlertDialogContent className="bg-popover border-border text-foreground sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('settings.methods.deleteTitle', { name: methodName })}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground space-y-3">
            {isSystemMethod ? (
              <span className="block text-destructive">{t('settings.methods.deleteSystemWarning')}</span>
            ) : hasTransactions ? (
              <>
                <span className="block">
                  {t('settings.methods.deleteInUseWarning', {
                    count: matchingTransactions.length,
                    name: methodName,
                  })}
                </span>
                <span className="block text-foreground font-medium">{t('settings.methods.reassignPrompt')}</span>
              </>
            ) : (
              <span className="block">{t('settings.methods.deleteUnusedDesc')}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasTransactions && !isSystemMethod && (
          <div className="py-2">
            <OptionSelect
              label={t('settings.methods.reassignLabel')}
              value={effectiveReplacementId}
              options={replacementOptions}
              onChange={setReplacementMethodId}
            />
          </div>
        )}

        {hasTransactions && !effectiveReplacementId && !isSystemMethod && (
          <InlineAlert variant="warning">{t('settings.methods.reassignSelectPrompt')}</InlineAlert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleClose}
            className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {hasTransactions ? t('settings.methods.reassignAndDelete') : t('settings.methods.deleteMethod')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
