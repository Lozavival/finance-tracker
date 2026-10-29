import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  type Transaction,
  type TransactionDraft,
  type EditingTarget,
  findTransferLegs,
  buildTransferLegs,
  createTransactionId,
} from '@/data/transactions';
import { getToday } from '@/data/dates';
import { type CardStatement, buildStatements } from '@/data/cardStatements';
import { type CashMovement, type AccountLedger, buildCashMovements, buildLedgers } from '@/data/ledger';
import { buildInstallments, findInstallmentSeries } from '@/data/installments';
import { type RecurringRule, buildRecurringTransactions, findRecurringSeries } from '@/data/recurring';
import { getFinanceRepository } from '@/data/repository';
import { useSettings } from './SettingsContext';
import { useNotifications } from './NotificationsContext';
import { useI18n } from '@/i18n';
import { fetchLiveExchangeRate, getExchangeRateErrorDetails } from '@/data/currency';
import { logger } from '@/lib/logger';

const financeLogger = logger.child('FinanceContext');

export type DeleteTransactionResult = {
  undo: () => void;
  removedCount: number;
};

export type UndoableRuleActionResult = {
  undo: () => void;
};

export type FinanceContextValue = {
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  statements: CardStatement[];
  movements: CashMovement[];
  ledgers: Record<string, AccountLedger>;
  today: Date;
  loadedFromDate: Date | null;
  syncStatus: 'online' | 'offline';
  loadStatus: 'loading' | 'ready' | 'error';
  reloadWorkspace: () => Promise<void>;
  ensureTransactionsLoaded: (fromDate?: Date | null) => Promise<void>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  saveTransactionDraft: (draft: TransactionDraft, editingTarget?: EditingTarget | null) => Promise<boolean>;
  deleteTransactionTarget: (
    target: Transaction,
    scope?: 'only-this' | 'this-and-future' | 'all',
  ) => DeleteTransactionResult;
  cancelRecurringRule: (ruleId: string, effectiveDate?: Date) => UndoableRuleActionResult;
  cancelRecurringRulesForAccount: (accountId: string, effectiveDate?: Date) => void;
  deleteRecurringRule: (ruleId: string) => UndoableRuleActionResult;
  deleteRecurringRulesForAccount: (accountId: string) => void;
  reassignType: (fromTypeId: string, toTypeId: string) => void;
  reassignPaymentMethod: (fromMethodId: string, toMethodId: string) => void;
  resetWorkspace: (seedMode?: 'production' | 'development') => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

const UNDO_WINDOW_MS = 6000;

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { settings, dispatch, isCreditCard, findAccount } = useSettings();
  const { reportSyncError, registerResync, notify } = useNotifications();
  const reportSyncErrorRef = useRef(reportSyncError);
  reportSyncErrorRef.current = reportSyncError;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [historicalRollups, setHistoricalRollups] = useState<Record<string, number>>({});
  const [loadedFromDate, setLoadedFromDate] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline'>('online');
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const loadedFromDateRef = useRef<Date | null>(null);
  loadedFromDateRef.current = loadedFromDate;

  const today = useMemo(() => getToday(), []);

  // Track pending deferred deletions across transactions and rules
  const pendingDeletesRef = useRef<
    Map<
      string,
      {
        timer: NodeJS.Timeout;
        commit: () => void;
        removedTxIds: Set<string>;
      }
    >
  >(new Map());

  // Filter server results so they don't resurrect entities pending deletion
  const filterPendingTxIds = useCallback((serverTxs: Transaction[]) => {
    const pendingIds = new Set<string>();
    for (const entry of pendingDeletesRef.current.values()) {
      for (const id of entry.removedTxIds) {
        pendingIds.add(id);
      }
    }
    if (pendingIds.size === 0) return serverTxs;
    return serverTxs.filter(t => !pendingIds.has(t.id));
  }, []);

  // Flush all pending commits on pagehide so nothing is lost
  useEffect(() => {
    function handlePageHide() {
      for (const entry of pendingDeletesRef.current.values()) {
        clearTimeout(entry.timer);
        entry.commit();
      }
      pendingDeletesRef.current.clear();
    }
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      handlePageHide();
    };
  }, []);

  const refreshLiveRate = useCallback(
    (currentRateState?: { source: string; rate: number | null }) => {
      if (currentRateState?.source !== 'manual' || currentRateState?.rate === null) {
        void fetchLiveExchangeRate()
          .then(result => {
            void dispatch({
              type: 'settings/updateExchangeRate',
              payload: {
                rate: result.rate,
                lastUpdated: result.timestamp,
                source: 'api',
                error: null,
                isLoading: false,
              },
            });
          })
          .catch(err => {
            const { key, params } = getExchangeRateErrorDetails(err);
            const errorMsg = t(key, params);

            void dispatch({
              type: 'settings/updateExchangeRate',
              payload: {
                error: errorMsg,
                isLoading: false,
              },
            });

            notify.error(key, {
              id: 'rate-fetch-status',
              params,
            });
          });
      }
    },
    [dispatch, notify, t],
  );

  const reloadWorkspace = useCallback(async () => {
    financeLogger.debug('Reloading workspace snapshot...');
    try {
      const repo = getFinanceRepository();
      const snapshot = await repo.loadWorkspace(90);
      void dispatch({ type: 'settings/hydrate', payload: snapshot.settings });
      setTransactions(filterPendingTxIds(snapshot.transactions));
      setRecurringRules(snapshot.recurringRules);
      setHistoricalRollups(snapshot.historicalRollups);
      setLoadedFromDate(snapshot.loadedFromDate);
      setSyncStatus('online');
      setLoadStatus('ready');
      financeLogger.info('Workspace reloaded successfully', {
        transactions: snapshot.transactions.length,
        recurringRules: snapshot.recurringRules.length,
        accounts: snapshot.settings.accounts.length,
      });
    } catch (err) {
      financeLogger.error('Failed to reload workspace, switching to offline mode:', err);
      setSyncStatus('offline');
      setLoadStatus('error');
      throw err;
    }
  }, [dispatch, filterPendingTxIds]);

  const resetWorkspace = useCallback(
    async (seedMode: 'production' | 'development' = 'development') => {
      financeLogger.warn('Resetting workspace to defaults...', { seedMode });
      try {
        const repo = getFinanceRepository();
        const snapshot = await repo.resetSettings(seedMode);
        void dispatch({ type: 'settings/hydrate', payload: snapshot.settings });
        setTransactions(snapshot.transactions);
        setRecurringRules(snapshot.recurringRules);
        setHistoricalRollups(snapshot.historicalRollups);
        setLoadedFromDate(snapshot.loadedFromDate);
        setSyncStatus('online');
        setLoadStatus('ready');
        financeLogger.info('Workspace reset and rehydrated successfully', {
          transactions: snapshot.transactions.length,
          recurringRules: snapshot.recurringRules.length,
          accounts: snapshot.settings.accounts.length,
        });
      } catch (err) {
        financeLogger.error('Failed to reset workspace:', err);
        reportSyncErrorRef.current(err);
        throw err;
      }
    },
    [dispatch],
  );

  // Register reloadWorkspace as resync handler
  useEffect(() => {
    return registerResync(reloadWorkspace);
  }, [registerResync, reloadWorkspace]);

  // Initial load and online listener
  useEffect(() => {
    let cancelled = false;
    reloadWorkspace()
      .then(() => {
        if (!cancelled) {
          // Auto-fetch exchange rate only on initial successful workspace load
          const repo = getFinanceRepository();
          void repo
            .loadWorkspace(90)
            .then(snap => {
              if (!cancelled) refreshLiveRate(snap.settings.exchangeRate);
            })
            .catch(err => {
              financeLogger.debug('Auto-fetch exchange rate skipped or failed on startup:', err);
            });
        }
      })
      .catch(err => {
        if (cancelled) return;
        financeLogger.warn('Initial workspace load failed, application in offline mode:', err);
        notify.error('notifications.system.offlineDesc', { id: 'initial-offline' });
      });

    const handleOnline = () => {
      financeLogger.info('Browser returned online, attempting workspace reload...');
      void reloadWorkspace().catch(err => {
        financeLogger.warn('Failed to reload workspace upon reconnecting online:', err);
      });
    };
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
    };
  }, [reloadWorkspace, refreshLiveRate, notify]);

  const ensureTransactionsLoaded = useCallback(
    async (fromDate?: Date | null) => {
      const currentCutoff = loadedFromDateRef.current;
      if (!currentCutoff) return;

      if (!fromDate || fromDate.getTime() < currentCutoff.getTime()) {
        financeLogger.debug('Loading historical transactions beyond cutoff date...');
        try {
          const allTransactions = await getFinanceRepository().fetchTransactions({});
          financeLogger.info(`Loaded ${allTransactions.length} historical transactions beyond cutoff`);
          loadedFromDateRef.current = null;
          setLoadedFromDate(null);
          setHistoricalRollups({});
          setTransactions(filterPendingTxIds(allTransactions));
        } catch (err) {
          financeLogger.error('Failed to load historical transactions:', err);
          reportSyncErrorRef.current(err);
        }
      }
    },
    [filterPendingTxIds],
  );

  const statements = useMemo(() => buildStatements(transactions, settings, today), [transactions, settings, today]);

  const movements = useMemo(
    () => buildCashMovements(transactions, statements, settings, historicalRollups, loadedFromDate ?? undefined),
    [transactions, statements, settings, historicalRollups, loadedFromDate],
  );

  const ledgers = useMemo(() => buildLedgers(movements, settings), [movements, settings]);

  const saveTransactionDraft = useCallback(
    async (draft: TransactionDraft, editingTarget?: EditingTarget | null): Promise<boolean> => {
      financeLogger.info('Saving transaction draft:', {
        kind: draft.kind,
        isEditing: Boolean(editingTarget),
        amountCents:
          draft.kind === 'transfer'
            ? draft.value
            : draft.kind === 'installments'
              ? draft.totalValue
              : draft.kind === 'recurring'
                ? draft.value
                : draft.transaction.value,
        currency: draft.kind === 'transfer' ? draft.fromCurrency : draft.transaction.currency,
      });

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

      try {
        const result = await getFinanceRepository().saveTransactionDraft(draft, editingTarget);
        setTransactions(filterPendingTxIds(result.transactions));
        setRecurringRules(result.recurringRules);
        financeLogger.info('Transaction draft persisted successfully');
        return true;
      } catch (err) {
        financeLogger.error('Failed to persist transaction draft:', err);
        reportSyncErrorRef.current(err);
        return false;
      }
    },
    [findAccount, isCreditCard, filterPendingTxIds],
  );

  const deleteTransactionTarget = useCallback(
    (target: Transaction, scope: 'only-this' | 'this-and-future' | 'all' = 'only-this'): DeleteTransactionResult => {
      let removedTransactions: Transaction[] = [];
      let previousRules: RecurringRule[] = [];

      setTransactions(prev => {
        if (target.transferId) {
          removedTransactions = prev.filter(t => t.transferId === target.transferId);
          return prev.filter(t => t.transferId !== target.transferId);
        }
        if (target.installment) {
          removedTransactions = prev.filter(t => t.installment?.groupId === target.installment!.groupId);
          return prev.filter(t => t.installment?.groupId !== target.installment!.groupId);
        }
        if (target.recurring) {
          const ruleId = target.recurring.ruleId;
          if (scope === 'all') {
            setRecurringRules(rRules => {
              previousRules = rRules;
              return rRules.filter(r => r.id !== ruleId);
            });
            removedTransactions = prev.filter(t => t.recurring?.ruleId === ruleId);
            return prev.filter(t => t.recurring?.ruleId !== ruleId);
          }
          if (scope === 'this-and-future') {
            setRecurringRules(rRules => {
              previousRules = rRules;
              return rRules.map(r => (r.id === ruleId ? { ...r, status: 'canceled', canceledAt: target.date } : r));
            });
            removedTransactions = prev.filter(
              t => t.recurring?.ruleId === ruleId && t.date.getTime() >= target.date.getTime(),
            );
            return prev.filter(t => !(t.recurring?.ruleId === ruleId && t.date.getTime() >= target.date.getTime()));
          }
          removedTransactions = prev.filter(t => t.id === target.id);
          return prev.filter(t => t.id !== target.id);
        }
        removedTransactions = prev.filter(t => t.id === target.id);
        return prev.filter(t => t.id !== target.id);
      });

      const removedIds = new Set(removedTransactions.map(t => t.id));
      const operationKey = `tx-delete-${target.id}-${Date.now()}`;
      financeLogger.info('deleteTransactionTarget scheduled:', {
        targetId: target.id,
        scope,
        removedCount: removedTransactions.length,
      });

      const commit = () => {
        pendingDeletesRef.current.delete(operationKey);
        financeLogger.debug('Committing deferred transaction deletion:', { targetId: target.id, scope });
        void getFinanceRepository()
          .deleteTransactionTarget(target, scope)
          .then(result => {
            setTransactions(filterPendingTxIds(result.transactions));
            setRecurringRules(result.recurringRules);
            financeLogger.info('Deferred transaction deletion persisted successfully:', target.id);
          })
          .catch(err => {
            financeLogger.error('Deferred transaction deletion persistence failed:', err);
            reportSyncErrorRef.current(err);
          });
      };

      const timer = setTimeout(commit, UNDO_WINDOW_MS);

      pendingDeletesRef.current.set(operationKey, {
        timer,
        commit,
        removedTxIds: removedIds,
      });

      const undo = () => {
        financeLogger.info('Undoing transaction deletion:', { targetId: target.id });
        const pending = pendingDeletesRef.current.get(operationKey);
        if (pending) {
          clearTimeout(pending.timer);
          pendingDeletesRef.current.delete(operationKey);
        }
        // Restore removed transactions
        setTransactions(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const toAdd = removedTransactions.filter(t => !existingIds.has(t.id));
          return [...prev, ...toAdd];
        });
        // Restore rules if recurring
        if (previousRules.length > 0) {
          setRecurringRules(previousRules);
        }
      };

      return {
        undo,
        removedCount: Math.max(1, removedTransactions.length),
      };
    },
    [filterPendingTxIds],
  );

  const cancelRecurringRule = useCallback(
    (ruleId: string, effectiveDate: Date = today): UndoableRuleActionResult => {
      let previousRules: RecurringRule[] = [];
      let removedTransactions: Transaction[] = [];

      setRecurringRules(prev => {
        previousRules = prev;
        return prev.map(r => (r.id === ruleId ? { ...r, status: 'canceled', canceledAt: effectiveDate } : r));
      });

      setTransactions(prev => {
        removedTransactions = prev.filter(
          t => t.recurring?.ruleId === ruleId && t.date.getTime() >= effectiveDate.getTime(),
        );
        return prev.filter(t => !(t.recurring?.ruleId === ruleId && t.date.getTime() >= effectiveDate.getTime()));
      });

      const removedIds = new Set(removedTransactions.map(t => t.id));
      const operationKey = `rule-cancel-${ruleId}-${Date.now()}`;
      financeLogger.info('cancelRecurringRule scheduled:', { ruleId, effectiveDate });

      const commit = () => {
        pendingDeletesRef.current.delete(operationKey);
        financeLogger.debug('Committing deferred cancelRecurringRule:', ruleId);
        void getFinanceRepository()
          .cancelRecurringRule(ruleId, effectiveDate)
          .then(result => {
            setTransactions(filterPendingTxIds(result.transactions));
            setRecurringRules(result.recurringRules);
            financeLogger.info('Deferred cancelRecurringRule persisted successfully:', ruleId);
          })
          .catch(err => {
            financeLogger.error('Deferred cancelRecurringRule persistence failed:', err);
            reportSyncErrorRef.current(err);
          });
      };

      const timer = setTimeout(commit, UNDO_WINDOW_MS);

      pendingDeletesRef.current.set(operationKey, {
        timer,
        commit,
        removedTxIds: removedIds,
      });

      const undo = () => {
        financeLogger.info('Undoing cancelRecurringRule:', ruleId);
        const pending = pendingDeletesRef.current.get(operationKey);
        if (pending) {
          clearTimeout(pending.timer);
          pendingDeletesRef.current.delete(operationKey);
        }
        setRecurringRules(previousRules);
        setTransactions(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const toAdd = removedTransactions.filter(t => !existingIds.has(t.id));
          return [...prev, ...toAdd];
        });
      };

      return { undo };
    },
    [today, filterPendingTxIds],
  );

  const deleteRecurringRule = useCallback(
    (ruleId: string): UndoableRuleActionResult => {
      let previousRules: RecurringRule[] = [];
      let removedTransactions: Transaction[] = [];

      setRecurringRules(prev => {
        previousRules = prev;
        return prev.filter(r => r.id !== ruleId);
      });

      setTransactions(prev => {
        removedTransactions = prev.filter(t => t.recurring?.ruleId === ruleId);
        return prev.filter(t => t.recurring?.ruleId !== ruleId);
      });

      const removedIds = new Set(removedTransactions.map(t => t.id));
      const operationKey = `rule-delete-${ruleId}-${Date.now()}`;
      financeLogger.info('deleteRecurringRule scheduled:', ruleId);

      const commit = () => {
        pendingDeletesRef.current.delete(operationKey);
        financeLogger.debug('Committing deferred deleteRecurringRule:', ruleId);
        void getFinanceRepository()
          .deleteRecurringRule(ruleId)
          .then(result => {
            setTransactions(filterPendingTxIds(result.transactions));
            setRecurringRules(result.recurringRules);
            financeLogger.info('Deferred deleteRecurringRule persisted successfully:', ruleId);
          })
          .catch(err => {
            financeLogger.error('Deferred deleteRecurringRule persistence failed:', err);
            reportSyncErrorRef.current(err);
          });
      };

      const timer = setTimeout(commit, UNDO_WINDOW_MS);

      pendingDeletesRef.current.set(operationKey, {
        timer,
        commit,
        removedTxIds: removedIds,
      });

      const undo = () => {
        financeLogger.info('Undoing deleteRecurringRule:', ruleId);
        const pending = pendingDeletesRef.current.get(operationKey);
        if (pending) {
          clearTimeout(pending.timer);
          pendingDeletesRef.current.delete(operationKey);
        }
        setRecurringRules(previousRules);
        setTransactions(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const toAdd = removedTransactions.filter(t => !existingIds.has(t.id));
          return [...prev, ...toAdd];
        });
      };

      return { undo };
    },
    [filterPendingTxIds],
  );

  const cancelRecurringRulesForAccount = useCallback(
    (accountId: string, effectiveDate: Date = today) => {
      const activeRules = recurringRules.filter(r => r.accountId === accountId && r.status === 'active');
      if (activeRules.length === 0) return;

      const activeRuleIds = new Set(activeRules.map(r => r.id));
      financeLogger.info('cancelRecurringRulesForAccount:', {
        accountId,
        effectiveDate: effectiveDate.toISOString(),
        affectedRulesCount: activeRules.length,
      });

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
    financeLogger.info('deleteRecurringRulesForAccount:', { accountId });
    setRecurringRules(prev => prev.filter(r => r.accountId !== accountId));
    setTransactions(prev => prev.filter(t => t.accountId !== accountId));
  }, []);

  const reassignType = useCallback((fromTypeId: string, toTypeId: string) => {
    financeLogger.info('reassignType:', { fromTypeId, toTypeId });
    setTransactions(prev => prev.map(t => (t.typeId === fromTypeId ? { ...t, typeId: toTypeId } : t)));
    setRecurringRules(prev => prev.map(r => (r.typeId === fromTypeId ? { ...r, typeId: toTypeId } : r)));
  }, []);

  const reassignPaymentMethod = useCallback((fromMethodId: string, toMethodId: string) => {
    financeLogger.info('reassignPaymentMethod:', { fromMethodId, toMethodId });
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
      syncStatus,
      loadStatus,
      reloadWorkspace,
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
      resetWorkspace,
    }),
    [
      transactions,
      recurringRules,
      statements,
      movements,
      ledgers,
      today,
      loadedFromDate,
      syncStatus,
      loadStatus,
      reloadWorkspace,
      ensureTransactionsLoaded,
      saveTransactionDraft,
      deleteTransactionTarget,
      cancelRecurringRule,
      cancelRecurringRulesForAccount,
      deleteRecurringRule,
      deleteRecurringRulesForAccount,
      reassignType,
      reassignPaymentMethod,
      resetWorkspace,
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
