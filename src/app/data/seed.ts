import { type Transaction, type Account } from './transactions';
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

function addTransfer(date: Date, value: number, from: Account, to: Account) {
  const transferId = `tf-${seedIdCounter++}`;
  addTx({
    date,
    description: `Transfer to ${to}`,
    type: 'Transfer',
    direction: 'expense',
    value,
    account: from,
    transferId,
  });
  addTx({
    date,
    description: `Transfer from ${from}`,
    type: 'Transfer',
    direction: 'income',
    value,
    account: to,
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
  type: 'Income',
  direction: 'income',
  value: 5200,
  account: 'Bank of America',
});

createMonthly(6, -72, {
  description: 'Rent',
  type: 'Bills',
  direction: 'expense',
  value: 1800,
  account: 'Bank of America',
  paymentMethod: 'Bank transfer',
});

// Some BOA expenses
addTx({
  date: daysFromToday(-15),
  description: 'Grocery Store',
  type: 'Food & Dining',
  direction: 'expense',
  value: 145.2,
  account: 'Bank of America',
  paymentMethod: 'Debit card',
});
addTx({
  date: daysFromToday(-5),
  description: 'Uber',
  type: 'Transportation',
  direction: 'expense',
  value: 24.5,
  account: 'Bank of America',
  paymentMethod: 'PIX',
});
addTx({
  date: daysFromToday(10),
  description: 'Electric Bill',
  type: 'Bills',
  direction: 'expense',
  value: 132,
  account: 'Bank of America',
  paymentMethod: 'Bank transfer',
});

// BoA Visa (Credit Card)
// MacBook Installments (10x), started 4 months ago
const macbookStart = addMonthsClamped(getToday(), -4);
const macGroupId = 'seed-macbook';
for (let i = 0; i < 10; i++) {
  addTx({
    date: addMonthsClamped(macbookStart, i),
    description: 'MacBook Pro M3',
    type: 'Shopping',
    direction: 'expense',
    value: 199.99,
    account: 'Bank of America',
    paymentMethod: 'Credit card',
    installment: { groupId: macGroupId, number: i + 1, total: 10 },
  });
}

// More BoA card purchases
addTx({
  date: daysFromToday(-20),
  description: 'Amazon Purchase',
  type: 'Shopping',
  direction: 'expense',
  value: 124.99,
  account: 'Bank of America',
  paymentMethod: 'Credit card',
});
addTx({
  date: daysFromToday(-2),
  description: "Dinner at Mario's",
  type: 'Food & Dining',
  direction: 'expense',
  value: 85.0,
  account: 'Bank of America',
  paymentMethod: 'Credit card',
});

// ---------------------------------------------------------
// Citigroup (Checking)
addTx({
  date: daysFromToday(-45),
  description: 'Freelance Design',
  type: 'Income',
  direction: 'income',
  value: 1500,
  account: 'Citigroup',
  paymentMethod: 'Bank transfer',
});
addTx({
  date: daysFromToday(-10),
  description: 'Freelance Coding',
  type: 'Income',
  direction: 'income',
  value: 800,
  account: 'Citigroup',
  paymentMethod: 'Bank transfer',
});

// Citi Mastercard
createMonthly(6, -80, {
  description: 'Netflix Subscription',
  type: 'Entertainment',
  direction: 'expense',
  value: 15.99,
  account: 'Citigroup',
  paymentMethod: 'Credit card',
});
createMonthly(6, -85, {
  description: 'Gym Membership',
  type: 'Entertainment',
  direction: 'expense',
  value: 45.0,
  account: 'Citigroup',
  paymentMethod: 'Credit card',
});

// A card refund
addTx({
  date: daysFromToday(-12),
  description: 'Online Store Refund',
  type: 'Refund',
  direction: 'income',
  value: 45.0,
  account: 'Citigroup',
  paymentMethod: 'Credit card',
});

// ---------------------------------------------------------
// Goldman Sachs (Savings)
// Monthly transfer from BoA
let tfCur = daysFromToday(-60);
for (let i = 0; i < 4; i++) {
  addTransfer(tfCur, 1000, 'Bank of America', 'Goldman Sachs');
  tfCur = addMonthsClamped(tfCur, 1);
}

// Monthly interest
createMonthly(6, -88, {
  description: 'Interest Yield',
  type: 'Income',
  direction: 'income',
  value: 45.32,
  account: 'Goldman Sachs',
});
