import { describe, it, expect } from 'vitest';
import { settingsReducer } from '@/state/settingsReducer';
import { createTestSettings } from '../../fixtures/test-workspace';
import { parseLocalDate } from '@/data/dates';
import type { AccountConfig, TransactionTypeConfig, PaymentMethodConfig } from '@/data/settings';
import type { GoalCategory } from '@/data/goals';

describe('Settings Reducer Engine', () => {
  const initialSettings = createTestSettings();

  describe('system entity protection', () => {
    it('prevents removing system type "transfer"', () => {
      const state = settingsReducer(initialSettings, {
        type: 'type/remove',
        payload: { id: 'transfer' },
      });
      expect(state.transactionTypes.some(t => t.id === 'transfer')).toBe(true);
    });

    it('prevents removing system payment method "cash" or credit-card behavior', () => {
      const stateCash = settingsReducer(initialSettings, {
        type: 'method/remove',
        payload: { id: 'cash' },
      });
      expect(stateCash.paymentMethods.some(m => m.id === 'cash')).toBe(true);

      const stateCc = settingsReducer(initialSettings, {
        type: 'method/remove',
        payload: { id: 'credit-card' },
      });
      expect(stateCc.paymentMethods.some(m => m.id === 'credit-card')).toBe(true);
    });

    it('prevents mutating system property or direction on system types', () => {
      const state = settingsReducer(initialSettings, {
        type: 'type/update',
        payload: {
          id: 'transfer',
          // @ts-expect-error testing protection against mutating direction
          changes: { direction: 'income', name: 'Renamed Transfer' },
        },
      });
      const transfer = state.transactionTypes.find(t => t.id === 'transfer')!;
      expect(transfer.direction).toBe('expense'); // Protected
      expect(transfer.name).toBe('Renamed Transfer');
    });
  });

  describe('transaction types and payment methods management', () => {
    it('adds and updates user-defined transaction types', () => {
      const newType: TransactionTypeConfig = {
        id: 'crypto',
        name: 'Cryptocurrency',
        direction: 'income',
        color: 'amber',
        icon: 'Coins',
      };

      const withNewType = settingsReducer(initialSettings, {
        type: 'type/add',
        payload: newType,
      });
      expect(withNewType.transactionTypes).toContainEqual(newType);

      const updated = settingsReducer(withNewType, {
        type: 'type/update',
        payload: { id: 'crypto', changes: { name: 'Crypto & Web3', color: 'orange' } },
      });
      const target = updated.transactionTypes.find(t => t.id === 'crypto');
      expect(target?.name).toBe('Crypto & Web3');
      expect(target?.color).toBe('orange');
    });

    it('adds, updates, and removes custom payment methods', () => {
      const customMethod: PaymentMethodConfig = {
        id: 'pix',
        name: 'PIX Instant Payment',
        icon: 'QrCode',
        behavior: 'standard',
      };

      const added = settingsReducer(initialSettings, {
        type: 'method/add',
        payload: customMethod,
      });
      expect(added.paymentMethods.some(m => m.id === 'pix')).toBe(true);

      const removed = settingsReducer(added, {
        type: 'method/remove',
        payload: { id: 'pix' },
      });
      expect(removed.paymentMethods.some(m => m.id === 'pix')).toBe(false);
    });
  });

  describe('account management', () => {
    it('adds, updates, archives, unarchives, and removes accounts', () => {
      const newAccount: AccountConfig = {
        id: 'acc-savings-new',
        name: 'New Savings',
        kind: 'Savings',
        currencies: ['USD'],
        openingDate: parseLocalDate('2026-03-01'),
        initials: 'NS',
        color: 'emerald',
      };

      const added = settingsReducer(initialSettings, {
        type: 'account/add',
        payload: newAccount,
      });
      expect(added.accounts.some(a => a.id === 'acc-savings-new')).toBe(true);

      const archived = settingsReducer(added, {
        type: 'account/archive',
        payload: { id: 'acc-savings-new' },
      });
      expect(archived.accounts.find(a => a.id === 'acc-savings-new')?.archived).toBe(true);

      const unarchived = settingsReducer(archived, {
        type: 'account/unarchive',
        payload: { id: 'acc-savings-new' },
      });
      expect(unarchived.accounts.find(a => a.id === 'acc-savings-new')?.archived).toBe(false);

      const removed = settingsReducer(unarchived, {
        type: 'account/remove',
        payload: { id: 'acc-savings-new' },
      });
      expect(removed.accounts.some(a => a.id === 'acc-savings-new')).toBe(false);
    });
  });

  describe('goals and budget allocations', () => {
    it('updates reference income and mode', () => {
      const updatedIncome = settingsReducer(initialSettings, {
        type: 'goals/updateReferenceIncome',
        payload: { income: 800000 },
      });
      expect(updatedIncome.goals.referenceMonthlyIncome).toBe(800000);

      const updatedMode = settingsReducer(updatedIncome, {
        type: 'goals/updateMode',
        payload: { mode: 'currency' },
      });
      expect(updatedMode.goals.mode).toBe('currency');
    });

    it('cascades category deletion to typeMappings', () => {
      const cat: GoalCategory = {
        id: 'cat-to-delete',
        name: 'Fun',
        percentage: 10,
        color: 'pink',
        icon: 'Sparkles',
      };
      const stateWithCat = settingsReducer(initialSettings, {
        type: 'goals/addCategory',
        payload: { category: cat },
      });
      const stateWithMapping = settingsReducer(stateWithCat, {
        type: 'goals/updateTypeMappings',
        payload: {
          mappings: {
            entertainment: 'cat-to-delete',
            shopping: 'needs',
          },
        },
      });

      const deleted = settingsReducer(stateWithMapping, {
        type: 'goals/deleteCategory',
        payload: { id: 'cat-to-delete' },
      });

      expect(deleted.goals.categories.some(c => c.id === 'cat-to-delete')).toBe(false);
      expect(deleted.goals.typeMappings.entertainment).toBeUndefined();
      expect(deleted.goals.typeMappings.shopping).toBe('needs');
    });
  });
});

