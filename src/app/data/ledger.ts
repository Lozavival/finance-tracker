import { type SupportedCurrency } from '@/i18n/types';
import { type Transaction } from './transactions';
import { type CardStatement } from './cardStatements';
import {
  type Settings,
  findAccount,
  isCreditCard,
  TRANSFER_TYPE_ID,
  getAccountCurrencies,
  getAccountOpeningBalance,
} from './settings';
import { addDays, formatShort } from './dates';
import { logger } from '../lib/logger';

const ledgerLogger = logger.child('Ledger');

export type CashMovementKind = 'opening' | 'transaction' | 'card-bill';

export type CashMovement = {
  id: string;
  accountId: string;
  account: string; // compatibility alias
  currency: SupportedCurrency;
  date: Date;
  amount: number; // cents in currency
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
  historicalRollups?: Record<string, number>,
  rollupDate?: Date,
): CashMovement[] {
  const movements: CashMovement[] = [];

  for (const acc of settings.accounts) {
    const currencies = getAccountCurrencies(acc);
    for (const curr of currencies) {
      const openingAmount = getAccountOpeningBalance(acc, curr);
      movements.push({
        id: `opening-${acc.id}-${curr}`,
        accountId: acc.id,
        account: acc.id,
        currency: curr,
        date: acc.openingDate,
        amount: openingAmount,
        kind: 'opening',
        description: 'Opening Balance',
        isTransfer: false,
        isEstimate: false,
      });

      const rollupDelta = historicalRollups?.[`${acc.id}:${curr}`] ?? 0;
      if (rollupDelta !== 0) {
        movements.push({
          id: `rollup-${acc.id}-${curr}`,
          accountId: acc.id,
          account: acc.id,
          currency: curr,
          date: rollupDate && rollupDate.getTime() > acc.openingDate.getTime() ? rollupDate : acc.openingDate,
          amount: rollupDelta,
          kind: 'opening',
          description: 'Historical Balance Rollup',
          isTransfer: false,
          isEstimate: false,
        });
      }
    }
  }

  for (const tx of transactions) {
    if (isCreditCard(settings, tx.paymentMethodId)) continue;
    const isTransfer = tx.typeId === TRANSFER_TYPE_ID && !!tx.transferId;
    const amount = tx.value * (tx.direction === 'income' ? 1 : -1);

    movements.push({
      id: `tx-${tx.id}`,
      accountId: tx.accountId,
      account: tx.accountId,
      currency: tx.currency,
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
      currency: stmt.currency,
      date: stmt.dueDate,
      amount: -stmt.total,
      kind: 'card-bill',
      description: `${stmt.cardName} — ${formatShort(stmt.closingDate)} bill`,
      isTransfer: false,
      isEstimate: stmt.status === 'open',
      statementId: stmt.id,
    });
  }

  const validMovements = movements.filter(m => {
    const acc = findAccount(settings, m.accountId);
    return acc ? m.date.getTime() >= acc.openingDate.getTime() : false;
  });

  ledgerLogger.debug('buildCashMovements generated valid cash movements', {
    totalMovements: validMovements.length,
    accountsCount: settings.accounts.length,
  });

  return validMovements;
}

export type BalancePoint = { date: Date; balance: number };

export type AccountLedger = {
  accountId: string;
  account: string; // compatibility alias
  currency: SupportedCurrency;
  movements: CashMovement[];
  points: BalancePoint[];
};

export function buildLedgers(movements: CashMovement[], settings: Settings): Record<string, AccountLedger> {
  const ledgers: Record<string, AccountLedger> = {};

  for (const acc of settings.accounts) {
    const currencies = getAccountCurrencies(acc);
    for (const curr of currencies) {
      const pocketKey = `${acc.id}:${curr}`;
      ledgers[pocketKey] = {
        accountId: acc.id,
        account: acc.id,
        currency: curr,
        movements: [],
        points: [],
      };
    }
    // Alias root accountId to primary currency pocket for seamless backward compatibility
    const primary = currencies[0];
    if (primary) {
      ledgers[acc.id] = ledgers[`${acc.id}:${primary}`];
    }
  }

  const sortedMovements = [...movements].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id),
  );

  for (const m of sortedMovements) {
    const pocketKey = `${m.accountId}:${m.currency}`;
    if (ledgers[pocketKey]) {
      ledgers[pocketKey].movements.push(m);
    } else if (ledgers[m.accountId]) {
      ledgers[m.accountId].movements.push(m);
    }
  }

  const distinctLedgers = new Set(Object.values(ledgers));
  for (const ledger of distinctLedgers) {
    let balance = 0;
    const pointsMap = new Map<number, { date: Date; balance: number }>();
    for (const m of ledger.movements) {
      balance += m.amount;
      pointsMap.set(m.date.getTime(), { date: m.date, balance });
    }
    ledger.points = Array.from(pointsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  ledgerLogger.debug('buildLedgers built account ledgers', {
    distinctLedgersCount: distinctLedgers.size,
  });

  return ledgers;
}

export function getAccountLedger(
  ledgers: Record<string, AccountLedger>,
  accountId: string,
  currency?: SupportedCurrency,
): AccountLedger | undefined {
  if (currency) {
    const key = `${accountId}:${currency}`;
    if (ledgers[key]) return ledgers[key];
  }
  return ledgers[accountId];
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
