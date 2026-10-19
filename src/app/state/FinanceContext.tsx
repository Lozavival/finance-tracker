import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  type Transaction,
  type TransactionDraft,
  type EditingTarget,
  findTransferLegs,
  buildTransferLegs,
  createTransactionId,
} from '@/data/transactions';
import { SEEDED_TRANSACTIONS, SEEDED_RECURRING_RULES } from '@/data/seed';
import { getToday } from '@/data/dates';
import { type CardStatement, buildStatements } from '@/data/cardStatements';
import { type CashMovement, type AccountLedger, buildCashMovements, buildLedgers } from '@/data/ledger';
import { buildInstallments, findInstallmentSeries } from '@/data/installments';
import { type RecurringRule, buildRecurringTransactions, findRecurringSeries } from '@/data/recurring';
import { getFinanceRepository } from '@/data/repository';
import { useSettings } from './SettingsContext';

export type FinanceContextValue = {
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  statements: CardStatement[];
  movements: CashMovement[];
  ledgers: Record<string, AccountLedger>;
  today: Date;
  loadedFromDate: Date | null;
  ensureTransactionsLoaded: (fromDate?: Date | null) => Promise<void>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  saveTransactionDraft: (draft: TransactionDraft, editingTarget?: EditingTarget | null) => void;
  deleteTransactionTarget: (target: Transaction, scope?: 'only-this' | 'this-and-future' | 'all') => void;
  cancelRecurringRule: (ruleId: string, effectiveDate?: Date) => void;
  cancelRecurringRulesForAccount: (accountId: string, effectiveDate?: Date) => void;
  deleteRecurringRule: (ruleId: string) => void;
  deleteRecurringRulesForAccount: (accountId: string) => void;
  reassignType: (fromTypeId: string, toTypeId: string) => void;
  reassignPaymentMethod: (fromMethodId: string, toMethodId: string) => void;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { settings, dispatch, isCreditCard, findAccount } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>(SEEDED_TRANSACTIONS);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>(SEEDED_RECURRING_RULES);
  const [historicalRollups, setHistoricalRollups] = useState<Record<string, number>>({});
  const [loadedFromDate, setLoadedFromDate] = useState<Date | null>(null);
  const loadedFromDateRef = useRef<Date | null>(null);
  loadedFromDateRef.current = loadedFromDate;

  const today = useMemo(() => getToday(), []);

  useEffect(() => {
    let cancelled = false;
    const repo = getFinanceRepository();
    repo
      .loadWorkspace(90)
      .then(snapshot => {
        if (cancelled) return;
        dispatch({ type: 'settings/hydrate', payload: snapshot.settings });
        setTransactions(snapshot.transactions);
        setRecurringRules(snapshot.recurringRules);
        setHistoricalRollups(snapshot.historicalRollups);
        setLoadedFromDate(snapshot.loadedFromDate);
      })
      .catch(() => {
        // Fallback to in-memory seed when running in isolated component tests without API server
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const ensureTransactionsLoaded = useCallback(async (fromDate?: Date | null) => {
    const currentCutoff = loadedFromDateRef.current;
    if (!currentCutoff) return;

    if (!fromDate || fromDate.getTime() < currentCutoff.getTime()) {
      try {
        const allTransactions = await getFinanceRepository().fetchTransactions({});
        loadedFromDateRef.current = null;
        setLoadedFromDate(null);
        setHistoricalRollups({});
        setTransactions(allTransactions);
      } catch {
        // Ignore network errors if running in offline/test mode
      }
    }
  }, []);

  const statements = useMemo(() => buildStatements(transactions, settings, today), [transactions, settings, today]);

  const movements = useMemo(
    () => buildCashMovements(transactions, statements, settings, historicalRollups, loadedFromDate ?? undefined),
    [transactions, statements, settings, historicalRollups, loadedFromDate],
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
          } else if (editingTarget.kind === 'recurring') {
            existingIds = editingTarget.series.map(t => t.id);
            nextTransactions = nextTransactions.filter(t => t.recurring?.ruleId !== editingTarget.ruleId);
            if (draft.kind !== 'recurring') {
              setRecurringRules(prevRules => prevRules.filter(r => r.id !== editingTarget.ruleId));
            }
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
        } else if (draft.kind === 'recurring') {
          let ruleId = createTransactionId();
          if (editingTarget && editingTarget.kind === 'recurring') {
            ruleId = editingTarget.ruleId;
          }
          const newRule: RecurringRule = {
            id: ruleId,
            description: draft.transaction.description,
            value: draft.value,
            currency: draft.transaction.currency,
            direction: draft.transaction.direction,
            typeId: draft.transaction.typeId,
            accountId: draft.transaction.accountId,
            paymentMethodId: draft.transaction.paymentMethodId,
            startDate: draft.startDate,
            frequency: draft.frequency,
            limit: draft.limit,
            status: 'active',
            createdAt: new Date(),
          };
          setRecurringRules(prevRules => {
            const filtered = prevRules.filter(r => r.id !== ruleId);
            return [...filtered, newRule];
          });
          const newInstances = buildRecurringTransactions(newRule, i => existingIds[i] ?? createTransactionId());
          nextTransactions.push(...newInstances);
        }

        return nextTransactions;
      });

      void getFinanceRepository()
        .saveTransactionDraft(draft, editingTarget)
        .then(result => {
          setTransactions(result.transactions);
          setRecurringRules(result.recurringRules);
        })
        .catch(() => {});
    },
    [findAccount, isCreditCard],
  );

  const deleteTransactionTarget = useCallback(
    (target: Transaction, scope: 'only-this' | 'this-and-future' | 'all' = 'only-this') => {
      setTransactions(prev => {
        if (target.transferId) {
          return prev.filter(t => t.transferId !== target.transferId);
        }
        if (target.installment) {
          return prev.filter(t => t.installment?.groupId !== target.installment!.groupId);
        }
        if (target.recurring) {
          const ruleId = target.recurring.ruleId;
          if (scope === 'all') {
            setRecurringRules(rRules => rRules.filter(r => r.id !== ruleId));
            return prev.filter(t => t.recurring?.ruleId !== ruleId);
          }
          if (scope === 'this-and-future') {
            setRecurringRules(rRules =>
              rRules.map(r => (r.id === ruleId ? { ...r, status: 'canceled', canceledAt: target.date } : r)),
            );
            return prev.filter(t => !(t.recurring?.ruleId === ruleId && t.date.getTime() >= target.date.getTime()));
          }
          return prev.filter(t => t.id !== target.id);
        }
        return prev.filter(t => t.id !== target.id);
      });

      void getFinanceRepository()
        .deleteTransactionTarget(target, scope)
        .then(result => {
          setTransactions(result.transactions);
          setRecurringRules(result.recurringRules);
        })
        .catch(() => {});
    },
    [],
  );

  const cancelRecurringRule = useCallback(
    (ruleId: string, effectiveDate: Date = today) => {
      setRecurringRules(prev =>
        prev.map(r => (r.id === ruleId ? { ...r, status: 'canceled', canceledAt: effectiveDate } : r)),
      );
      setTransactions(prev =>
        prev.filter(t => !(t.recurring?.ruleId === ruleId && t.date.getTime() >= effectiveDate.getTime())),
      );

      void getFinanceRepository()
        .cancelRecurringRule(ruleId, effectiveDate)
        .then(result => {
          setTransactions(result.transactions);
          setRecurringRules(result.recurringRules);
        })
        .catch(() => {});
    },
    [today],
  );

  const deleteRecurringRule = useCallback((ruleId: string) => {
    setRecurringRules(prev => prev.filter(r => r.id !== ruleId));
    setTransactions(prev => prev.filter(t => t.recurring?.ruleId !== ruleId));

    void getFinanceRepository()
      .deleteRecurringRule(ruleId)
      .then(result => {
        setTransactions(result.transactions);
        setRecurringRules(result.recurringRules);
      })
      .catch(() => {});
  }, []);

  const cancelRecurringRulesForAccount = useCallback(
    (accountId: string, effectiveDate: Date = today) => {
      const activeRules = recurringRules.filter(r => r.accountId === accountId && r.status === 'active');
      if (activeRules.length === 0) return;

      const activeRuleIds = new Set(activeRules.map(r => r.id));

      setRecurringRules(prev =>
        prev.map(r => (activeRuleIds.has(r.id) ? { ...r, status: 'canceled', canceledAt: effectiveDate } : r)),
      );

      setTransactions(prev =>
        prev.filter(
          t => !(t.recurring && activeRuleIds.has(t.recurring.ruleId) && t.date.getTime() >= effectiveDate.getTime()),
        ),
      );
    },
    [recurringRules, today],
  );

  const deleteRecurringRulesForAccount = useCallback((accountId: string) => {
    setRecurringRules(prev => prev.filter(r => r.accountId !== accountId));
    setTransactions(prev => prev.filter(t => t.accountId !== accountId));
  }, []);

  const reassignType = useCallback((fromTypeId: string, toTypeId: string) => {
    setTransactions(prev => prev.map(t => (t.typeId === fromTypeId ? { ...t, typeId: toTypeId } : t)));
    setRecurringRules(prev => prev.map(r => (r.typeId === fromTypeId ? { ...r, typeId: toTypeId } : r)));
  }, []);

  const reassignPaymentMethod = useCallback((fromMethodId: string, toMethodId: string) => {
    setTransactions(prev =>
      prev.map(t => (t.paymentMethodId === fromMethodId ? { ...t, paymentMethodId: toMethodId } : t)),
    );
    setRecurringRules(prev =>
      prev.map(r => (r.paymentMethodId === fromMethodId ? { ...r, paymentMethodId: toMethodId } : r)),
    );
  }, []);

  const value = useMemo(
    () => ({
      transactions,
      recurringRules,
      statements,
      movements,
      ledgers,
      today,
      loadedFromDate,
      ensureTransactionsLoaded,
      setTransactions,
      saveTransactionDraft,
      deleteTransactionTarget,
      cancelRecurringRule,
      cancelRecurringRulesForAccount,
      deleteRecurringRule,
      deleteRecurringRulesForAccount,
      reassignType,
      reassignPaymentMethod,
    }),
    [
      transactions,
      recurringRules,
      statements,
      movements,
      ledgers,
      today,
      loadedFromDate,
      ensureTransactionsLoaded,
      saveTransactionDraft,
      deleteTransactionTarget,
      cancelRecurringRule,
      cancelRecurringRulesForAccount,
      deleteRecurringRule,
      deleteRecurringRulesForAccount,
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

export { findTransferLegs, findInstallmentSeries, findRecurringSeries };
