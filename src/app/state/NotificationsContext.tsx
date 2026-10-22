import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useI18n, type TranslationKey } from '@/i18n';
import { type TranslationParams } from '@/i18n/types';
import {
  type ActivityEntry,
  type AlertState,
  type NotificationPreferences,
  appendActivity,
  pruneAlertState,
} from '@/data/notifications';
import {
  loadStoredPreferences,
  saveStoredPreferences,
  loadStoredActivity,
  saveStoredActivity,
  loadStoredAlertState,
  saveStoredAlertState,
} from './notificationStorage';

export type NotifyOptions = {
  id?: string;
  params?: TranslationParams;
  log?: boolean;
};

export type UndoableOptions = {
  id: string;
  messageKey: TranslationKey;
  params?: TranslationParams;
  onUndo: () => void;
  durationMs?: number;
};

export type NotificationsContextValue = {
  notify: {
    success: (key: TranslationKey, opts?: NotifyOptions) => void;
    info: (key: TranslationKey, opts?: NotifyOptions) => void;
    error: (key: TranslationKey, opts?: NotifyOptions) => void;
    validation: (key: TranslationKey, opts?: NotifyOptions) => void;
    undoable: (opts: UndoableOptions) => void;
  };
  reportSyncError: (error: unknown) => void;
  registerResync: (fn: () => Promise<void>) => () => void;
  activity: ActivityEntry[];
  clearActivity: () => void;
  markActivityRead: () => void;
  unreadActivityCount: number;
  alertState: Record<string, AlertState>;
  markAlertsRead: (keys: string[]) => void;
  dismissAlert: (key: string) => void;
  observeAlerts: (keys: string[]) => void;
  preferences: NotificationPreferences;
  updatePreferences: (patch: Partial<NotificationPreferences>) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const DEFAULT_TOAST_DURATION = 3000;
const UNDO_TOAST_DURATION = 6000;
const ERROR_TOAST_DURATION = 8000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => loadStoredPreferences());
  const [activity, setActivity] = useState<ActivityEntry[]>(() => loadStoredActivity());
  const [alertState, setAlertState] = useState<Record<string, AlertState>>(() => loadStoredAlertState());

  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  const resyncCallbacksRef = useRef<Set<() => Promise<void>>>(new Set());
  const syncDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    saveStoredPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    saveStoredActivity(activity);
  }, [activity]);

  useEffect(() => {
    saveStoredAlertState(alertState);
  }, [alertState]);

  // Periodic pruning of alertState and activity on mount
  useEffect(() => {
    const now = new Date();
    setAlertState(prev => pruneAlertState(prev, now));
  }, []);

  const logActivity = useCallback((level: ActivityEntry['level'], messageKey: string, params?: TranslationParams) => {
    const entry: ActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      level,
      messageKey,
      params,
      createdAt: new Date().toISOString(),
    };
    setActivity(prev => appendActivity(prev, entry, new Date()));
  }, []);

  const notify = useMemo(
    () => ({
      success: (key: TranslationKey, opts?: NotifyOptions) => {
        if (opts?.log !== false) {
          logActivity('success', key, opts?.params);
        }
        if (prefsRef.current.successToasts) {
          toast.success(t(key, opts?.params), {
            id: opts?.id,
            duration: DEFAULT_TOAST_DURATION,
          });
        }
      },
      info: (key: TranslationKey, opts?: NotifyOptions) => {
        if (opts?.log !== false) {
          logActivity('info', key, opts?.params);
        }
        if (prefsRef.current.successToasts) {
          toast.info(t(key, opts?.params), {
            id: opts?.id,
            duration: DEFAULT_TOAST_DURATION,
          });
        }
      },
      error: (key: TranslationKey, opts?: NotifyOptions) => {
        if (opts?.log !== false) {
          logActivity('error', key, opts?.params);
        }
        toast.error(t(key, opts?.params), {
          id: opts?.id,
          duration: ERROR_TOAST_DURATION,
        });
      },
      validation: (key: TranslationKey, opts?: NotifyOptions) => {
        // Validation toasts are ephemeral and never logged to Activity
        toast.error(t(key, opts?.params), {
          id: opts?.id,
          duration: DEFAULT_TOAST_DURATION,
        });
      },
      undoable: (opts: UndoableOptions) => {
        logActivity('info', opts.messageKey, opts.params);
        const duration = opts.durationMs ?? UNDO_TOAST_DURATION;
        toast(t(opts.messageKey, opts.params), {
          id: opts.id,
          duration,
          action: {
            label: t('notifications.undo'),
            onClick: () => {
              opts.onUndo();
              logActivity('info', 'notifications.ops.undone');
            },
          },
        });
      },
    }),
    [t, logActivity],
  );

  const reportSyncError = useCallback(
    (_error: unknown) => {
      if (syncDebounceTimerRef.current) {
        clearTimeout(syncDebounceTimerRef.current);
      }

      syncDebounceTimerRef.current = setTimeout(() => {
        notify.error('notifications.ops.syncFailed', { id: 'sync-error' });
        // Trigger all registered resync handlers
        for (const resync of resyncCallbacksRef.current) {
          void resync().catch(() => {});
        }
      }, 800);
    },
    [notify],
  );

  const registerResync = useCallback((fn: () => Promise<void>) => {
    resyncCallbacksRef.current.add(fn);
    return () => {
      resyncCallbacksRef.current.delete(fn);
    };
  }, []);

  const clearActivity = useCallback(() => {
    setActivity([]);
  }, []);

  const markActivityRead = useCallback(() => {
    const nowIso = new Date().toISOString();
    setActivity(prev => {
      if (prev.every(a => a.readAt)) return prev;
      return prev.map(a => (a.readAt ? a : { ...a, readAt: nowIso }));
    });
  }, []);

  const unreadActivityCount = useMemo(() => {
    return activity.filter(a => !a.readAt).length;
  }, [activity]);

  const markAlertsRead = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    const nowIso = new Date().toISOString();
    setAlertState(prev => {
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        const existing = next[k];
        if (!existing) {
          next[k] = { firstSeenAt: nowIso, readAt: nowIso };
          changed = true;
        } else if (!existing.readAt) {
          next[k] = { ...existing, readAt: nowIso };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const dismissAlert = useCallback((key: string) => {
    const nowIso = new Date().toISOString();
    setAlertState(prev => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          firstSeenAt: existing?.firstSeenAt || nowIso,
          readAt: existing?.readAt || nowIso,
          dismissedAt: nowIso,
        },
      };
    });
  }, []);

  const observeAlerts = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    const nowIso = new Date().toISOString();
    setAlertState(prev => {
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        if (!next[k]) {
          next[k] = { firstSeenAt: nowIso };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const updatePreferences = useCallback((patch: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...patch,
      alertKinds: {
        ...prev.alertKinds,
        ...(patch.alertKinds || {}),
      },
    }));
  }, []);

  const value = useMemo(
    () => ({
      notify,
      reportSyncError,
      registerResync,
      activity,
      clearActivity,
      markActivityRead,
      unreadActivityCount,
      alertState,
      markAlertsRead,
      dismissAlert,
      observeAlerts,
      preferences,
      updatePreferences,
    }),
    [
      notify,
      reportSyncError,
      registerResync,
      activity,
      clearActivity,
      markActivityRead,
      unreadActivityCount,
      alertState,
      markAlertsRead,
      dismissAlert,
      observeAlerts,
      preferences,
      updatePreferences,
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
}

export function useNotify(): NotificationsContextValue['notify'] {
  return useNotifications().notify;
}
