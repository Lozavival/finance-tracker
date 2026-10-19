import type { Settings } from '../settings';
import { PRODUCTION_DEFAULT_SETTINGS } from '../defaults/defaultSettings';
import { DEMO_GOALS_CONFIG } from '../defaults/defaultGoals';
import { DEV_MOCK_ACCOUNTS } from './mockAccounts';

export const DEV_DEFAULT_SETTINGS: Settings = {
  ...PRODUCTION_DEFAULT_SETTINGS,
  accounts: DEV_MOCK_ACCOUNTS,
  goals: DEMO_GOALS_CONFIG,
};
