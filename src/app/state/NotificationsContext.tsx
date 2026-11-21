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
import { logger } from '@/lib/logger';

const notifLogger = logger.child('Notifications');
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

export type NotifyAction = {
  label: string;
  onClick: () => void;
};

export type NotifyOptions = {
  id?: string;
  params?: TranslationParams;
  log?: boolean;
  durationMs?: number;
  action?: NotifyAction;
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
    successWhen: (persisted: Promise<boolean>, key: TranslationKey, opts?: NotifyOptions) => void;
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
  const isResyncingRef = useRef(false);
  const lastResyncTimestampRef = useRef(0);

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
        notifLogger.debug(`Toast success [${key}]`, opts);
        if (opts?.log !== false) {
          logActivity('success', key, opts?.params);
        }
        if (prefsRef.current.successToasts) {
          toast.success(t(key, opts?.params), {
            id: opts?.id,
            duration: opts?.durationMs ?? DEFAULT_TOAST_DURATION,
            action: opts?.action
              ? {
                  label: opts.action.label,
                  onClick: opts.action.onClick,
                }
              : undefined,
          });
        }
      },
      info: (key: TranslationKey, opts?: NotifyOptions) => {
        notifLogger.info(`Toast info [${key}]`, opts);
        if (opts?.log !== false) {
          logActivity('info', key, opts?.params);
        }
        if (prefsRef.current.successToasts) {
          toast.info(t(key, opts?.params), {
            id: opts?.id,
            duration: opts?.durationMs ?? DEFAULT_TOAST_DURATION,
            action: opts?.action
              ? {
                  label: opts.action.label,
                  onClick: opts.action.onClick,
                }
              : undefined,
          });
        }
      },
      error: (key: TranslationKey, opts?: NotifyOptions) => {
        notifLogger.error(`Toast error [${key}]`, opts);
        if (opts?.log !== false) {
          logActivity('error', key, opts?.params);
        }
        toast.error(t(key, opts?.params), {
          id: opts?.id,
          duration: opts?.durationMs ?? ERROR_TOAST_DURATION,
          action: opts?.action
            ? {
                label: opts.action.label,
                onClick: opts.action.onClick,
              }
            : undefined,
        });
      },
      validation: (key: TranslationKey, opts?: NotifyOptions) => {
        notifLogger.warn(`Toast validation [${key}]`, opts);
        // Validation toasts are ephemeral and never logged to Activity
        toast.error(t(key, opts?.params), {
          id: opts?.id,
          duration: DEFAULT_TOAST_DURATION,
        });
      },
      undoable: (opts: UndoableOptions) => {
        notifLogger.info(`Toast undoable [${opts.messageKey}]`, opts);
        logActivity('info', opts.messageKey, opts.params);
        const duration = opts.durationMs ?? UNDO_TOAST_DURATION;
        toast(t(opts.messageKey, opts.params), {
          id: opts.id,
          duration,
          action: {
            label: t('notifications.undo'),
            onClick: () => {
              notifLogger.info(`User triggered Undo for [${opts.messageKey}]`, { id: opts.id });
              opts.onUndo();
              logActivity('info', 'notifications.ops.undone');
            },
          },
        });
      },
      successWhen: (persisted: Promise<boolean>, key: TranslationKey, opts?: NotifyOptions) => {
        void persisted.then(success => {
          if (success) {
            if (opts?.log !== false) {
              logActivity('success', key, opts?.params);
            }
            if (prefsRef.current.successToasts) {
              toast.success(t(key, opts?.params), {
                id: opts?.id,
                duration: opts?.durationMs ?? DEFAULT_TOAST_DURATION,
                action: opts?.action
                  ? {
                      label: opts.action.label,
                      onClick: opts.action.onClick,
                    }
                  : undefined,
              });
            }
          }
        });
      },
    }),
    [t, logActivity],
  );

  const reportSyncError = useCallback(
    (error: unknown) => {
      notifLogger.error('Sync persistence failed:', error);
      const rawMessage = error instanceof Error ? error.message : String(error);
      const sanitizedReason = rawMessage.slice(0, 120);

      logActivity('error', 'notifications.ops.syncFailed', { reason: sanitizedReason });

      if (syncDebounceTimerRef.current) {
        clearTimeout(syncDebounceTimerRef.current);
      }

      syncDebounceTimerRef.current = setTimeout(async () => {
        notify.error('notifications.ops.syncFailed', { id: 'sync-error', log: false });

        const now = Date.now();
        // Circuit breaker: skip if already resyncing or resynced in last 10 seconds
        if (isResyncingRef.current || now - lastResyncTimestampRef.current < 10000) {
          notifLogger.warn('Skipping redundant resync due to circuit breaker');
          return;
        }

        isResyncingRef.current = true;
        lastResyncTimestampRef.current = now;

        try {
          const promises = Array.from(resyncCallbacksRef.current).map(fn => fn());
          const results = await Promise.allSettled(promises);
          const hasFailure = results.some(r => r.status === 'rejected');

          if (hasFailure) {
            notify.error('notifications.ops.resyncFailed', {
              id: 'sync-error',
              durationMs: 15000,
              action: {
                label: t('notifications.retry'),
                onClick: () => {
                  lastResyncTimestampRef.current = 0;
                  reportSyncError(new Error('Manual resync triggered'));
                },
              },
            });
          }
        } finally {
          isResyncingRef.current = false;
        }
      }, 800);
    },
    [notify, logActivity, t],
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
    notifLogger.debug('markAlertsRead', { keys });
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
    notifLogger.info('dismissAlert', { key });
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
