import { type Transaction } from './transactions';
import { getToday, addDays, addMonthsClamped } from './dates';
import { type RecurringRule, buildRecurringTransactions } from './recurring';

export function daysFromToday(days: number): Date {
  return addDays(getToday(), days);
}

let seedIdCounter = 1;
function nextId() {
  return `seed-${seedIdCounter++}`;
}

export const SEEDED_RECURRING_RULES: RecurringRule[] = [
  {
    id: 'rule-salary',
    description: 'Salary Deposit',
    typeId: 'income',
    direction: 'income',
    value: 520000,
    currency: 'USD',
    accountId: 'boa',
    startDate: daysFromToday(-70),
    frequency: 'monthly',
    limit: { kind: 'infinite' },
    status: 'active',
    createdAt: daysFromToday(-70),
  },
  {
    id: 'rule-rent',
    description: 'Rent',
    typeId: 'bills',
    direction: 'expense',
    value: 180000,
    currency: 'USD',
    accountId: 'boa',
    paymentMethodId: 'bank-transfer',
    startDate: daysFromToday(-72),
    frequency: 'monthly',
    limit: { kind: 'infinite' },
    status: 'active',
    createdAt: daysFromToday(-72),
  },
];

import { type SupportedCurrency } from '@/i18n/types';
import { dollarsToCents } from '@/data/currency';

export const SEEDED_TRANSACTIONS: Transaction[] = [];

function inferAccountCurrency(accountId: string): SupportedCurrency {
  if (accountId === 'nubank' || accountId === 'cash-wallet') return 'BRL';
  return 'USD';
}

type SeedTransactionInput = Omit<Transaction, 'id' | 'currency'> & {
  currency?: SupportedCurrency;
};

// Helper to add (converts human-readable dollar literals to integer cents)
function addTx(tx: SeedTransactionInput) {
  const currency = tx.currency ?? inferAccountCurrency(tx.accountId);
  SEEDED_TRANSACTIONS.push({
    id: nextId(),
    ...tx,
    value: dollarsToCents(tx.value),
    currency,
  });
}

function addTransfer(
  date: Date,
  value: number,
  fromAccountId: string,
  toAccountId: string,
  fromName = 'Bank of America',
  toName = 'Wise',
  fromCurrency?: SupportedCurrency,
  toCurrency?: SupportedCurrency,
  toValue?: number,
) {
  const fCurr = fromCurrency ?? inferAccountCurrency(fromAccountId);
  const tCurr = toCurrency ?? inferAccountCurrency(toAccountId);
  const tVal = toValue ?? value;
  const isCross = fCurr !== tCurr;
  const rateLabel = isCross && tVal > 0 ? ` (${tVal} ${tCurr} @ ${(value / tVal).toFixed(2)} ${fCurr}/${tCurr})` : '';
  const transferId = `tf-${seedIdCounter++}`;

  addTx({
    date,
    description: `Transfer to ${toName}${rateLabel}`,
    typeId: 'transfer',
    direction: 'expense',
    value,
    currency: fCurr,
    accountId: fromAccountId,
    transferId,
  });
  addTx({
    date,
    description: `Transfer from ${fromName}`,
    typeId: 'transfer',
    direction: 'income',
    value: tVal,
    currency: tCurr,
    accountId: toAccountId,
    transferId,
  });
}

function createMonthly(count: number, startDays: number, txBase: Omit<SeedTransactionInput, 'date'>) {
  let cur = daysFromToday(startDays);
  for (let i = 0; i < count; i++) {
    addTx({ ...txBase, date: cur });
    cur = addMonthsClamped(cur, 1);
  }
}

// ---------------------------------------------------------
// Bank of America (Checking)
// Salary on the 5th, Rent on the 3rd.
// Dip below zero scenario: Rent comes before Salary.

for (const rule of SEEDED_RECURRING_RULES) {
  const recurringTxs = buildRecurringTransactions(rule, i => `${rule.id}-${i + 1}`);
  SEEDED_TRANSACTIONS.push(...recurringTxs);
}

// Some BOA expenses
addTx({
  date: daysFromToday(-15),
  description: 'Grocery Store',
  typeId: 'food-dining',
  direction: 'expense',
  value: 145.2,
  accountId: 'boa',
  paymentMethodId: 'debit-card',
});
addTx({
  date: daysFromToday(-5),
  description: 'Uber',
  typeId: 'transportation',
  direction: 'expense',
  value: 24.5,
  accountId: 'boa',
  paymentMethodId: 'pix',
});
addTx({
  date: daysFromToday(10),
  description: 'Electric Bill',
  typeId: 'bills',
  direction: 'expense',
  value: 132,
  accountId: 'boa',
  paymentMethodId: 'bank-transfer',
});

// BoA Visa (Credit Card)
// MacBook Installments (10x), started 4 months ago
const macbookStart = addMonthsClamped(getToday(), -4);
const macGroupId = 'seed-macbook';
for (let i = 0; i < 10; i++) {
  addTx({
    date: addMonthsClamped(macbookStart, i),
    description: 'MacBook Pro M3',
    typeId: 'shopping',
    direction: 'expense',
    value: 199.99,
    accountId: 'boa',
    paymentMethodId: 'credit-card',
    installment: { groupId: macGroupId, number: i + 1, total: 10 },
  });
}

// More BoA card purchases
addTx({
  date: daysFromToday(-20),
  description: 'Amazon Purchase',
  typeId: 'shopping',
  direction: 'expense',
  value: 124.99,
  accountId: 'boa',
  paymentMethodId: 'credit-card',
});
addTx({
  date: daysFromToday(-2),
  description: "Dinner at Mario's",
  typeId: 'food-dining',
  direction: 'expense',
  value: 85.0,
  accountId: 'boa',
  paymentMethodId: 'credit-card',
});

// ---------------------------------------------------------
// Citigroup (Checking)
addTx({
  date: daysFromToday(-45),
  description: 'Freelance Design',
  typeId: 'income',
  direction: 'income',
  value: 1500,
  accountId: 'citi',
  paymentMethodId: 'bank-transfer',
});
addTx({
  date: daysFromToday(-10),
  description: 'Freelance Coding',
  typeId: 'income',
  direction: 'income',
  value: 800,
  accountId: 'citi',
  paymentMethodId: 'bank-transfer',
});

// Citi Mastercard
createMonthly(6, -80, {
  description: 'Netflix Subscription',
  typeId: 'entertainment',
  direction: 'expense',
  value: 15.99,
  accountId: 'citi',
  paymentMethodId: 'credit-card',
});
createMonthly(6, -85, {
  description: 'Gym Membership',
  typeId: 'entertainment',
  direction: 'expense',
  value: 45.0,
  accountId: 'citi',
  paymentMethodId: 'credit-card',
});

// A card refund
addTx({
  date: daysFromToday(-12),
  description: 'Online Store Refund',
  typeId: 'refund',
  direction: 'income',
  value: 45.0,
  accountId: 'citi',
  paymentMethodId: 'credit-card',
});

// ---------------------------------------------------------
// Nubank (BRL Checking)
addTx({
  date: daysFromToday(-40),
  description: 'Salary / Consulting',
  typeId: 'income',
  direction: 'income',
  value: 7500,
  currency: 'BRL',
  accountId: 'nubank',
  paymentMethodId: 'pix',
});
addTx({
  date: daysFromToday(-10),
  description: 'Salary / Consulting',
  typeId: 'income',
  direction: 'income',
  value: 7500,
  currency: 'BRL',
  accountId: 'nubank',
  paymentMethodId: 'pix',
});
addTx({
  date: daysFromToday(-14),
  description: 'Pão de Açúcar Supermarket',
  typeId: 'food-dining',
  direction: 'expense',
  value: 385.5,
  currency: 'BRL',
  accountId: 'nubank',
  paymentMethodId: 'debit-card',
});
addTx({
  date: daysFromToday(-7),
  description: 'Internet & Mobile (Claro)',
  typeId: 'bills',
  direction: 'expense',
  value: 189.9,
  currency: 'BRL',
  accountId: 'nubank',
  paymentMethodId: 'pix',
});

// ---------------------------------------------------------
// Wise (Multi-Currency: BRL & USD)
// Cross-currency transfer: 500 BRL from Nubank to buy 100 USD in Wise
addTransfer(daysFromToday(-4), 500, 'nubank', 'wise', 'Nubank', 'Wise USD', 'BRL', 'USD', 100);

// USD Investment purchased with 50 USD from Wise USD pocket
addTx({
  date: daysFromToday(-2),
  description: 'Vanguard S&P 500 ETF (VOO)',
  typeId: 'shopping',
  direction: 'expense',
  value: 50.0,
  currency: 'USD',
  accountId: 'wise',
  paymentMethodId: 'bank-transfer',
});

// ---------------------------------------------------------
// Cash / Wallet
// ATM withdrawal from BoA to physical cash
addTransfer(daysFromToday(-18), 100, 'boa', 'cash-wallet', 'Bank of America', 'Cash / Wallet');

// Cash expense paid with physical cash
addTx({
  date: daysFromToday(-8),
  description: "Farmer's Market",
  typeId: 'food-dining',
  direction: 'expense',
  value: 35.0,
  accountId: 'cash-wallet',
  paymentMethodId: 'cash',
});

// ---------------------------------------------------------
// October 2026 Benchmark Demo Data for Goals & Budget
// Faithfully matches the figures and allocations from the visual reference
const oct2026 = (day: number) => new Date(2026, 9, day);

// October Income ($237,314.72 total)
addTx({
  date: oct2026(2),
  description: 'SaaS Platform Revenue',
  typeId: 'income',
  direction: 'income',
  value: 185000.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(5),
  description: 'Enterprise Retainer',
  typeId: 'income',
  direction: 'income',
  value: 45000.0,
  accountId: 'citi',
});
addTx({
  date: oct2026(10),
  description: 'Treasury & Investment Yield',
  typeId: 'income',
  direction: 'income',
  value: 7314.72,
  accountId: 'gs',
});

// Fixed Costs ($6,460.38 across 12 transactions)
addTx({
  date: oct2026(1),
  description: 'Executive Suite Lease',
  typeId: 'bills',
  direction: 'expense',
  value: 3500.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(2),
  description: 'Commercial Electric Utility',
  typeId: 'bills',
  direction: 'expense',
  value: 340.5,
  accountId: 'boa',
});
addTx({
  date: oct2026(3),
  description: 'Gigabit Fiber Uplink',
  typeId: 'bills',
  direction: 'expense',
  value: 120.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(4),
  description: 'Comprehensive Health Coverage',
  typeId: 'bills',
  direction: 'expense',
  value: 650.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(5),
  description: 'Core Cloud Servers',
  typeId: 'bills',
  direction: 'expense',
  value: 480.2,
  accountId: 'citi',
});
addTx({
  date: oct2026(6),
  description: 'Fleet Mobile Communications',
  typeId: 'bills',
  direction: 'expense',
  value: 95.0,
  accountId: 'citi',
});
addTx({
  date: oct2026(7),
  description: 'Metro Rail Transit Pass',
  typeId: 'transportation',
  direction: 'expense',
  value: 180.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(8),
  description: 'Vehicle Fuel Logistics',
  typeId: 'transportation',
  direction: 'expense',
  value: 85.4,
  accountId: 'boa',
});
addTx({
  date: oct2026(9),
  description: 'Municipal Water & Utilities',
  typeId: 'bills',
  direction: 'expense',
  value: 68.5,
  accountId: 'citi',
});
addTx({
  date: oct2026(10),
  description: 'Property Liability Insurance',
  typeId: 'bills',
  direction: 'expense',
  value: 115.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(11),
  description: 'Scheduled Fleet Maintenance',
  typeId: 'transportation',
  direction: 'expense',
  value: 425.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(12),
  description: 'Facilities Care & Operations',
  typeId: 'bills',
  direction: 'expense',
  value: 400.78,
  accountId: 'boa',
});

// Comfort ($3,334.57 across 6 transactions)
addTx({
  date: oct2026(2),
  description: 'Gourmet Pantry Provisions',
  typeId: 'food-dining',
  direction: 'expense',
  value: 850.25,
  accountId: 'boa',
});
addTx({
  date: oct2026(4),
  description: 'Bistro Partner Luncheon',
  typeId: 'food-dining',
  direction: 'expense',
  value: 640.8,
  accountId: 'boa',
});
addTx({
  date: oct2026(6),
  description: 'Organic Farmstead Delivery',
  typeId: 'food-dining',
  direction: 'expense',
  value: 245.5,
  accountId: 'citi',
});
addTx({
  date: oct2026(8),
  description: 'Specialty Roastery Supplies',
  typeId: 'food-dining',
  direction: 'expense',
  value: 182.4,
  accountId: 'citi',
});
addTx({
  date: oct2026(10),
  description: 'Fine Dining Hospitality',
  typeId: 'food-dining',
  direction: 'expense',
  value: 725.62,
  accountId: 'boa',
});
addTx({
  date: oct2026(11),
  description: 'Artisan Bakery Catering',
  typeId: 'food-dining',
  direction: 'expense',
  value: 690.0,
  accountId: 'boa',
});

// Goals ($7,580.16 across 3 transactions)
addTx({
  date: oct2026(3),
  description: 'Capital Reserve Allocation',
  typeId: 'shopping',
  direction: 'expense',
  value: 4500.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(6),
  description: 'High-Yield Liquidity Reserve',
  typeId: 'shopping',
  direction: 'expense',
  value: 2000.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(9),
  description: 'Infrastructure Expansion Pool',
  typeId: 'shopping',
  direction: 'expense',
  value: 1080.16,
  accountId: 'citi',
});

// Pleasures ($2,841.69 across 4 transactions)
addTx({
  date: oct2026(4),
  description: 'Executive Retreat Lodge',
  typeId: 'entertainment',
  direction: 'expense',
  value: 1450.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(6),
  description: 'Symphony Hall Premier Box',
  typeId: 'entertainment',
  direction: 'expense',
  value: 680.0,
  accountId: 'boa',
});
addTx({
  date: oct2026(8),
  description: 'Digital Entertainment & Media',
  typeId: 'entertainment',
  direction: 'expense',
  value: 111.69,
  accountId: 'citi',
});
addTx({
  date: oct2026(10),
  description: 'Golf & Country Club Outing',
  typeId: 'entertainment',
  direction: 'expense',
  value: 600.0,
  accountId: 'boa',
});
