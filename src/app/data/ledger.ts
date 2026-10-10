import { type Transaction } from './transactions';
import { type CardStatement } from './cardStatements';
import { type Settings, findAccount, isCreditCard, TRANSFER_TYPE_ID } from './settings';
import { addDays, formatShort } from './dates';

export type CashMovementKind = 'opening' | 'transaction' | 'card-bill';

export type CashMovement = {
  id: string;
  accountId: string;
  account: string; // compatibility alias
  date: Date;
  amount: number; // cents
  kind: CashMovementKind;
  description: string;
  isTransfer: boolean;
  isEstimate: boolean;
  transactionId?: string;
  statementId?: string;
};

export function buildCashMovements(
  transactions: Transaction[],
  statements: CardStatement[],
  settings: Settings,
): CashMovement[] {
  const movements: CashMovement[] = [];

  for (const acc of settings.accounts) {
    movements.push({
      id: `opening-${acc.id}`,
      accountId: acc.id,
      account: acc.id,
      date: acc.openingDate,
      amount: acc.openingBalance,
      kind: 'opening',
      description: 'Opening Balance',
      isTransfer: false,
      isEstimate: false,
    });
  }

  for (const tx of transactions) {
    if (isCreditCard(settings, tx.paymentMethodId)) continue;
    const isTransfer = tx.typeId === TRANSFER_TYPE_ID && !!tx.transferId;
    const amount = Math.round(tx.value * 100) * (tx.direction === 'income' ? 1 : -1);

    movements.push({
      id: `tx-${tx.id}`,
      accountId: tx.accountId,
      account: tx.accountId,
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
      accountId: stmt.accountId,
      account: stmt.accountId,
      date: stmt.dueDate,
      amount: -stmt.total,
      kind: 'card-bill',
      description: `${stmt.cardName} — ${formatShort(stmt.closingDate)} bill`,
      isTransfer: false,
      isEstimate: stmt.status === 'open',
      statementId: stmt.id,
    });
  }

  return movements.filter(m => {
    const acc = findAccount(settings, m.accountId);
    return acc ? m.date.getTime() >= acc.openingDate.getTime() : false;
  });
}

export type BalancePoint = { date: Date; balance: number };

export type AccountLedger = {
  accountId: string;
  account: string; // compatibility alias
  movements: CashMovement[];
  points: BalancePoint[];
};

export function buildLedgers(movements: CashMovement[], settings: Settings): Record<string, AccountLedger> {
  const ledgers: Record<string, AccountLedger> = {};

  for (const acc of settings.accounts) {
    ledgers[acc.id] = { accountId: acc.id, account: acc.id, movements: [], points: [] };
  }

  const sortedMovements = [...movements].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id),
  );

  for (const m of sortedMovements) {
    if (ledgers[m.accountId]) {
      ledgers[m.accountId].movements.push(m);
    }
  }

  for (const acc of Object.values(ledgers)) {
    let balance = 0;
    const pointsMap = new Map<number, { date: Date; balance: number }>();
    for (const m of acc.movements) {
      balance += m.amount;
      pointsMap.set(m.date.getTime(), { date: m.date, balance });
    }
    acc.points = Array.from(pointsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  return ledgers;
}

export function balanceAt(ledger: AccountLedger, date: Date): number {
  if (!ledger || !ledger.points) return 0;
  let low = 0;
  let high = ledger.points.length - 1;
  let ans = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (ledger.points[mid].date.getTime() <= date.getTime()) {
      ans = ledger.points[mid].balance;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
}

export type ForecastHorizon = 'end-of-month' | '30d' | '90d';

export function resolveHorizonEnd(h: ForecastHorizon, today: Date): Date {
  if (h === '30d') return addDays(today, 30);
  if (h === '90d') return addDays(today, 90);

  // end-of-month
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, lastDay, 0, 0, 0, 0);
}

export type AccountForecast = {
  current: number; // cents
  upcoming: CashMovement[];
  upcomingIn: number; // cents
  upcomingOut: number; // cents
  projected: number; // cents
  lowest: BalancePoint;
  firstNegativeDate?: Date;
  monthChange: number; // cents
};

export function getAccountForecast(ledger: AccountLedger, today: Date, horizonEnd: Date): AccountForecast {
  if (!ledger) {
    return {
      current: 0,
      upcoming: [],
      upcomingIn: 0,
      upcomingOut: 0,
      projected: 0,
      lowest: { date: today, balance: 0 },
      firstNegativeDate: undefined,
      monthChange: 0,
    };
  }

  const current = balanceAt(ledger, today);
  const upcoming = ledger.movements.filter(
    m => m.date.getTime() > today.getTime() && m.date.getTime() <= horizonEnd.getTime(),
  );

  let upcomingIn = 0;
  let upcomingOut = 0;
  for (const m of upcoming) {
    if (m.amount > 0) upcomingIn += m.amount;
    else upcomingOut += m.amount;
  }

  const projected = balanceAt(ledger, horizonEnd);

  let lowestBal = current;
  let lowestDate = today;
  let firstNegative: Date | undefined;

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

  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  let lastMonthEnd: Date;
  if (m === 1) lastMonthEnd = new Date(y - 1, 11, 31, 0, 0, 0, 0);
  else {
    const prevMonthLastDay = new Date(y, m - 1, 0).getDate();
    lastMonthEnd = new Date(y, m - 2, prevMonthLastDay, 0, 0, 0, 0);
  }

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

export type DailyBalance = { date: Date; actual?: number; projected?: number };

export function buildDailySeries(ledger: AccountLedger, from: Date, to: Date, today: Date): DailyBalance[] {
  const series: DailyBalance[] = [];
  if (!ledger) return series;
  let d = from;
  while (d.getTime() <= to.getTime()) {
    const bal = balanceAt(ledger, d);
    if (d.getTime() === today.getTime()) {
      series.push({ date: d, actual: bal, projected: bal });
    } else if (d.getTime() < today.getTime()) {
      series.push({ date: d, actual: bal });
    } else {
      series.push({ date: d, projected: bal });
    }
    d = addDays(d, 1);
  }
  return series;
}
