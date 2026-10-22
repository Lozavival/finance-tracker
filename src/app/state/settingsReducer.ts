import {
  type Settings,
  type TransactionTypeConfig,
  type PaymentMethodConfig,
  type AccountConfig,
} from '@/data/settings';
import { type GoalCategory } from '@/data/goals';
import { DEFAULT_GOAL_CATEGORIES, DEFAULT_TYPE_MAPPINGS } from '@/data/defaults';

import { type ExchangeRateState } from '@/data/currency';

export type SettingsAction =
  | { type: 'settings/hydrate'; payload: Settings }
  | { type: 'type/add'; payload: TransactionTypeConfig }
  | {
      type: 'type/update';
      payload: { id: string; changes: Partial<Omit<TransactionTypeConfig, 'id' | 'system'>> };
    }
  | { type: 'type/remove'; payload: { id: string; replacementId?: string } }
  | { type: 'type/reorder'; payload: { types: TransactionTypeConfig[] } }
  | { type: 'method/add'; payload: PaymentMethodConfig }
  | {
      type: 'method/update';
      payload: { id: string; changes: Partial<Omit<PaymentMethodConfig, 'id' | 'behavior'>> };
    }
  | { type: 'method/remove'; payload: { id: string; replacementId?: string } }
  | { type: 'method/reorder'; payload: { methods: PaymentMethodConfig[] } }
  | { type: 'account/add'; payload: AccountConfig }
  | { type: 'account/update'; payload: { id: string; changes: Partial<Omit<AccountConfig, 'id'>> } }
  | { type: 'account/remove'; payload: { id: string } }
  | { type: 'account/archive'; payload: { id: string } }
  | { type: 'account/unarchive'; payload: { id: string } }
  | { type: 'goals/updateReferenceIncome'; payload: { income: number } }
  | { type: 'goals/updateMode'; payload: { mode: 'percentage' | 'currency' } }
  | { type: 'goals/updateAllocations'; payload: { categories: GoalCategory[] } }
  | { type: 'goals/addCategory'; payload: { category: GoalCategory } }
  | { type: 'goals/updateCategory'; payload: { id: string; changes: Partial<Omit<GoalCategory, 'id'>> } }
  | { type: 'goals/deleteCategory'; payload: { id: string } }
  | { type: 'goals/resetAllocations' }
  | { type: 'goals/updateTypeMappings'; payload: { mappings: Record<string, string> } }
  | { type: 'goals/restore'; payload: { categories: GoalCategory[]; typeMappings: Record<string, string> } }
  | { type: 'settings/updateExchangeRate'; payload: Partial<ExchangeRateState> };

export function settingsReducer(state: Settings, action: SettingsAction): Settings {
  switch (action.type) {
    case 'settings/hydrate': {
      return action.payload;
    }
    case 'settings/updateExchangeRate': {
      return {
        ...state,
        exchangeRate: {
          ...state.exchangeRate,
          ...action.payload,
        },
      };
    }
    case 'type/add': {
      return {
        ...state,
        transactionTypes: [...state.transactionTypes, action.payload],
      };
    }

    case 'type/update': {
      return {
        ...state,
        transactionTypes: state.transactionTypes.map(t => {
          if (t.id !== action.payload.id) return t;
          // System types cannot change direction or system property
          if (t.system) {
            return {
              ...t,
              ...action.payload.changes,
              direction: t.direction,
              system: t.system,
            };
          }
          return { ...t, ...action.payload.changes };
        }),
      };
    }

    case 'type/remove': {
      const target = state.transactionTypes.find(t => t.id === action.payload.id);
      if (!target || target.system) {
        return state; // Cannot remove system type or nonexistent
      }
      const remainingInDirection = state.transactionTypes.filter(
        t => t.direction === target.direction && t.id !== target.id,
      );
      if (remainingInDirection.length === 0) {
        return state; // At least one type per direction is required
      }
      const nextMappings = { ...state.goals.typeMappings };
      delete nextMappings[action.payload.id];
      return {
        ...state,
        transactionTypes: state.transactionTypes.filter(t => t.id !== action.payload.id),
        goals: {
          ...state.goals,
          typeMappings: nextMappings,
        },
      };
    }

    case 'type/reorder': {
      return {
        ...state,
        transactionTypes: action.payload.types,
      };
    }

    case 'method/add': {
      return {
        ...state,
        paymentMethods: [...state.paymentMethods, action.payload],
      };
    }

    case 'method/update': {
      return {
        ...state,
        paymentMethods: state.paymentMethods.map(m => {
          if (m.id !== action.payload.id) return m;
          return {
            ...m,
            ...action.payload.changes,
            behavior: m.behavior, // Behavior cannot be changed
          };
        }),
      };
    }

    case 'method/remove': {
      const target = state.paymentMethods.find(m => m.id === action.payload.id);
      if (!target || target.id === 'cash' || target.behavior === 'credit-card') {
        return state; // Cannot remove system payment methods (cash, credit-card)
      }
      if (state.paymentMethods.length <= 1) {
        return state;
      }
      return {
        ...state,
        paymentMethods: state.paymentMethods.filter(m => m.id !== action.payload.id),
        accounts: state.accounts.map(acc => {
          if (!acc.allowedPaymentMethods) return acc;
          return {
            ...acc,
            allowedPaymentMethods: acc.allowedPaymentMethods.filter(id => id !== action.payload.id),
          };
        }),
      };
    }

    case 'method/reorder': {
      return {
        ...state,
        paymentMethods: action.payload.methods,
      };
    }

    case 'account/add': {
      return {
        ...state,
        accounts: [...state.accounts, action.payload],
      };
    }

    case 'account/update': {
      return {
        ...state,
        accounts: state.accounts.map(a => {
          if (a.id !== action.payload.id) return a;
          return { ...a, ...action.payload.changes };
        }),
      };
    }

    case 'account/remove': {
      return {
        ...state,
        accounts: state.accounts.filter(a => a.id !== action.payload.id),
      };
    }

    case 'account/archive': {
      return {
        ...state,
        accounts: state.accounts.map(a => (a.id === action.payload.id ? { ...a, archived: true } : a)),
      };
    }

    case 'account/unarchive': {
      return {
        ...state,
        accounts: state.accounts.map(a => (a.id === action.payload.id ? { ...a, archived: false } : a)),
      };
    }

    case 'goals/updateReferenceIncome': {
      return {
        ...state,
        goals: {
          ...state.goals,
          referenceMonthlyIncome: action.payload.income,
        },
      };
    }

    case 'goals/updateMode': {
      return {
        ...state,
        goals: {
          ...state.goals,
          mode: action.payload.mode,
        },
      };
    }

    case 'goals/updateAllocations': {
      return {
        ...state,
        goals: {
          ...state.goals,
          categories: action.payload.categories,
        },
      };
    }

    case 'goals/addCategory': {
      return {
        ...state,
        goals: {
          ...state.goals,
          categories: [...state.goals.categories, action.payload.category],
        },
      };
    }

    case 'goals/updateCategory': {
      return {
        ...state,
        goals: {
          ...state.goals,
          categories: state.goals.categories.map(c =>
            c.id === action.payload.id ? { ...c, ...action.payload.changes } : c,
          ),
        },
      };
    }

    case 'goals/deleteCategory': {
      const nextMappings = { ...state.goals.typeMappings };
      for (const [typeId, catId] of Object.entries(nextMappings)) {
        if (catId === action.payload.id) {
          delete nextMappings[typeId];
        }
      }
      return {
        ...state,
        goals: {
          ...state.goals,
          categories: state.goals.categories.filter(c => c.id !== action.payload.id),
          typeMappings: nextMappings,
        },
      };
    }

    case 'goals/resetAllocations': {
      return {
        ...state,
        goals: {
          ...state.goals,
          categories: DEFAULT_GOAL_CATEGORIES,
          typeMappings: DEFAULT_TYPE_MAPPINGS,
        },
      };
    }

    case 'goals/updateTypeMappings': {
      return {
        ...state,
        goals: {
          ...state.goals,
          typeMappings: action.payload.mappings,
        },
      };
    }

    case 'goals/restore': {
      return {
        ...state,
        goals: {
          ...state.goals,
          categories: action.payload.categories,
          typeMappings: action.payload.typeMappings,
        },
      };
    }

    default:
      return state;
  }
}
