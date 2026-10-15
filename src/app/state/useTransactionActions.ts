import { useState } from 'react';
import { type Transaction, type TransactionDraft, type EditingTarget } from '@/data/transactions';
import { useFinance, findTransferLegs, findInstallmentSeries } from './FinanceContext';

export function useTransactionActions() {
  const { transactions, saveTransactionDraft, deleteTransactionTarget } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  function openAddDialog() {
    setEditingTarget(null);
    setDialogOpen(true);
  }

  function openEditDialog(transaction: Transaction) {
    const legs = findTransferLegs(transactions, transaction);
    const series = findInstallmentSeries(transactions, transaction);
    if (legs) {
      setEditingTarget({ kind: 'transfer', outgoing: legs.outgoing, incoming: legs.incoming });
    } else if (series) {
      setEditingTarget({ kind: 'installments', series });
    } else {
      setEditingTarget({ kind: 'single', transaction });
    }
    setDialogOpen(true);
  }

  function saveTransaction(draft: TransactionDraft) {
    saveTransactionDraft(draft, editingTarget);
    setDialogOpen(false);
    setEditingTarget(null);
  }

  function deleteTransaction() {
    if (deleteTarget) {
      deleteTransactionTarget(deleteTarget);
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
    openAddDialog,
    openEditDialog,
    saveTransaction,
    deleteTransaction,
  };
}
