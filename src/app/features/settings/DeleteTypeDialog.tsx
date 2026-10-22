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
import { type TransactionTypeConfig } from '@/data/settings';
import { type Transaction } from '@/data/transactions';
import { useSettings } from '@/state/SettingsContext';
import { OptionSelect } from '@/components/shared/OptionSelect';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useNotify } from '@/state/NotificationsContext';
import { useI18n } from '@/i18n';

type DeleteTypeDialogProps = {
  typeConfig: TransactionTypeConfig | null;
  onClose: () => void;
  transactions: Transaction[];
  onTransactionsChange: (txs: Transaction[]) => void;
};

export function DeleteTypeDialog({ typeConfig, onClose, transactions, onTransactionsChange }: DeleteTypeDialogProps) {
  const { settings, dispatch } = useSettings();
  const { t } = useI18n();
  const notify = useNotify();
  const [replacementTypeId, setReplacementTypeId] = useState<string>('');

  const open = Boolean(typeConfig);

  // Filter transactions that use this type
  const matchingTransactions = useMemo(() => {
    if (!typeConfig) return [];
    return transactions.filter(t => t.typeId === typeConfig.id);
  }, [typeConfig, transactions]);

  // Available replacement types: same direction, excluding current type
  const availableReplacements = useMemo(() => {
    if (!typeConfig) return [];
    return settings.transactionTypes.filter(t => t.direction === typeConfig.direction && t.id !== typeConfig.id);
  }, [typeConfig, settings.transactionTypes]);

  // Is this the last type in this direction?
  const isOnlyTypeInDirection = availableReplacements.length === 0;

  const replacementOptions = useMemo(() => {
    return availableReplacements.map(t => ({
      value: t.id,
      label: t.name,
      customContent: <CategoryChip typeConfig={t} size="sm" />,
    }));
  }, [availableReplacements]);

  if (!typeConfig) return null;

  const hasTransactions = matchingTransactions.length > 0;
  const isReplacementValid = availableReplacements.some(r => r.id === replacementTypeId);
  const effectiveReplacementId = isReplacementValid ? replacementTypeId : '';
  const canDelete =
    !typeConfig.system && !isOnlyTypeInDirection && (!hasTransactions || Boolean(effectiveReplacementId));

  function handleClose() {
    setReplacementTypeId('');
    onClose();
  }

  function handleDelete() {
    if (!canDelete || !typeConfig) return;

    if (hasTransactions && effectiveReplacementId) {
      // Reassign transactions in memory
      const nextTxs = transactions.map(t => {
        if (t.typeId === typeConfig.id) {
          return { ...t, typeId: effectiveReplacementId };
        }
        return t;
      });
      onTransactionsChange(nextTxs);
    }

    const deletedName = typeConfig.name;
    const targetType = availableReplacements.find(r => r.id === effectiveReplacementId);

    dispatch({
      type: 'type/remove',
      payload: {
        id: typeConfig.id,
        replacementId: hasTransactions && effectiveReplacementId ? effectiveReplacementId : undefined,
      },
    });

    notify.success('notifications.ops.typeDeleted', {
      id: `type-delete-${typeConfig.id}`,
      params: {
        name: deletedName,
        target: targetType ? targetType.name : '',
      },
    });

    handleClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <AlertDialogContent className="bg-popover border-border text-foreground sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('settings.types.deleteTitle', { name: typeConfig.name })}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground space-y-3">
            {typeConfig.system ? (
              <span className="block text-destructive">{t('settings.types.deleteSystemWarning')}</span>
            ) : isOnlyTypeInDirection ? (
              <span className="block text-destructive">
                {t('settings.types.deleteLastTypeWarning', { direction: typeConfig.direction })}
              </span>
            ) : hasTransactions ? (
              <>
                <span className="block">
                  {t('settings.types.deleteInUseWarning', {
                    count: matchingTransactions.length,
                    name: typeConfig.name,
                  })}
                </span>
                <span className="block text-foreground font-medium">
                  {t('settings.types.reassignPrompt', { direction: typeConfig.direction })}
                </span>
              </>
            ) : (
              <span className="block">{t('settings.types.deleteUnusedDesc')}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasTransactions && !isOnlyTypeInDirection && (
          <div className="py-2">
            <OptionSelect
              label={t('settings.types.reassignLabel')}
              value={replacementTypeId}
              options={replacementOptions}
              onChange={setReplacementTypeId}
            />
          </div>
        )}

        {hasTransactions && !replacementTypeId && !isOnlyTypeInDirection && (
          <InlineAlert variant="warning">{t('settings.types.reassignSelectPrompt')}</InlineAlert>
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
            {hasTransactions ? t('settings.types.reassignAndDelete') : t('settings.types.deleteType')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
