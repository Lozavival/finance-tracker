import {
  type Settings,
  type TransactionTypeConfig,
  type PaymentMethodConfig,
  type AccountConfig,
} from '../data/settings';
import { type GoalCategory, DEFAULT_GOAL_CATEGORIES } from '../data/goals';

export type SettingsAction =
  | { type: 'type/add'; payload: TransactionTypeConfig }
  | {
      type: 'type/update';
      payload: { id: string; changes: Partial<Omit<TransactionTypeConfig, 'id' | 'system'>> };
    }
  | { type: 'type/remove'; payload: { id: string } }
  | { type: 'type/reorder'; payload: { types: TransactionTypeConfig[] } }
  | { type: 'method/add'; payload: PaymentMethodConfig }
  | {
      type: 'method/update';
      payload: { id: string; changes: Partial<Omit<PaymentMethodConfig, 'id' | 'behavior'>> };
    }
  | { type: 'method/reorder'; payload: { methods: PaymentMethodConfig[] } }
  | { type: 'account/add'; payload: AccountConfig }
  | { type: 'account/update'; payload: { id: string; changes: Partial<Omit<AccountConfig, 'id'>> } }
  | { type: 'goals/updateReferenceIncome'; payload: { income: number } }
  | { type: 'goals/updateMode'; payload: { mode: 'percentage' | 'currency' } }
  | { type: 'goals/updateAllocations'; payload: { categories: GoalCategory[] } }
  | { type: 'goals/addCategory'; payload: { category: GoalCategory } }
  | { type: 'goals/updateCategory'; payload: { id: string; changes: Partial<Omit<GoalCategory, 'id'>> } }
  | { type: 'goals/deleteCategory'; payload: { id: string } }
  | { type: 'goals/resetAllocations' }
  | { type: 'goals/updateTypeMappings'; payload: { mappings: Record<string, string> } };

export function settingsReducer(state: Settings, action: SettingsAction): Settings {
  switch (action.type) {
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
      return {
        ...state,
        transactionTypes: state.transactionTypes.filter(t => t.id !== action.payload.id),
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
      return {
        ...state,
        goals: {
          ...state.goals,
          categories: state.goals.categories.filter(c => c.id !== action.payload.id),
        },
      };
    }

    case 'goals/resetAllocations': {
      return {
        ...state,
        goals: {
          ...state.goals,
          categories: DEFAULT_GOAL_CATEGORIES,
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

    default:
      return state;
  }
}
