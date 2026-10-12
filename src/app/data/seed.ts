import { type Transaction } from './transactions';
import { getToday, addDays, addMonthsClamped } from './dates';

export function daysFromToday(days: number): Date {
  return addDays(getToday(), days);
}

let seedIdCounter = 1;
function nextId() {
  return `seed-${seedIdCounter++}`;
}

export const SEEDED_TRANSACTIONS: Transaction[] = [];

// Helper to add
function addTx(tx: Omit<Transaction, 'id'>) {
  SEEDED_TRANSACTIONS.push({ id: nextId(), ...tx });
}

function addTransfer(
  date: Date,
  value: number,
  fromAccountId: string,
  toAccountId: string,
  fromName = 'Bank of America',
  toName = 'Goldman Sachs',
) {
  const transferId = `tf-${seedIdCounter++}`;
  addTx({
    date,
    description: `Transfer to ${toName}`,
    typeId: 'transfer',
    direction: 'expense',
    value,
    accountId: fromAccountId,
    transferId,
  });
  addTx({
    date,
    description: `Transfer from ${fromName}`,
    typeId: 'transfer',
    direction: 'income',
    value,
    accountId: toAccountId,
    transferId,
  });
}

function createMonthly(count: number, startDays: number, txBase: Omit<Transaction, 'id' | 'date'>) {
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

createMonthly(6, -70, {
  description: 'Salary Deposit',
  typeId: 'income',
  direction: 'income',
  value: 5200,
  accountId: 'boa',
});

createMonthly(6, -72, {
  description: 'Rent',
  typeId: 'bills',
  direction: 'expense',
  value: 1800,
  accountId: 'boa',
  paymentMethodId: 'bank-transfer',
});

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
// Goldman Sachs (Savings)
// Monthly transfer from BoA
let tfCur = daysFromToday(-60);
for (let i = 0; i < 4; i++) {
  addTransfer(tfCur, 1000, 'boa', 'gs', 'Bank of America', 'Goldman Sachs');
  tfCur = addMonthsClamped(tfCur, 1);
}

// Monthly interest
createMonthly(6, -88, {
  description: 'Interest Yield',
  typeId: 'income',
  direction: 'income',
  value: 45.32,
  accountId: 'gs',
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
