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
import { DEV_DEFAULT_SETTINGS } from '@/data/fixtures';
import { getFinanceRepository } from '@/data/repository';
import { settingsReducer, type SettingsAction } from './settingsReducer';

export type SettingsContextValue = {
  settings: Settings;
  dispatch: React.Dispatch<SettingsAction>;
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
  initialSettings = DEV_DEFAULT_SETTINGS,
}: {
  children: React.ReactNode;
  initialSettings?: Settings;
}) {
  const [settings, rawDispatch] = useReducer(settingsReducer, initialSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const dispatch = useCallback<React.Dispatch<SettingsAction>>(action => {
    const prevState = settingsRef.current;
    const nextState = settingsReducer(prevState, action);
    settingsRef.current = nextState;
    rawDispatch(action);

    const repo = getFinanceRepository();
    switch (action.type) {
      case 'settings/hydrate':
        break;
      case 'type/add':
        void repo.createTransactionType(action.payload).catch(() => {});
        break;
      case 'type/update':
        void repo.updateTransactionType(action.payload.id, action.payload.changes).catch(() => {});
        break;
      case 'type/remove':
        void repo.reassignAndDeleteTransactionType(action.payload.id, action.payload.replacementId).catch(() => {});
        break;
      case 'type/reorder':
        void repo
          .reorderTransactionTypes(
            'expense',
            action.payload.types.map(t => t.id),
          )
          .catch(() => {});
        break;
      case 'method/add':
        void repo.createPaymentMethod(action.payload).catch(() => {});
        break;
      case 'method/update':
        void repo.updatePaymentMethod(action.payload.id, action.payload.changes).catch(() => {});
        break;
      case 'method/remove':
        void repo.reassignAndDeletePaymentMethod(action.payload.id, action.payload.replacementId).catch(() => {});
        break;
      case 'method/reorder':
        void repo.reorderPaymentMethods(action.payload.methods.map(m => m.id)).catch(() => {});
        break;
      case 'account/add':
        void repo.createAccount(action.payload).catch(() => {});
        break;
      case 'account/update':
        void repo.updateAccount(action.payload.id, action.payload.changes).catch(() => {});
        break;
      case 'account/remove':
        void repo.deleteAccount(action.payload.id).catch(() => {});
        break;
      case 'account/archive':
        void repo.archiveAccount(action.payload.id, true).catch(() => {});
        break;
      case 'account/unarchive':
        void repo.restoreAccount(action.payload.id).catch(() => {});
        break;
      case 'goals/updateReferenceIncome':
        void repo.updateReferenceIncome(action.payload.income).catch(() => {});
        break;
      case 'goals/updateMode':
        void repo.updateGoalsMode(action.payload.mode).catch(() => {});
        break;
      case 'goals/updateAllocations':
      case 'goals/addCategory':
      case 'goals/updateCategory':
      case 'goals/deleteCategory':
      case 'goals/resetAllocations':
      case 'goals/updateTypeMappings':
        void repo.saveGoalCategories(nextState.goals.categories, nextState.goals.typeMappings).catch(() => {});
        break;
      case 'settings/updateExchangeRate':
        void repo.updatePreferences({ exchangeRate: action.payload }).catch(() => {});
        break;
    }
  }, []);

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
