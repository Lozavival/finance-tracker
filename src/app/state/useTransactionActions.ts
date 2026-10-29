import { useState } from 'react';
import { type Transaction, type TransactionDraft, type EditingTarget } from '@/data/transactions';
import { useFinance, findTransferLegs, findInstallmentSeries, findRecurringSeries } from './FinanceContext';
import { useNotify } from './NotificationsContext';
import { logger } from '@/lib/logger';

const actionsLogger = logger.child('TransactionActions');

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
    actionsLogger.debug('openAddDialog', options);
    setEditingTarget(null);
    setInitialRecurring(options?.recurring ?? false);
    setDialogOpen(true);
  }

  function openEditDialog(transaction: Transaction) {
    setInitialRecurring(false);
    const legs = findTransferLegs(transactions, transaction);
    const series = findInstallmentSeries(transactions, transaction);
    const recurringSeries = findRecurringSeries(transactions, transaction);
    let target: EditingTarget;
    if (legs) {
      target = { kind: 'transfer', outgoing: legs.outgoing, incoming: legs.incoming };
    } else if (series) {
      target = { kind: 'installments', series };
    } else if (recurringSeries && transaction.recurring) {
      target = { kind: 'recurring', series: recurringSeries, ruleId: transaction.recurring.ruleId };
    } else {
      target = { kind: 'single', transaction };
    }
    actionsLogger.info('openEditDialog', { id: transaction.id, targetKind: target.kind });
    setEditingTarget(target);
    setDialogOpen(true);
  }

  function saveTransaction(draft: TransactionDraft) {
    const isEdit = editingTarget !== null;
    actionsLogger.info('saveTransaction draft submitted', { kind: draft.kind, isEdit });
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
      actionsLogger.info('deleteTransaction confirmed', { id: target.id, scope });
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
