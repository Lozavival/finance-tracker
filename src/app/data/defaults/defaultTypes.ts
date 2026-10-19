import type { TransactionTypeConfig, PaymentMethodConfig } from '../settings';
import { TRANSFER_TYPE_ID, CREDIT_CARD_METHOD_ID } from '../settings';

export const DEFAULT_TRANSACTION_TYPES: TransactionTypeConfig[] = [
  {
    id: 'income',
    name: 'Income',
    direction: 'income',
    color: 'emerald',
    icon: 'Banknote',
  },
  {
    id: 'refund',
    name: 'Refund',
    direction: 'income',
    color: 'teal',
    icon: 'Receipt',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    direction: 'expense',
    color: 'cyan',
    icon: 'ShoppingBag',
  },
  {
    id: 'food-dining',
    name: 'Food & Dining',
    direction: 'expense',
    color: 'blue',
    icon: 'Utensils',
  },
  {
    id: 'transportation',
    name: 'Transportation',
    direction: 'expense',
    color: 'violet',
    icon: 'Car',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    direction: 'expense',
    color: 'pink',
    icon: 'Film',
  },
  {
    id: 'bills',
    name: 'Bills',
    direction: 'expense',
    color: 'amber',
    icon: 'Receipt',
  },
  {
    id: TRANSFER_TYPE_ID,
    name: 'Transfer',
    direction: 'expense',
    color: 'indigo',
    icon: 'ArrowLeftRight',
    system: 'transfer',
  },
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: CREDIT_CARD_METHOD_ID,
    name: 'Credit card',
    icon: 'CreditCard',
    behavior: 'credit-card',
  },
  {
    id: 'debit-card',
    name: 'Debit card',
    icon: 'CreditCard',
    behavior: 'standard',
  },
  {
    id: 'cash',
    name: 'Cash',
    icon: 'Banknote',
    behavior: 'standard',
  },
  {
    id: 'pix',
    name: 'PIX',
    icon: 'QrCode',
    behavior: 'standard',
  },
  {
    id: 'bank-transfer',
    name: 'Bank transfer',
    icon: 'Landmark',
    behavior: 'standard',
  },
];
