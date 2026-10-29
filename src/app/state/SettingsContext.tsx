import React, { createContext, useContext, useReducer, useMemo, useRef, useCallback } from 'react';
import {
  type Settings,
  type TransactionTypeConfig,
  type PaymentMethodConfig,
  type AccountConfig,
  type Direction,
  findAccount as lookupAccount,
  findType as lookupType,
  findMethod as lookupMethod,
  isCreditCard as checkIsCreditCard,
  getAllowedPaymentMethodIds as lookupAllowedPaymentMethods,
} from '@/data/settings';
import { PRODUCTION_DEFAULT_SETTINGS } from '@/data/defaults/defaultSettings';
import { getFinanceRepository } from '@/data/repository';
import { settingsReducer, type SettingsAction } from './settingsReducer';
import { useNotifications } from './NotificationsContext';
import { logger } from '@/lib/logger';

const settingsLogger = logger.child('SettingsContext');

export type SettingsDispatch = (action: SettingsAction) => Promise<boolean>;

export type SettingsContextValue = {
  settings: Settings;
  dispatch: SettingsDispatch;
  incomeTypes: TransactionTypeConfig[];
  expenseTypes: TransactionTypeConfig[];
  typesByDirection: Record<Direction, TransactionTypeConfig[]>;
  accountMap: Map<string, AccountConfig>;
  typeMap: Map<string, TransactionTypeConfig>;
  methodMap: Map<string, PaymentMethodConfig>;
  findAccount: (id: string) => AccountConfig | undefined;
  findType: (id: string) => TransactionTypeConfig | undefined;
  findMethod: (id?: string) => PaymentMethodConfig | undefined;
  isCreditCard: (methodId?: string) => boolean;
  getAllowedPaymentMethodIds: (account?: AccountConfig) => string[];
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  children,
  initialSettings = PRODUCTION_DEFAULT_SETTINGS,
}: {
  children: React.ReactNode;
  initialSettings?: Settings;
}) {
  const { reportSyncError } = useNotifications();
  const reportSyncErrorRef = useRef(reportSyncError);
  reportSyncErrorRef.current = reportSyncError;
  const onPersistError = useCallback((err: unknown) => reportSyncErrorRef.current(err), []);

  const [settings, rawDispatch] = useReducer(settingsReducer, initialSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const dispatch = useCallback<SettingsDispatch>(
    action => {
      settingsLogger.debug('Dispatching settings action:', {
        type: action.type,
        payload: 'payload' in action ? action.payload : undefined,
      });
      const prevState = settingsRef.current;
      const nextState = settingsReducer(prevState, action);
      settingsRef.current = nextState;
      rawDispatch(action);

      const repo = getFinanceRepository();

      const persist = (p: Promise<unknown>): Promise<boolean> =>
        p.then(
          () => {
            settingsLogger.info('Successfully persisted settings action:', action.type);
            return true;
          },
          err => {
            settingsLogger.error('Failed to persist settings action:', { action: action.type, error: err });
            onPersistError(err);
            return false;
          },
        );

      switch (action.type) {
        case 'settings/hydrate':
          return Promise.resolve(true);
        case 'type/add':
          return persist(repo.createTransactionType(action.payload));
        case 'type/update':
          return persist(repo.updateTransactionType(action.payload.id, action.payload.changes));
        case 'type/remove':
          return persist(repo.reassignAndDeleteTransactionType(action.payload.id, action.payload.replacementId));
        case 'type/reorder':
          return persist(
            repo.reorderTransactionTypes(
              'expense',
              action.payload.types.map(t => t.id),
            ),
          );
        case 'method/add':
          return persist(repo.createPaymentMethod(action.payload));
        case 'method/update':
          return persist(repo.updatePaymentMethod(action.payload.id, action.payload.changes));
        case 'method/remove':
          return persist(repo.reassignAndDeletePaymentMethod(action.payload.id, action.payload.replacementId));
        case 'method/reorder':
          return persist(repo.reorderPaymentMethods(action.payload.methods.map(m => m.id)));
        case 'account/add':
          return persist(repo.createAccount(action.payload));
        case 'account/update':
          return persist(repo.updateAccount(action.payload.id, action.payload.changes));
        case 'account/remove':
          return persist(repo.deleteAccount(action.payload.id));
        case 'account/archive':
          return persist(repo.archiveAccount(action.payload.id, true));
        case 'account/unarchive':
          return persist(repo.restoreAccount(action.payload.id));
        case 'goals/updateReferenceIncome':
          return persist(repo.updateReferenceIncome(action.payload.income));
        case 'goals/updateMode':
          return persist(repo.updateGoalsMode(action.payload.mode));
        case 'goals/updateAllocations':
        case 'goals/addCategory':
        case 'goals/updateCategory':
        case 'goals/deleteCategory':
        case 'goals/resetAllocations':
        case 'goals/updateTypeMappings':
        case 'goals/restore':
          return persist(repo.saveGoalCategories(nextState.goals.categories, nextState.goals.typeMappings));
        case 'settings/updateExchangeRate': {
          const payload = action.payload;
          // Only persist meaningful rate fields, ignore transient UI error/isLoading states
          if ('rate' in payload || 'lastUpdated' in payload || 'source' in payload) {
            return persist(repo.updatePreferences({ exchangeRate: payload }));
          }
          return Promise.resolve(true);
        }
      }
    },
    [onPersistError],
  );

  const value = useMemo<SettingsContextValue>(() => {
    const incomeTypes = settings.transactionTypes.filter(t => t.direction === 'income');
    const expenseTypes = settings.transactionTypes.filter(t => t.direction === 'expense');
    const typesByDirection: Record<Direction, TransactionTypeConfig[]> = {
      income: incomeTypes,
      expense: expenseTypes,
    };

    const accountMap = new Map<string, AccountConfig>(settings.accounts.map(a => [a.id, a]));
    const typeMap = new Map<string, TransactionTypeConfig>(settings.transactionTypes.map(t => [t.id, t]));
    const methodMap = new Map<string, PaymentMethodConfig>(settings.paymentMethods.map(m => [m.id, m]));

    return {
      settings,
      dispatch,
      incomeTypes,
      expenseTypes,
      typesByDirection,
      accountMap,
      typeMap,
      methodMap,
      findAccount: (id: string) => lookupAccount(settings, id),
      findType: (id: string) => lookupType(settings, id),
      findMethod: (id?: string) => lookupMethod(settings, id),
      isCreditCard: (methodId?: string) => checkIsCreditCard(settings, methodId),
      getAllowedPaymentMethodIds: (account?: AccountConfig) => lookupAllowedPaymentMethods(account, settings),
    };
  }, [settings, dispatch]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
