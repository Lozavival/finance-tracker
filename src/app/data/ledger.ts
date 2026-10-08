import { type Transaction, type Account } from './transactions';
import { type CardStatement } from './cardStatements';
import { ACCOUNT_DETAILS } from './accounts';
import { addDays } from './dates';

export type CashMovementKind = 'opening' | 'transaction' | 'card-bill';

export type CashMovement = {
  id: string;
  account: Account;
  date: string;
  amount: number; // cents
  kind: CashMovementKind;
  description: string;
  isTransfer: boolean;
  isEstimate: boolean;
  transactionId?: string;
  statementId?: string;
};

export function buildCashMovements(transactions: Transaction[], statements: CardStatement[]): CashMovement[] {
  const movements: CashMovement[] = [];

  for (const acc of Object.values(ACCOUNT_DETAILS)) {
    movements.push({
      id: `opening-${acc.name}`,
      account: acc.name,
      date: acc.openingDate,
      amount: acc.openingBalance,
      kind: 'opening',
      description: 'Opening Balance',
      isTransfer: false,
      isEstimate: false,
    });
  }

  for (const tx of transactions) {
    if (tx.paymentMethod === 'Credit card') continue;
    const isTransfer = tx.type === 'Transfer' && !!tx.transferId;
    const amount = Math.round(tx.value * 100) * (tx.direction === 'income' ? 1 : -1);

    movements.push({
      id: `tx-${tx.id}`,
      account: tx.account,
      date: tx.date,
      amount,
      kind: 'transaction',
      description: tx.description,
      isTransfer,
      isEstimate: false,
      transactionId: tx.id,
    });
  }

  for (const stmt of statements) {
    movements.push({
      id: `bill-${stmt.id}`,
      account: stmt.account,
      date: stmt.dueDate,
      amount: -stmt.total,
      kind: 'card-bill',
      description: `${stmt.cardName} — ${new Date(stmt.closingDate).toLocaleString('en-US', { month: 'short' })} bill`,
      isTransfer: false,
      isEstimate: stmt.status === 'open',
      statementId: stmt.id,
    });
  }

  return movements.filter(m => m.date >= ACCOUNT_DETAILS[m.account].openingDate);
}

export type BalancePoint = { date: string; balance: number };

export type AccountLedger = {
  account: Account;
  movements: CashMovement[];
  points: BalancePoint[];
};

export function buildLedgers(movements: CashMovement[]): Record<Account, AccountLedger> {
  const ledgers: Record<string, AccountLedger> = {};

  for (const acc of Object.keys(ACCOUNT_DETAILS)) {
    ledgers[acc as Account] = { account: acc as Account, movements: [], points: [] };
  }

  const sortedMovements = [...movements].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  for (const m of sortedMovements) {
    ledgers[m.account].movements.push(m);
  }

  for (const acc of Object.values(ledgers)) {
    let balance = 0;
    const pointsMap = new Map<string, number>();
    for (const m of acc.movements) {
      balance += m.amount;
      pointsMap.set(m.date, balance);
    }
    acc.points = Array.from(pointsMap.entries())
      .map(([date, bal]) => ({ date, balance: bal }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return ledgers as Record<Account, AccountLedger>;
}

export function balanceAt(ledger: AccountLedger, date: string): number {
  let low = 0;
  let high = ledger.points.length - 1;
  let ans = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (ledger.points[mid].date <= date) {
      ans = ledger.points[mid].balance;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
}

export type ForecastHorizon = 'end-of-month' | '30d' | '90d';

export function resolveHorizonEnd(h: ForecastHorizon, today: string): string {
  if (h === '30d') return addDays(today, 30);
  if (h === '90d') return addDays(today, 90);

  // end-of-month
  const [y, m] = today.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export type AccountForecast = {
  current: number; // cents
  upcoming: CashMovement[];
  upcomingIn: number; // cents
  upcomingOut: number; // cents
  projected: number; // cents
  lowest: BalancePoint;
  firstNegativeDate?: string;
  monthChange: number; // cents
};

export function getAccountForecast(ledger: AccountLedger, today: string, horizonEnd: string): AccountForecast {
  const current = balanceAt(ledger, today);
  const upcoming = ledger.movements.filter(m => m.date > today && m.date <= horizonEnd);

  let upcomingIn = 0;
  let upcomingOut = 0;
  for (const m of upcoming) {
    if (!m.isTransfer) {
      if (m.amount > 0) upcomingIn += m.amount;
      else upcomingOut += m.amount;
    }
  }

  const projected = balanceAt(ledger, horizonEnd);

  let lowestBal = current;
  let lowestDate = today;
  let firstNegative: string | undefined;

  let runBal = current;
  for (const m of upcoming) {
    runBal += m.amount;
    if (runBal < lowestBal) {
      lowestBal = runBal;
      lowestDate = m.date;
    }
    if (runBal < 0 && !firstNegative) {
      firstNegative = m.date;
    }
  }

  const [y, m] = today.split('-').map(Number);
  let lastMonthEnd = '';
  if (m === 1) lastMonthEnd = `${y - 1}-12-31`;
  else
    lastMonthEnd = `${y}-${String(m - 1).padStart(2, '0')}-${String(new Date(y, m - 1, 0).getDate()).padStart(2, '0')}`;

  const monthChange = current - balanceAt(ledger, lastMonthEnd);

  return {
    current,
    upcoming,
    upcomingIn,
    upcomingOut,
    projected,
    lowest: { date: lowestDate, balance: lowestBal },
    firstNegativeDate: firstNegative,
    monthChange,
  };
}

export type DailyBalance = { date: string; actual?: number; projected?: number };

export function buildDailySeries(ledger: AccountLedger, from: string, to: string, today: string): DailyBalance[] {
  const series: DailyBalance[] = [];
  let d = from;
  while (d <= to) {
    const bal = balanceAt(ledger, d);
    if (d <= today && d >= today) {
      series.push({ date: d, actual: bal, projected: bal });
    } else if (d < today) {
      series.push({ date: d, actual: bal });
    } else {
      series.push({ date: d, projected: bal });
    }
    d = addDays(d, 1);
  }
  return series;
}
