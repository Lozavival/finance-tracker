import { addMonthsClamped } from './dates';
import type { Transaction, TransactionDraft, InstallmentInfo } from './transactions';

export const MAX_INSTALLMENTS = 48;

/** Splits a total (in integer cents) into `count` cent-exact parts; remainder goes to the first part. */
export function splitInstallmentValues(totalCents: number, count: number): number[] {
  const cents = Math.round(totalCents);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => base + (i === 0 ? remainder : 0));
}

/** Adds months keeping the day, clamped to the target month's last day. */

export function buildInstallments(
  draft: Extract<TransactionDraft, { kind: 'installments' }>,
  groupId: string,
  ids: string[],
): Transaction[] {
  const values = splitInstallmentValues(draft.totalValue, draft.count);
  return values.map((value, i) => ({
    ...draft.transaction,
    id: ids[i],
    date: addMonthsClamped(draft.firstDate, i),
    value,
    installment: { groupId, number: i + 1, total: draft.count },
  }));
}

export function findInstallmentSeries(transactions: Transaction[], tx: Transaction): Transaction[] | null {
  if (!tx.installment) return null;
  const series = transactions.filter(t => t.installment?.groupId === tx.installment!.groupId);
  // Sort by installment number
  return series.sort((a, b) => a.installment!.number - b.installment!.number);
}

export function formatInstallmentLabel(info: InstallmentInfo) {
  if (info.number === -1) {
    return `${info.total} Installments`;
  }
  return `${info.number}/${info.total}`;
}
