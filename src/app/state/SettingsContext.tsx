import React, { createContext, useContext, useReducer, useMemo } from 'react';
import {
  type Settings,
  type TransactionTypeConfig,
  type PaymentMethodConfig,
  type AccountConfig,
  type Direction,
  DEFAULT_SETTINGS,
  findAccount as lookupAccount,
  findType as lookupType,
  findMethod as lookupMethod,
  isCreditCard as checkIsCreditCard,
  getAllowedPaymentMethodIds as lookupAllowedPaymentMethods,
} from '@/data/settings';
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
  initialSettings = DEFAULT_SETTINGS,
}: {
  children: React.ReactNode;
  initialSettings?: Settings;
}) {
  const [settings, dispatch] = useReducer(settingsReducer, initialSettings);

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
  }, [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
