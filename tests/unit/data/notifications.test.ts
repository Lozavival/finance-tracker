import { describe, it, expect } from 'vitest';
import {
  periodKey,
  signalAlertKey,
  signalToAlert,
  buildBudgetThresholdAlerts,
  buildFinancialAlerts,
  appendActivity,
  pruneAlertState,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type ActivityEntry,
  type AlertState,
} from '@/data/notifications';
import { parseLocalDate } from '@/data/dates';
import type { SmartFinancialSignal } from '@/data/analytics';
import type { MonthlyBudgetSummary } from '@/data/goals';

describe('Notifications & Financial Alerts Engine', () => {
  const today = parseLocalDate('2026-03-15');

  describe('periodKey and signalAlertKey', () => {
    it('formats YYYY-MM period key accurately', () => {
      expect(periodKey(today)).toBe('2026-03');
    });

    it('scopes recurring signals with periodKey but leaves upcoming bills scoped to statement id', () => {
      const spikeSignal: SmartFinancialSignal = {
        id: 'spike-food',
        type: 'spike',
        severity: 'warning',
        titleKey: 'title',
        descriptionKey: 'desc',
        params: {},
      };
      expect(signalAlertKey(spikeSignal, today)).toBe('spike-food:2026-03');

      const billSignal: SmartFinancialSignal = {
        id: 'stmt-cc-1',
        type: 'upcoming-bill',
        severity: 'critical',
        titleKey: 'title',
        descriptionKey: 'desc',
        params: {},
      };
      expect(signalAlertKey(billSignal, today)).toBe('stmt-cc-1');
    });
  });

  describe('buildBudgetThresholdAlerts', () => {
    const mockBudgetSummary: MonthlyBudgetSummary = {
      monthDate: today,
      actualIncome: 500000,
      budgetBase: 500000,
      totalBudgeted: 500000,
      totalExpenses: 460000,
      remainingBalance: 40000,
      remainingBudget: 40000,
      usedPercentage: 92,
      categories: [
        {
          category: { id: 'cat-ok', name: 'Leisure', percentage: 20, color: 'blue', icon: 'Sparkles' },
          budgeted: 100000,
          spent: 50000,
          remaining: 50000,
          percentageUsed: 50,
          txCount: 2,
          transactions: [],
        },
        {
          category: { id: 'cat-warn', name: 'Groceries', percentage: 40, color: 'emerald', icon: 'Utensils' },
          budgeted: 200000,
          spent: 180000,
          remaining: 20000,
          percentageUsed: 90, // >= 85% default warning
          txCount: 8,
          transactions: [],
        },
        {
          category: { id: 'cat-crit', name: 'Housing', percentage: 40, color: 'purple', icon: 'Home' },
          budgeted: 200000,
          spent: 230000,
          remaining: -30000,
          percentageUsed: 115, // >= 100% critical
          txCount: 3,
          transactions: [],
        },
      ],
    };

    it('generates warning and critical alerts based on configured threshold', () => {
      const alerts = buildBudgetThresholdAlerts(mockBudgetSummary, 85, today);
      expect(alerts).toHaveLength(2);

      const warnAlert = alerts.find(a => a.severity === 'warning');
      expect(warnAlert).toBeDefined();
      expect(warnAlert!.key).toBe('budget-cat-warn:2026-03:warning');
      expect(warnAlert!.params.percent).toBe(90);

      const critAlert = alerts.find(a => a.severity === 'critical');
      expect(critAlert).toBeDefined();
      expect(critAlert!.key).toBe('budget-cat-crit:2026-03:critical');
      expect(critAlert!.params.percent).toBe(115);
    });

    it('clamps warning threshold between 50 and 99', () => {
      // With threshold clamped to 50, leisure (at 50%) should trigger warning
      const alertsLow = buildBudgetThresholdAlerts(mockBudgetSummary, 10, today); // clamped to 50
      expect(alertsLow.some(a => a.key.includes('cat-ok'))).toBe(true);

      // With threshold clamped to 99, groceries at 90% should NOT trigger warning
      const alertsHigh = buildBudgetThresholdAlerts(mockBudgetSummary, 150, today); // clamped to 99
      expect(alertsHigh.some(a => a.key.includes('cat-warn'))).toBe(false);
    });
  });

  describe('buildFinancialAlerts', () => {
    it('sorts alerts by severity weight (critical > warning > info > success)', () => {
      const signals: SmartFinancialSignal[] = [
        {
          id: 'sig-info',
          type: 'savings-milestone',
          severity: 'info',
          titleKey: 'title',
          descriptionKey: 'desc',
          params: {},
        },
        {
          id: 'sig-crit',
          type: 'upcoming-bill',
          severity: 'critical',
          titleKey: 'title',
          descriptionKey: 'desc',
          params: {},
        },
        {
          id: 'sig-warn',
          type: 'spike',
          severity: 'warning',
          titleKey: 'title',
          descriptionKey: 'desc',
          params: {},
        },
      ];

      const emptyBudget: MonthlyBudgetSummary = {
        monthDate: today,
        actualIncome: 0,
        budgetBase: 0,
        totalBudgeted: 0,
        totalExpenses: 0,
        remainingBalance: 0,
        remainingBudget: 0,
        usedPercentage: 0,
        categories: [],
      };

      const alerts = buildFinancialAlerts({
        signals,
        budget: emptyBudget,
        prefs: DEFAULT_NOTIFICATION_PREFERENCES,
        today,
      });

      expect(alerts.map(a => a.severity)).toEqual(['critical', 'warning', 'info']);
    });
  });

  describe('appendActivity', () => {
    it('prepends new entry, limits to 50 entries, and filters items older than 30 days', () => {
      const now = new Date('2026-03-31T12:00:00.000Z');
      const recentDate = new Date('2026-03-20T12:00:00.000Z').toISOString();
      const oldDate = new Date('2026-02-01T12:00:00.000Z').toISOString(); // > 30 days

      const existing: ActivityEntry[] = [
        { id: '1', level: 'info', messageKey: 'msg.1', createdAt: recentDate },
        { id: '2', level: 'info', messageKey: 'msg.2', createdAt: oldDate },
      ];

      const newEntry: ActivityEntry = {
        id: 'new',
        level: 'success',
        messageKey: 'msg.new',
        createdAt: now.toISOString(),
      };

      const result = appendActivity(existing, newEntry, now);
      expect(result).toHaveLength(2); // 'new' + '1' ('2' was pruned)
      expect(result[0].id).toBe('new');
      expect(result[1].id).toBe('1');
    });
  });

  describe('pruneAlertState', () => {
    it('prunes alert state records older than 90 days', () => {
      const now = new Date('2026-04-01T00:00:00.000Z');
      const state: Record<string, AlertState> = {
        active: { firstSeenAt: new Date('2026-03-01T00:00:00.000Z').toISOString() },
        stale: { firstSeenAt: new Date('2025-11-01T00:00:00.000Z').toISOString() }, // > 90 days
      };

      const pruned = pruneAlertState(state, now);
      expect(pruned.active).toBeDefined();
      expect(pruned.stale).toBeUndefined();
    });
  });
});

