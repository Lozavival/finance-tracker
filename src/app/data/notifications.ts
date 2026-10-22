import { type SupportedCurrency, type TranslationParams } from '@/i18n/types';
import { type SmartFinancialSignal } from './analytics';
import { type MonthlyBudgetSummary } from './goals';

export type NotificationLevel = 'success' | 'info' | 'warning' | 'error';
export type AlertSeverity = SmartFinancialSignal['severity']; // 'info' | 'warning' | 'critical' | 'success'

export type AlertKind =
  | 'budget-threshold'
  | 'budget-streak'
  | 'spending-spike'
  | 'upcoming-bill'
  | 'deficit'
  | 'savings-milestone'
  | 'system';

export type ActivityEntry = {
  id: string;
  level: NotificationLevel;
  messageKey: string;
  params?: TranslationParams;
  createdAt: string; // ISO
  readAt?: string; // ISO
};

export type FinancialAlert = {
  key: string; // period-scoped dedupe key, e.g. "spike-food:2026-10"
  kind: AlertKind;
  severity: AlertSeverity;
  titleKey: string;
  descriptionKey: string;
  params: TranslationParams;
  amountCents?: number;
  currency?: SupportedCurrency;
  actionPage?: 'goals' | 'transactions' | 'accounts';
};

export type AlertState = {
  firstSeenAt: string; // ISO
  readAt?: string; // ISO
  dismissedAt?: string; // ISO
};

export type NotificationPreferences = {
  successToasts: boolean;
  budgetWarningPercent: number; // 50-99, default 85
  alertKinds: Record<Exclude<AlertKind, 'system'>, boolean>;
};

export const DEFAULT_BUDGET_WARNING_PERCENT = 85;
export const MIN_BUDGET_WARNING_PERCENT = 50;
export const MAX_BUDGET_WARNING_PERCENT = 99;
export const BUDGET_CRITICAL_PERCENT = 100;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  successToasts: true,
  budgetWarningPercent: DEFAULT_BUDGET_WARNING_PERCENT,
  alertKinds: {
    'budget-threshold': true,
    'budget-streak': true,
    'spending-spike': true,
    'upcoming-bill': true,
    deficit: true,
    'savings-milestone': true,
  },
};

export const ACTIVITY_LOG_LIMIT = 50;
export const ACTIVITY_RETENTION_DAYS = 30;
export const ALERT_STATE_RETENTION_DAYS = 90;

export function periodKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function signalAlertKey(signal: SmartFinancialSignal, today: Date): string {
  if (signal.type === 'upcoming-bill') {
    return signal.id;
  }
  return `${signal.id}:${periodKey(today)}`;
}

export function signalTypeToAlertKind(type: SmartFinancialSignal['type']): AlertKind {
  switch (type) {
    case 'streak':
      return 'budget-streak';
    case 'spike':
      return 'spending-spike';
    case 'upcoming-bill':
      return 'upcoming-bill';
    case 'deficit-warning':
      return 'deficit';
    case 'savings-milestone':
      return 'savings-milestone';
    default:
      return 'system';
  }
}

export function signalToAlert(signal: SmartFinancialSignal, today: Date): FinancialAlert {
  return {
    key: signalAlertKey(signal, today),
    kind: signalTypeToAlertKind(signal.type),
    severity: signal.severity,
    titleKey: signal.titleKey,
    descriptionKey: signal.descriptionKey,
    params: signal.params,
    amountCents: signal.amountCents,
    currency: signal.currency,
    actionPage: signal.actionPage,
  };
}

export function formatSignalParams(
  signal: { params: TranslationParams; amountCents?: number; currency?: SupportedCurrency },
  formatCents: (cents: number, currency?: SupportedCurrency) => string,
): TranslationParams {
  if (signal.amountCents !== undefined) {
    return {
      ...signal.params,
      amount: formatCents(signal.amountCents, signal.currency),
    };
  }
  return signal.params;
}

export function buildBudgetThresholdAlerts(
  summary: MonthlyBudgetSummary,
  warningPercent: number,
  today: Date,
): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  const currentPeriod = periodKey(today);
  const clampedWarning = Math.max(MIN_BUDGET_WARNING_PERCENT, Math.min(MAX_BUDGET_WARNING_PERCENT, warningPercent));

  for (const cat of summary.categories) {
    if (cat.budgeted <= 0) continue;
    const pct = cat.percentageUsed;

    if (pct >= BUDGET_CRITICAL_PERCENT) {
      alerts.push({
        key: `budget-${cat.category.id}:${currentPeriod}:critical`,
        kind: 'budget-threshold',
        severity: 'critical',
        titleKey: 'notifications.alerts.budgetExceededTitle',
        descriptionKey: 'notifications.alerts.budgetExceededDesc',
        params: {
          category: cat.category.name,
          percent: Math.round(pct),
        },
        actionPage: 'goals',
      });
    } else if (pct >= clampedWarning) {
      alerts.push({
        key: `budget-${cat.category.id}:${currentPeriod}:warning`,
        kind: 'budget-threshold',
        severity: 'warning',
        titleKey: 'notifications.alerts.budgetWarningTitle',
        descriptionKey: 'notifications.alerts.budgetWarningDesc',
        params: {
          category: cat.category.name,
          percent: Math.round(pct),
          threshold: clampedWarning,
        },
        actionPage: 'goals',
      });
    }
  }

  return alerts;
}

const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
  critical: 4,
  warning: 3,
  info: 2,
  success: 1,
};

export function buildFinancialAlerts(input: {
  signals: SmartFinancialSignal[];
  budget: MonthlyBudgetSummary;
  prefs: NotificationPreferences;
  today: Date;
}): FinancialAlert[] {
  const { signals, budget, prefs, today } = input;
  const list: FinancialAlert[] = [];

  for (const s of signals) {
    const alert = signalToAlert(s, today);
    if (alert.kind === 'system' || prefs.alertKinds[alert.kind as Exclude<AlertKind, 'system'>]) {
      list.push(alert);
    }
  }

  if (prefs.alertKinds['budget-threshold']) {
    const budgetAlerts = buildBudgetThresholdAlerts(budget, prefs.budgetWarningPercent, today);
    list.push(...budgetAlerts);
  }

  // Deduplicate by key
  const uniqueMap = new Map<string, FinancialAlert>();
  for (const a of list) {
    uniqueMap.set(a.key, a);
  }

  const result = Array.from(uniqueMap.values());
  result.sort((a, b) => {
    const weightDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
    if (weightDiff !== 0) return weightDiff;
    return a.key.localeCompare(b.key);
  });

  return result;
}

export function appendActivity(log: ActivityEntry[], entry: ActivityEntry, now: Date): ActivityEntry[] {
  const cutoffTime = now.getTime() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const filtered = log.filter(item => {
    const itemTime = new Date(item.createdAt).getTime();
    return Number.isFinite(itemTime) && itemTime >= cutoffTime;
  });

  const next = [entry, ...filtered];
  return next.slice(0, ACTIVITY_LOG_LIMIT);
}

export function pruneAlertState(state: Record<string, AlertState>, now: Date): Record<string, AlertState> {
  const cutoffTime = now.getTime() - ALERT_STATE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const next: Record<string, AlertState> = {};

  for (const [key, val] of Object.entries(state)) {
    const itemTime = new Date(val.firstSeenAt).getTime();
    if (Number.isFinite(itemTime) && itemTime >= cutoffTime) {
      next[key] = val;
    }
  }

  return next;
}
