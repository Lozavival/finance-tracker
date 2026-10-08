import { type Transaction, type Account } from './transactions';
import { clampedDate } from './dates';
import { type CreditCardConfig, ACCOUNT_DETAILS } from './accounts';

export type StatementStatus = 'open' | 'closed' | 'paid';

export type CardStatement = {
  id: string;
  account: Account;
  cardName: string;
  periodStart: string;
  closingDate: string;
  dueDate: string;
  items: Transaction[];
  charges: number; // cents
  credits: number; // cents
  total: number; // cents
  status: StatementStatus;
};

export function getStatementDates(card: CreditCardConfig, purchaseDate: string) {
  const [y, m, d] = purchaseDate.split('-').map(Number);

  let closeY = y;
  let closeM = m;
  if (d > card.closingDay) {
    closeM += 1;
    if (closeM > 12) {
      closeM = 1;
      closeY += 1;
    }
  }

  const closingDate = clampedDate(closeY, closeM, card.closingDay);

  let dueY = closeY;
  let dueM = closeM;
  if (card.dueDay <= card.closingDay) {
    dueM += 1;
    if (dueM > 12) {
      dueM = 1;
      dueY += 1;
    }
  }
  const dueDate = clampedDate(dueY, dueM, card.dueDay);

  let startM = closeM - 1;
  let startY = closeY;
  if (startM < 1) {
    startM = 12;
    startY -= 1;
  }
  const periodStartClamped = clampedDate(startY, startM, card.closingDay);
  const periodStartDate = new Date(`${periodStartClamped}T12:00:00`);
  periodStartDate.setDate(periodStartDate.getDate() + 1);
  const realPeriodStart = `${periodStartDate.getFullYear()}-${String(periodStartDate.getMonth() + 1).padStart(2, '0')}-${String(periodStartDate.getDate()).padStart(2, '0')}`;

  return { periodStart: realPeriodStart, closingDate, dueDate };
}

export function buildStatements(transactions: Transaction[], today: string): CardStatement[] {
  const statementMap = new Map<string, CardStatement>();

  for (const tx of transactions) {
    if (tx.paymentMethod !== 'Credit card') continue;

    const accountDetails = ACCOUNT_DETAILS[tx.account];
    if (!accountDetails.card) continue;

    const dates = getStatementDates(accountDetails.card, tx.date);
    const id = `${tx.account}:${dates.closingDate}`;

    if (!statementMap.has(id)) {
      let status: StatementStatus = 'open';
      if (today >= dates.dueDate) status = 'paid';
      else if (today > dates.closingDate) status = 'closed';

      statementMap.set(id, {
        id,
        account: tx.account,
        cardName: accountDetails.card.name,
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
    const cents = Math.round(tx.value * 100);
    if (tx.direction === 'expense') {
      stmt.charges += cents;
    } else {
      stmt.credits += cents;
    }
  }

  for (const stmt of statementMap.values()) {
    stmt.total = Math.max(0, stmt.charges - stmt.credits);
    stmt.items.sort((a, b) => a.date.localeCompare(b.date));
  }

  return Array.from(statementMap.values()).sort((a, b) => a.closingDate.localeCompare(b.closingDate));
}

export function getCardUsage(statements: CardStatement[], account: Account) {
  const details = ACCOUNT_DETAILS[account];
  if (!details || !details.card) return { limit: 0, used: 0, available: 0 };

  const limit = details.card.limit;
  let used = 0;
  for (const stmt of statements) {
    if (stmt.account === account && stmt.status !== 'paid') {
      used += stmt.total;
    }
  }
  return { limit, used, available: Math.max(0, limit - used) };
}
