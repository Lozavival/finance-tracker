import { useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { Button } from '@/components/primitives/button';
import { type AccountConfig, getAccountColor } from '@/data/settings';
import { type Transaction } from '@/data/transactions';
import { useSettings } from '@/state/SettingsContext';
import { useFinance } from '@/state/FinanceContext';
import { useNotify } from '@/state/NotificationsContext';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useI18n } from '@/i18n';
import { Archive, Trash2 } from 'lucide-react';

export type DeleteAccountDialogProps = {
  account: AccountConfig | null;
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onDeleted?: () => void;
  onSwitchToArchive?: (account: AccountConfig) => void;
};

export function DeleteAccountDialog({
  account,
  open,
  onClose,
  transactions,
  onDeleted,
  onSwitchToArchive,
}: DeleteAccountDialogProps) {
  const { settings, dispatch } = useSettings();
  const { cancelRecurringRulesForAccount, deleteRecurringRulesForAccount } = useFinance();
  const { t } = useI18n();
  const notify = useNotify();

  const matchingTransactions = useMemo(() => {
    if (!account) return [];
    return transactions.filter(t => t.accountId === account.id);
  }, [account, transactions]);

  const activeAccounts = useMemo(() => {
    return settings.accounts.filter(a => !a.archived);
  }, [settings.accounts]);

  if (!account) return null;

  const totalCount = matchingTransactions.length;
  const isArchived = Boolean(account.archived);
  const isLastActiveAccount = !isArchived && activeAccounts.length <= 1;
  const hasTransactions = totalCount > 0;

  function handleDelete() {
    if (hasTransactions || isLastActiveAccount || !account) return;
    const targetAccount = { ...account };
    deleteRecurringRulesForAccount(targetAccount.id);
    void dispatch({ type: 'account/remove', payload: { id: targetAccount.id } });
    notify.undoable({
      id: `undo-account-delete-${targetAccount.id}`,
      messageKey: 'notifications.ops.accountDeleted',
      params: { name: targetAccount.name },
      onUndo: () => {
        void dispatch({ type: 'account/add', payload: targetAccount });
      },
    });
    onDeleted?.();
    onClose();
  }

  function handleArchiveInstead() {
    if (!account) return;
    if (onSwitchToArchive) {
      onSwitchToArchive(account);
    } else {
      cancelRecurringRulesForAccount(account.id);
      void dispatch({ type: 'account/archive', payload: { id: account.id } });
      onClose();
    }
  }

  const dialogTitle = isLastActiveAccount
    ? t('accounts.deleteDialog.title')
    : hasTransactions
      ? t('accounts.deleteDialog.cannotDeleteTitle')
      : t('accounts.deleteDialog.title');

  return (
    <AlertDialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <AlertDialogContent className="bg-popover border-border text-foreground sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm flex-shrink-0"
              style={{ backgroundColor: getAccountColor(account.color) }}
            >
              {account.initials}
            </div>
            <AlertDialogTitle className="text-lg">{dialogTitle}</AlertDialogTitle>
          </div>
          <div className="space-y-3 pt-2 text-left">
            {isLastActiveAccount ? (
              <InlineAlert variant="warning">{t('accounts.deleteDialog.lastAccountWarning')}</InlineAlert>
            ) : hasTransactions ? (
              <InlineAlert variant="warning">
                {isArchived
                  ? t('accounts.deleteDialog.archivedCannotDeleteDesc', {
                      name: account.name,
                      count: totalCount,
                    })
                  : t('accounts.deleteDialog.hasTransactionsWarning', {
                      name: account.name,
                      count: totalCount,
                    })}
              </InlineAlert>
            ) : (
              <AlertDialogDescription className="text-muted-foreground text-sm">
                {t('accounts.deleteDialog.noTransactionsDesc', {
                  name: account.name,
                })}
              </AlertDialogDescription>
            )}
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <AlertDialogCancel
            onClick={onClose}
            className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            {isArchived && hasTransactions ? t('common.close') : t('common.cancel')}
          </AlertDialogCancel>

          {isLastActiveAccount || (isArchived && hasTransactions) ? null : hasTransactions ? (
            <Button type="button" variant="cyan" onClick={handleArchiveInstead} className="gap-1.5">
              <Archive className="w-4 h-4" />
              {t('accounts.deleteDialog.archiveInstead')}
            </Button>
          ) : (
            <Button type="button" variant="destructive" onClick={handleDelete} className="gap-1.5">
              <Trash2 className="w-4 h-4" />
              {t('accounts.deleteDialog.confirmDelete')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
