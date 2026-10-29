import { PRODUCTION_DEFAULT_SETTINGS } from '@/data/defaults';
import type { Settings } from '@/data/settings';
import type { WorkspaceSnapshot } from '@/data/repository/types';
import { TEST_ACCOUNTS } from './test-accounts';
import { TEST_TRANSACTIONS } from './test-transactions';

export function createTestSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...PRODUCTION_DEFAULT_SETTINGS,
    accounts: [...TEST_ACCOUNTS],
    ...overrides,
  };
}

export function createTestSnapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    settings: createTestSettings(),
    transactions: [...TEST_TRANSACTIONS],
    recurringRules: [],
    historicalRollups: {},
    loadedFromDate: null,
    ...overrides,
  };
}

