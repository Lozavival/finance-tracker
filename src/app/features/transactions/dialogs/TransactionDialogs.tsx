import { TransactionFormDialog } from './TransactionFormDialog';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { type Transaction, type TransactionDraft, type Account, type EditingTarget } from '@/data/transactions';

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
      <TransactionFormDialog
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

      <DeleteTransactionDialog
        target={deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={onDelete}
      />
    </>
  );
}
