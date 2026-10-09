import { formatFull } from '../../data/dates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { TransactionDialog, type EditingTarget } from '../TransactionDialog';
import { type Transaction, type TransactionDraft, type Account } from '../../data/transactions';

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
            <AlertDialogTitle>Exclude transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteTarget
                ? deleteTarget.transferId
                  ? 'Both sides of this transfer will be removed.'
                  : deleteTarget.installment
                    ? `All ${deleteTarget.installment.total} installments of ${deleteTarget.description} will be removed.`
                    : `${deleteTarget.description} from ${formatFull(deleteTarget.date)} will be removed.`
                : 'This transaction will be removed for this session.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Exclude transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
