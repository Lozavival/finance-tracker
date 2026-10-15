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
import { type Transaction } from '@/data/transactions';
import { useI18n } from '@/i18n';

export type DeleteTransactionDialogProps = {
  target: Transaction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteTransactionDialog({ target, onOpenChange, onConfirm }: DeleteTransactionDialogProps) {
  const { t, formatDate } = useI18n();

  return (
    <AlertDialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-popover border-border text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('transactions.excludeConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {target
              ? target.transferId
                ? t('transactions.excludeTransferDesc')
                : target.installment
                  ? t('transactions.excludeInstallmentsDesc', {
                      count: String(target.installment.total),
                      description: target.description,
                    })
                  : t('transactions.excludeSingleDesc', {
                      description: target.description,
                      date: formatDate(target.date),
                    })
              : t('transactions.excludeDefaultDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.exclude')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
