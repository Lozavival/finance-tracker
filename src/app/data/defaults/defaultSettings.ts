import type { AccountConfig, Settings } from '../settings';
import { INITIAL_EXCHANGE_RATE_STATE } from '../currency';
import { DEFAULT_TRANSACTION_TYPES, DEFAULT_PAYMENT_METHODS } from './defaultTypes';
import { DEFAULT_GOALS_CONFIG } from './defaultGoals';

const DEFAULT_PRODUCTION_ACCOUNTS: AccountConfig[] = [];

export const PRODUCTION_DEFAULT_SETTINGS: Settings = {
  transactionTypes: DEFAULT_TRANSACTION_TYPES,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  accounts: DEFAULT_PRODUCTION_ACCOUNTS,
  goals: DEFAULT_GOALS_CONFIG,
  exchangeRate: INITIAL_EXCHANGE_RATE_STATE,
};
