import { describe, it, expect } from 'vitest';
import {
  parseLocalDate,
  toLocalDateString,
  getToday,
  isBefore,
  isAfter,
  isSameDay,
  isBetween,
  addDays,
  addMonthsClamped,
  formatShort,
  formatRowDate,
  formatMonthYear,
  formatFull,
  resolveUpcomingHorizon,
} from '@/data/dates';

describe('Dates Engine', () => {
  describe('parseLocalDate and toLocalDateString', () => {
    it('parses valid YYYY-MM-DD string into local midnight Date', () => {
      const date = parseLocalDate('2026-03-15');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(2); // 0-indexed March
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });

    it('round-trips correctly through toLocalDateString', () => {
      const original = '2026-12-31';
      const parsed = parseLocalDate(original);
      expect(toLocalDateString(parsed)).toBe(original);
    });

    it('throws RangeError for invalid format or out-of-range dates', () => {
      expect(() => parseLocalDate('')).toThrow(RangeError);
      expect(() => parseLocalDate('2026/03/15')).toThrow(RangeError);
      expect(() => parseLocalDate('invalid-date')).toThrow(RangeError);
      // Feb 30 does not exist
      expect(() => parseLocalDate('2026-02-30')).toThrow(RangeError);
      // Feb 29 on non-leap year 2025
      expect(() => parseLocalDate('2025-02-29')).toThrow(RangeError);
    });

    it('correctly accepts leap year date 2024-02-29', () => {
      const leapDay = parseLocalDate('2024-02-29');
      expect(toLocalDateString(leapDay)).toBe('2024-02-29');
    });
  });

  describe('comparisons and manipulation', () => {
    it('accurately compares dates', () => {
      const d1 = parseLocalDate('2026-03-01');
      const d2 = parseLocalDate('2026-03-05');
      const d3 = parseLocalDate('2026-03-05');

      expect(isBefore(d1, d2)).toBe(true);
      expect(isBefore(d2, d1)).toBe(false);

      expect(isAfter(d2, d1)).toBe(true);
      expect(isAfter(d1, d2)).toBe(false);

      expect(isSameDay(d2, d3)).toBe(true);
      expect(isSameDay(d1, d2)).toBe(false);

      expect(isBetween(d2, d1, parseLocalDate('2026-03-10'))).toBe(true);
      expect(isBetween(parseLocalDate('2026-03-15'), d1, d2)).toBe(false);
    });

    it('adds days correctly across month boundaries', () => {
      const start = parseLocalDate('2026-02-26');
      const nextWeek = addDays(start, 5); // 2026 is non-leap: Feb has 28 days -> Mar 3
      expect(toLocalDateString(nextWeek)).toBe('2026-03-03');
    });

    it('clamps month addition to end of shorter months', () => {
      // Jan 31 + 1 month in non-leap 2026 -> Feb 28
      const jan31 = parseLocalDate('2026-01-31');
      const clampedFeb = addMonthsClamped(jan31, 1);
      expect(toLocalDateString(clampedFeb)).toBe('2026-02-28');

      // Jan 31 + 1 month in leap year 2024 -> Feb 29
      const jan31Leap = parseLocalDate('2024-01-31');
      const clampedFebLeap = addMonthsClamped(jan31Leap, 1);
      expect(toLocalDateString(clampedFebLeap)).toBe('2024-02-29');

      // Aug 31 - 2 months -> June 30 (June has 30 days)
      const aug31 = parseLocalDate('2026-08-31');
      const clampedJune = addMonthsClamped(aug31, -2);
      expect(toLocalDateString(clampedJune)).toBe('2026-06-30');
    });

    it('gets today at midnight', () => {
      const today = getToday();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
    });
  });

  describe('formatting helpers', () => {
    const testDate = parseLocalDate('2026-03-15');

    it('formats short, row date, month year, and full date', () => {
      expect(formatShort(testDate, 'en-US')).toBe('Mar 15');
      expect(formatRowDate(testDate, 'en-US')).toContain('Mar 15');
      expect(formatMonthYear(testDate, 'en-US')).toBe('March 2026');
      expect(formatFull(testDate, 'en-US')).toBe('Mar 15, 2026');
    });
  });

  describe('resolveUpcomingHorizon', () => {
    const today = parseLocalDate('2026-03-10');

    it('resolves preset days', () => {
      const horizon = resolveUpcomingHorizon({ kind: 'preset', days: 14 }, today);
      expect(toLocalDateString(horizon)).toBe('2026-03-24');
    });

    it('resolves end-of-month', () => {
      const horizon = resolveUpcomingHorizon({ kind: 'end-of-month' }, today);
      expect(toLocalDateString(horizon)).toBe('2026-03-31');
    });

    it('resolves custom horizon or all', () => {
      const customDate = parseLocalDate('2026-06-01');
      expect(toLocalDateString(resolveUpcomingHorizon({ kind: 'custom', until: customDate }, today))).toBe(
        '2026-06-01',
      );
      expect(toLocalDateString(resolveUpcomingHorizon({ kind: 'all' }, today))).toBe('2030-01-01');
    });
  });
});
