import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import {
  type Transaction,
  type TransactionDraft,
  type EditingTarget,
  findTransferLegs,
  buildTransferLegs,
  createTransactionId,
} from '@/data/transactions';
import { SEEDED_TRANSACTIONS } from '@/data/seed';
import { getToday } from '@/data/dates';
import { type CardStatement, buildStatements } from '@/data/cardStatements';
import { type CashMovement, type AccountLedger, buildCashMovements, buildLedgers } from '@/data/ledger';
import { buildInstallments, findInstallmentSeries } from '@/data/installments';
import { useSettings } from './SettingsContext';

export type FinanceContextValue = {
  transactions: Transaction[];
  statements: CardStatement[];
  movements: CashMovement[];
  ledgers: Record<string, AccountLedger>;
  today: Date;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  saveTransactionDraft: (draft: TransactionDraft, editingTarget?: EditingTarget | null) => void;
  deleteTransactionTarget: (target: Transaction) => void;
  reassignType: (fromTypeId: string, toTypeId: string) => void;
  reassignPaymentMethod: (fromMethodId: string, toMethodId: string) => void;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { settings, isCreditCard, findAccount } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>(SEEDED_TRANSACTIONS);
  const today = useMemo(() => getToday(), []);

  const statements = useMemo(() => buildStatements(transactions, settings, today), [transactions, settings, today]);

  const movements = useMemo(
    () => buildCashMovements(transactions, statements, settings),
    [transactions, statements, settings],
  );

  const ledgers = useMemo(() => buildLedgers(movements, settings), [movements, settings]);

  const saveTransactionDraft = useCallback(
    (draft: TransactionDraft, editingTarget?: EditingTarget | null) => {
      setTransactions(prev => {
        let nextTransactions = [...prev];
        let existingIds: string[] = [];
        let groupId = createTransactionId();
        let transferId = createTransactionId();

        if (editingTarget) {
          if (editingTarget.kind === 'single') {
            existingIds = [editingTarget.transaction.id];
            nextTransactions = nextTransactions.filter(t => t.id !== editingTarget.transaction.id);
          } else if (editingTarget.kind === 'transfer') {
            existingIds = [editingTarget.outgoing.id, editingTarget.incoming.id];
            transferId = editingTarget.outgoing.transferId ?? createTransactionId();
            nextTransactions = nextTransactions.filter(t => t.transferId !== transferId);
          } else if (editingTarget.kind === 'installments') {
            existingIds = editingTarget.series.map(t => t.id);
            groupId = editingTarget.series[0]?.installment?.groupId ?? createTransactionId();
            nextTransactions = nextTransactions.filter(t => t.installment?.groupId !== groupId);
          }
        }

        if (draft.kind === 'single') {
          const id = existingIds[0] ?? createTransactionId();
          nextTransactions.push({ ...draft.transaction, id });
        } else if (draft.kind === 'transfer') {
          const ids: [string, string] = [
            existingIds[0] ?? createTransactionId(),
            existingIds[1] ?? createTransactionId(),
          ];
          const fromAcc = findAccount(draft.fromAccountId);
          const toAcc = findAccount(draft.toAccountId);
          const legs = buildTransferLegs(draft, transferId, ids, {
            fromName: fromAcc?.name,
            toName: toAcc?.name,
          });
          nextTransactions.push(legs[0], legs[1]);
        } else if (draft.kind === 'installments') {
          if (!isCreditCard(draft.transaction.paymentMethodId)) {
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

        return nextTransactions;
      });
    },
    [findAccount, isCreditCard],
  );

  const deleteTransactionTarget = useCallback((target: Transaction) => {
    setTransactions(prev => {
      if (target.transferId) {
        return prev.filter(t => t.transferId !== target.transferId);
      }
      if (target.installment) {
        return prev.filter(t => t.installment?.groupId !== target.installment!.groupId);
      }
      return prev.filter(t => t.id !== target.id);
    });
  }, []);

  const reassignType = useCallback((fromTypeId: string, toTypeId: string) => {
    setTransactions(prev => prev.map(t => (t.typeId === fromTypeId ? { ...t, typeId: toTypeId } : t)));
  }, []);

  const reassignPaymentMethod = useCallback((fromMethodId: string, toMethodId: string) => {
    setTransactions(prev =>
      prev.map(t => (t.paymentMethodId === fromMethodId ? { ...t, paymentMethodId: toMethodId } : t)),
    );
  }, []);

  const value = useMemo(
    () => ({
      transactions,
      statements,
      movements,
      ledgers,
      today,
      setTransactions,
      saveTransactionDraft,
      deleteTransactionTarget,
      reassignType,
      reassignPaymentMethod,
    }),
    [
      transactions,
      statements,
      movements,
      ledgers,
      today,
      saveTransactionDraft,
      deleteTransactionTarget,
      reassignType,
      reassignPaymentMethod,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}

export { findTransferLegs, findInstallmentSeries };
