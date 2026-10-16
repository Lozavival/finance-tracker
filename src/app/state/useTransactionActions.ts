import { useState } from 'react';
import { type Transaction, type TransactionDraft, type EditingTarget } from '@/data/transactions';
import { useFinance, findTransferLegs, findInstallmentSeries, findRecurringSeries } from './FinanceContext';

export function useTransactionActions() {
  const { transactions, saveTransactionDraft, deleteTransactionTarget } = useFinance();
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
    saveTransactionDraft(draft, editingTarget);
    setDialogOpen(false);
    setEditingTarget(null);
    setInitialRecurring(false);
  }

  function deleteTransaction(scope: 'only-this' | 'this-and-future' | 'all' = 'only-this') {
    if (deleteTarget) {
      deleteTransactionTarget(deleteTarget, scope);
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
