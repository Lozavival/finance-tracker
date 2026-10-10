import { type AccountKind, type CreditCardConfig, type AccountConfig, DEFAULT_SETTINGS } from './settings';

export type { AccountKind, CreditCardConfig };
export type AccountDetails = AccountConfig;

export const ACCOUNT_DETAILS: Record<string, AccountConfig> = Object.fromEntries(
  DEFAULT_SETTINGS.accounts.map(acc => [acc.id, acc]),
);
