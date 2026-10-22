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
import { type RecurringRule } from '@/data/recurring';
import { useSettings } from '@/state/SettingsContext';
import { useFinance } from '@/state/FinanceContext';
import { useNotify } from '@/state/NotificationsContext';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useI18n } from '@/i18n';
import { Archive } from 'lucide-react';

export type ArchiveAccountDialogProps = {
  account: AccountConfig | null;
  open: boolean;
  onClose: () => void;
  transactions?: Transaction[];
  recurringRules?: RecurringRule[];
  onArchived?: () => void;
};

export function ArchiveAccountDialog({
  account,
  open,
  onClose,
  transactions: propTransactions,
  recurringRules: propRecurringRules,
  onArchived,
}: ArchiveAccountDialogProps) {
  const { settings, dispatch } = useSettings();
  const {
    transactions: contextTransactions,
    recurringRules: contextRules,
    cancelRecurringRulesForAccount,
  } = useFinance();
  const { t } = useI18n();
  const notify = useNotify();

  const transactions = propTransactions ?? contextTransactions;
  const recurringRules = propRecurringRules ?? contextRules;

  const matchingTransactions = useMemo(() => {
    if (!account) return [];
    return transactions.filter(t => t.accountId === account.id);
  }, [account, transactions]);

  const activeMatchingRules = useMemo(() => {
    if (!account) return [];
    return recurringRules.filter(r => r.accountId === account.id && r.status === 'active');
  }, [account, recurringRules]);

  const activeAccounts = useMemo(() => {
    return settings.accounts.filter(a => !a.archived);
  }, [settings.accounts]);

  if (!account) return null;

  const totalTransactions = matchingTransactions.length;
  const isLastActiveAccount = activeAccounts.length <= 1;

  function handleArchive() {
    if (isLastActiveAccount || !account) return;
    cancelRecurringRulesForAccount(account.id);
    dispatch({ type: 'account/archive', payload: { id: account.id } });
    notify.success('notifications.ops.accountArchived', {
      id: `account-archive-${account.id}`,
      params: { name: account.name },
    });
    onArchived?.();
    onClose();
  }

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
            <AlertDialogTitle className="text-lg">{t('accounts.archiveDialog.title')}</AlertDialogTitle>
          </div>
          <div className="space-y-3 pt-2 text-left">
            {isLastActiveAccount ? (
              <InlineAlert variant="warning">{t('accounts.archiveDialog.lastAccountWarning')}</InlineAlert>
            ) : (
              <>
                <AlertDialogDescription className="text-muted-foreground text-sm">
                  {totalTransactions > 0
                    ? t('accounts.archiveDialog.descWithTransactions', {
                        name: account.name,
                        count: totalTransactions,
                      })
                    : t('accounts.archiveDialog.descNoTransactions', {
                        name: account.name,
                      })}
                </AlertDialogDescription>

                {activeMatchingRules.length > 0 && (
                  <InlineAlert variant="warning">
                    {t('accounts.archiveDialog.hasRulesWarning', {
                      count: activeMatchingRules.length,
                    })}
                  </InlineAlert>
                )}
              </>
            )}
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <AlertDialogCancel
            onClick={onClose}
            className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            {t('common.cancel')}
          </AlertDialogCancel>

          {!isLastActiveAccount && (
            <Button type="button" variant="cyan" onClick={handleArchive} className="gap-1.5">
              <Archive className="w-4 h-4" />
              {t('accounts.archiveDialog.confirmArchive')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
