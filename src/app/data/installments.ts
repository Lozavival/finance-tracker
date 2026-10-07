import type { Transaction, TransactionDraft, InstallmentInfo } from "./transactions";

export const MAX_INSTALLMENTS = 48;

/** Splits a total into `count` cent-exact parts; remainder goes to the first part. */
export function splitInstallmentValues(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i === 0 ? remainder : 0)) / 100);
}

/** Adds months keeping the day, clamped to the target month's last day. */
export function addMonthsClamped(dateString: string, monthsToAdd: number): string {
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  month += monthsToAdd;
  year += Math.floor(month / 12);
  month = month % 12;
  
  // Get last day of the target month
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);

  const y = String(year);
  const m = String(month + 1).padStart(2, "0");
  const d = String(targetDay).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function buildInstallments(
  draft: Extract<TransactionDraft, { kind: "installments" }>,
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

export function findInstallmentSeries(
  transactions: Transaction[],
  tx: Transaction,
): Transaction[] | null {
  if (!tx.installment) return null;
  const series = transactions.filter(
    (t) => t.installment?.groupId === tx.installment!.groupId
  );
  // Sort by installment number
  return series.sort((a, b) => a.installment!.number - b.installment!.number);
}

export function formatInstallmentLabel(info: InstallmentInfo) {
  return `${info.number}/${info.total}`;
}

