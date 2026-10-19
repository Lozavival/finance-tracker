import type { AccountConfig } from '../settings';
import { parseLocalDate } from '../dates';

export const DEV_MOCK_ACCOUNTS: AccountConfig[] = [
  {
    id: 'boa',
    name: 'Bank of America',
    kind: 'Checking',
    currencies: ['USD'],
    openingBalances: { USD: 320000 }, // $3,200.00
    openingDate: parseLocalDate('2025-01-01'),
    initials: 'BA',
    color: 'blue',
    allowedPaymentMethods: ['credit-card', 'debit-card', 'pix', 'bank-transfer'],
    card: {
      name: 'BoA Visa',
      closingDay: 25,
      dueDay: 5,
      limit: 800000, // $8000
    },
  },
  {
    id: 'nubank',
    name: 'Nubank',
    kind: 'Checking',
    currencies: ['BRL'],
    openingBalances: { BRL: 450000 }, // R$ 4,500.00
    openingDate: parseLocalDate('2025-01-01'),
    initials: 'NU',
    color: 'violet',
    allowedPaymentMethods: ['pix', 'debit-card', 'bank-transfer'],
  },
  {
    id: 'wise',
    name: 'Wise',
    kind: 'Checking',
    currencies: ['BRL', 'USD'],
    openingBalances: { BRL: 250000, USD: 80000 }, // R$ 2,500.00 & $800.00
    openingDate: parseLocalDate('2025-01-01'),
    initials: 'WS',
    color: 'emerald',
    allowedPaymentMethods: ['pix', 'debit-card', 'bank-transfer'],
  },
  {
    id: 'citi',
    name: 'Citigroup',
    kind: 'Checking',
    currencies: ['USD'],
    openingBalances: { USD: 120000 }, // $1,200.00
    openingDate: parseLocalDate('2025-01-01'),
    initials: 'CI',
    color: 'cyan',
    allowedPaymentMethods: ['credit-card', 'debit-card', 'pix', 'bank-transfer'],
    card: {
      name: 'Citi Mastercard',
      closingDay: 1,
      dueDay: 10,
      limit: 300000, // $3000
    },
  },
  {
    id: 'cash-wallet',
    name: 'Cash / Wallet',
    kind: 'Cash',
    currencies: ['BRL'],
    openingBalances: { BRL: 20000 }, // R$ 200.00
    openingDate: parseLocalDate('2025-01-01'),
    initials: 'CW',
    color: 'teal',
    allowedPaymentMethods: ['cash'],
  },
];
