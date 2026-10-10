import {
  type Settings,
  type TransactionTypeConfig,
  type PaymentMethodConfig,
  type AccountConfig,
} from '../data/settings';

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
  | { type: 'account/update'; payload: { id: string; changes: Partial<Omit<AccountConfig, 'id'>> } };

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

    default:
      return state;
  }
}
