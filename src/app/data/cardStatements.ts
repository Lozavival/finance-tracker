import { type SupportedCurrency } from '@/i18n/types';
import { type Transaction } from './transactions';
import { type CreditCardConfig, type Settings, findAccount, isCreditCard } from './settings';
import { toLocalDateString } from './dates';
import { logger } from '../lib/logger';

const statementLogger = logger.child('CardStatements');

export type StatementStatus = 'open' | 'closed' | 'paid';

export type CardStatement = {
  id: string;
  accountId: string;
  account: string; // compatibility alias with accountId
  cardName: string;
  currency: SupportedCurrency;
  periodStart: Date;
  closingDate: Date;
  dueDate: Date;
  items: Transaction[];
  charges: number; // cents
  credits: number; // cents
  total: number; // cents
  status: StatementStatus;
};

export function getStatementDates(card: CreditCardConfig, purchaseDate: Date) {
  const y = purchaseDate.getFullYear();
  const m = purchaseDate.getMonth() + 1;
  const d = purchaseDate.getDate();

  let closeY = y;
  let closeM = m;
  if (d > card.closingDay) {
    closeM += 1;
    if (closeM > 12) {
      closeM = 1;
      closeY += 1;
    }
  }

  const closingDayClamped = Math.min(card.closingDay, new Date(closeY, closeM, 0).getDate());
  const closingDate = new Date(closeY, closeM - 1, closingDayClamped, 0, 0, 0, 0);

  let dueY = closeY;
  let dueM = closeM;
  if (card.dueDay <= card.closingDay) {
    dueM += 1;
    if (dueM > 12) {
      dueM = 1;
      dueY += 1;
    }
  }
  const dueDayClamped = Math.min(card.dueDay, new Date(dueY, dueM, 0).getDate());
  const dueDate = new Date(dueY, dueM - 1, dueDayClamped, 0, 0, 0, 0);

  let startM = closeM - 1;
  let startY = closeY;
  if (startM < 1) {
    startM = 12;
    startY -= 1;
  }
  const startDayClamped = Math.min(card.closingDay, new Date(startY, startM, 0).getDate());
  const periodStart = new Date(startY, startM - 1, startDayClamped, 0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() + 1);

  return { periodStart, closingDate, dueDate };
}

export function buildStatements(transactions: Transaction[], settings: Settings, today: Date): CardStatement[] {
  const statementMap = new Map<string, CardStatement>();

  for (const tx of transactions) {
    if (!isCreditCard(settings, tx.paymentMethodId)) continue;

    const accountDetails = findAccount(settings, tx.accountId);
    if (!accountDetails || !accountDetails.card) {
      statementLogger.warn('Credit card transaction skipped for statements: account missing card config', {
        txId: tx.id,
        accountId: tx.accountId,
        paymentMethodId: tx.paymentMethodId,
      });
      continue;
    }

    const dates = getStatementDates(accountDetails.card, tx.date);
    const id = `${tx.accountId}:${toLocalDateString(dates.closingDate)}`;

    if (!statementMap.has(id)) {
      let status: StatementStatus = 'open';
      if (today.getTime() >= dates.dueDate.getTime()) status = 'paid';
      else if (today.getTime() > dates.closingDate.getTime()) status = 'closed';

      statementMap.set(id, {
        id,
        accountId: tx.accountId,
        account: tx.accountId,
        cardName: accountDetails.card.name,
        currency: tx.currency,
        periodStart: dates.periodStart,
        closingDate: dates.closingDate,
        dueDate: dates.dueDate,
        items: [],
        charges: 0,
        credits: 0,
        total: 0,
        status,
      });
    }

    const stmt = statementMap.get(id)!;
    stmt.items.push(tx);
    const cents = tx.value;
    if (tx.direction === 'expense') {
      stmt.charges += cents;
    } else {
      stmt.credits += cents;
    }
  }

  for (const stmt of statementMap.values()) {
    stmt.total = Math.max(0, stmt.charges - stmt.credits);
    stmt.items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const result = Array.from(statementMap.values()).sort((a, b) => a.closingDate.getTime() - b.closingDate.getTime());
  statementLogger.debug('buildStatements generated statements', {
    statementsCount: result.length,
    inputTxCount: transactions.length,
  });
  return result;
}

export function getCardUsage(statements: CardStatement[], accountId: string, settings: Settings) {
  const details = findAccount(settings, accountId);
  if (!details || !details.card) return { limit: 0, used: 0, available: 0 };

  const limit = details.card.limit;
  let used = 0;
  for (const stmt of statements) {
    if (stmt.accountId === accountId && stmt.status !== 'paid') {
      used += stmt.total;
    }
  }
  return { limit, used, available: Math.max(0, limit - used) };
}
