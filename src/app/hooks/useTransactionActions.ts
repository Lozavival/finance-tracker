import { useState } from 'react';
import {
  type Transaction,
  type TransactionDraft,
  findTransferLegs,
  createTransactionId,
  buildTransferLegs,
} from '../data/transactions';
import { type EditingTarget } from '../components/TransactionDialog';
import { findInstallmentSeries, buildInstallments } from '../data/installments';

export function useTransactionActions(transactions: Transaction[], onTransactionsChange: (txs: Transaction[]) => void) {
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
    let nextTransactions = [...transactions];
    let existingIds: string[] = [];
    let groupId = createTransactionId();
    let transferId = createTransactionId();

    if (editingTarget) {
      if (editingTarget.kind === 'single') {
        existingIds = [editingTarget.transaction.id];
        nextTransactions = nextTransactions.filter(t => t.id !== editingTarget.transaction.id);
      } else if (editingTarget.kind === 'transfer') {
        existingIds = [editingTarget.outgoing.id, editingTarget.incoming.id];
        transferId = editingTarget.outgoing.transferId!;
        nextTransactions = nextTransactions.filter(t => t.transferId !== transferId);
      } else if (editingTarget.kind === 'installments') {
        existingIds = editingTarget.series.map(t => t.id);
        groupId = editingTarget.series[0].installment!.groupId;
        nextTransactions = nextTransactions.filter(t => t.installment?.groupId !== groupId);
      }
    }

    if (draft.kind === 'single') {
      const id = existingIds[0] ?? createTransactionId();
      nextTransactions.push({ ...draft.transaction, id });
    } else if (draft.kind === 'transfer') {
      const ids: [string, string] = [existingIds[0] ?? createTransactionId(), existingIds[1] ?? createTransactionId()];
      const legs = buildTransferLegs(draft, transferId, ids);
      nextTransactions.push(legs[0], legs[1]);
    } else if (draft.kind === 'installments') {
      if (draft.transaction.paymentMethod !== 'Credit card') {
        const id = existingIds[0] ?? createTransactionId();
        nextTransactions.push({
          ...draft.transaction,
          id,
          date: draft.firstDate,
          value: draft.totalValue,
        });
      } else {
        const ids = Array.from({ length: draft.count }, (_, i) => existingIds[i] ?? createTransactionId());
        const newInstallments = buildInstallments(draft, groupId, ids);
        nextTransactions.push(...newInstallments);
      }
    }

    onTransactionsChange(nextTransactions);
    setDialogOpen(false);
    setEditingTarget(null);
  }

  function deleteTransaction() {
    if (!deleteTarget) return;

    if (deleteTarget.transferId) {
      onTransactionsChange(transactions.filter(t => t.transferId !== deleteTarget.transferId));
    } else if (deleteTarget.installment) {
      onTransactionsChange(transactions.filter(t => t.installment?.groupId !== deleteTarget.installment!.groupId));
    } else {
      onTransactionsChange(transactions.filter(t => t.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
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
