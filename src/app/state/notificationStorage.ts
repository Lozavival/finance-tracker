import {
  type NotificationPreferences,
  type ActivityEntry,
  type AlertState,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/data/notifications';

const PREFS_STORAGE_KEY = 'finance-tracker_notifications_prefs';
const ACTIVITY_STORAGE_KEY = 'finance-tracker_notifications_activity';
const ALERTS_STORAGE_KEY = 'finance-tracker_notifications_alerts';

export function loadStoredPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      successToasts:
        typeof parsed.successToasts === 'boolean'
          ? parsed.successToasts
          : DEFAULT_NOTIFICATION_PREFERENCES.successToasts,
      budgetWarningPercent:
        typeof parsed.budgetWarningPercent === 'number' && Number.isFinite(parsed.budgetWarningPercent)
          ? parsed.budgetWarningPercent
          : DEFAULT_NOTIFICATION_PREFERENCES.budgetWarningPercent,
      alertKinds: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.alertKinds,
        ...(parsed.alertKinds || {}),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveStoredPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota or access errors
  }
}

export function loadStoredActivity(): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as ActivityEntry[];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredActivity(activity: ActivityEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
  } catch {
    // Ignore storage quota or access errors
  }
}

export function loadStoredAlertState(): Record<string, AlertState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, AlertState>;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveStoredAlertState(state: Record<string, AlertState>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or access errors
  }
}
