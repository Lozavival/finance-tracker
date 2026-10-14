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
import { TransactionDialog, type EditingTarget } from '@/features/transactions/TransactionDialog';
import { type Transaction, type TransactionDraft, type Account } from '@/data/transactions';
import { useI18n } from '@/i18n';

type TransactionDialogsProps = {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editingTarget: EditingTarget | null;
  setEditingTarget: (target: EditingTarget | null) => void;
  deleteTarget: Transaction | null;
  setDeleteTarget: (target: Transaction | null) => void;
  defaultDate: Date;
  defaultAccount?: Account;
  onSave: (draft: TransactionDraft) => void;
  onDelete: () => void;
};

export function TransactionDialogs({
  dialogOpen,
  setDialogOpen,
  editingTarget,
  setEditingTarget,
  deleteTarget,
  setDeleteTarget,
  defaultDate,
  defaultAccount,
  onSave,
  onDelete,
}: TransactionDialogsProps) {
  const { t, formatDate } = useI18n();

  return (
    <>
      <TransactionDialog
        open={dialogOpen}
        editing={editingTarget}
        defaultDate={defaultDate}
        defaultAccount={defaultAccount}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) setEditingTarget(null);
        }}
        onSave={onSave}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="bg-popover border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transactions.excludeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteTarget
                ? deleteTarget.transferId
                  ? t('transactions.excludeTransferDesc')
                  : deleteTarget.installment
                    ? t('transactions.excludeInstallmentsDesc', {
                        count: String(deleteTarget.installment.total),
                        description: deleteTarget.description,
                      })
                    : t('transactions.excludeSingleDesc', {
                        description: deleteTarget.description,
                        date: formatDate(deleteTarget.date),
                      })
                : t('transactions.excludeDefaultDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('transactions.excludeAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
