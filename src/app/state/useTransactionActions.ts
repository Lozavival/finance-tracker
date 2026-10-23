import { useState } from 'react';
import { type Transaction, type TransactionDraft, type EditingTarget } from '@/data/transactions';
import { useFinance, findTransferLegs, findInstallmentSeries, findRecurringSeries } from './FinanceContext';
import { useNotify } from './NotificationsContext';

function describeDraft(draft: TransactionDraft): string {
  if (draft.kind === 'transfer') {
    return 'Transfer';
  }
  return draft.transaction.description || 'Transaction';
}

export function useTransactionActions() {
  const { transactions, saveTransactionDraft, deleteTransactionTarget } = useFinance();
  const notify = useNotify();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [initialRecurring, setInitialRecurring] = useState(false);

  function openAddDialog(options?: { recurring?: boolean }) {
    setEditingTarget(null);
    setInitialRecurring(options?.recurring ?? false);
    setDialogOpen(true);
  }

  function openEditDialog(transaction: Transaction) {
    setInitialRecurring(false);
    const legs = findTransferLegs(transactions, transaction);
    const series = findInstallmentSeries(transactions, transaction);
    const recurringSeries = findRecurringSeries(transactions, transaction);
    if (legs) {
      setEditingTarget({ kind: 'transfer', outgoing: legs.outgoing, incoming: legs.incoming });
    } else if (series) {
      setEditingTarget({ kind: 'installments', series });
    } else if (recurringSeries && transaction.recurring) {
      setEditingTarget({ kind: 'recurring', series: recurringSeries, ruleId: transaction.recurring.ruleId });
    } else {
      setEditingTarget({ kind: 'single', transaction });
    }
    setDialogOpen(true);
  }

  function saveTransaction(draft: TransactionDraft) {
    const isEdit = editingTarget !== null;
    const savePromise = saveTransactionDraft(draft, editingTarget);

    const desc = describeDraft(draft);
    if (isEdit) {
      notify.successWhen(savePromise, 'notifications.ops.txUpdated', {
        id: 'tx-saved',
        params: { description: desc },
      });
    } else if (draft.kind === 'transfer') {
      notify.successWhen(savePromise, 'notifications.ops.transferAdded', {
        id: 'tx-saved',
        params: { description: desc },
      });
    } else if (draft.kind === 'installments') {
      notify.successWhen(savePromise, 'notifications.ops.installmentsAdded', {
        id: 'tx-saved',
        params: { count: draft.count, description: desc },
      });
    } else if (draft.kind === 'recurring') {
      notify.successWhen(savePromise, 'notifications.ops.recurringAdded', {
        id: 'tx-saved',
        params: { description: desc },
      });
    } else {
      notify.successWhen(savePromise, 'notifications.ops.txAdded', {
        id: 'tx-saved',
        params: { description: desc },
      });
    }

    setDialogOpen(false);
    setEditingTarget(null);
    setInitialRecurring(false);
  }

  function deleteTransaction(scope: 'only-this' | 'this-and-future' | 'all' = 'only-this') {
    if (deleteTarget) {
      const target = deleteTarget;
      const { undo, removedCount } = deleteTransactionTarget(target, scope);
      notify.undoable({
        id: `undo-tx-${target.id}`,
        messageKey: removedCount > 1 ? 'notifications.ops.txSeriesDeleted' : 'notifications.ops.txDeleted',
        params: { count: removedCount },
        onUndo: undo,
      });
      setDeleteTarget(null);
    }
  }

  return {
    dialogOpen,
    setDialogOpen,
    editingTarget,
    setEditingTarget,
    deleteTarget,
    setDeleteTarget,
    initialRecurring,
    openAddDialog,
    openEditDialog,
    saveTransaction,
    deleteTransaction,
  };
}
