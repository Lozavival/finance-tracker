export function getToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function clampedDate(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const targetDay = Math.min(day, lastDay);
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(targetDay).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addMonthsClamped(dateString: string, monthsToAdd: number): string {
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  month += monthsToAdd;
  year += Math.floor((month - 1) / 12);
  month = ((month - 1) % 12) + 1;
  if (month <= 0) {
    month += 12;
  }

  return clampedDate(year, month, day);
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  const d1 = new Date(`${from}T12:00:00`);
  const d2 = new Date(`${to}T12:00:00`);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
