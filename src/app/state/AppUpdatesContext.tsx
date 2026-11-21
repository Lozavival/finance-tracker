import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  APP_VERSION,
  type GitHubReleasePayload,
  type ReleaseInfo,
  type UpdateCheckResult,
  checkForAppUpdates,
  getUpdateCheckErrorDetails,
  isNewerVersion,
  selectLatestRelease,
} from '@/data/updates';
import { useI18n } from '@/i18n';
import { useNotifications } from './NotificationsContext';
import { logger } from '@/lib/logger';

const updatesContextLogger = logger.child('AppUpdatesContext');

export const UPDATE_PREFS_STORAGE_KEY = 'finance-tracker_update_prefs';

export interface UpdatePreferences {
  includePrereleases: boolean;
}

export const DEFAULT_UPDATE_PREFERENCES: UpdatePreferences = {
  includePrereleases: false,
};

export function loadStoredUpdatePreferences(): UpdatePreferences {
  if (typeof window === 'undefined') return DEFAULT_UPDATE_PREFERENCES;
  try {
    const raw = localStorage.getItem(UPDATE_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_UPDATE_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UpdatePreferences>;
    return {
      includePrereleases:
        typeof parsed?.includePrereleases === 'boolean'
          ? parsed.includePrereleases
          : DEFAULT_UPDATE_PREFERENCES.includePrereleases,
    };
  } catch (err) {
    updatesContextLogger.warn('Failed to load update preferences from localStorage:', err);
    return DEFAULT_UPDATE_PREFERENCES;
  }
}

export function saveStoredUpdatePreferences(prefs: UpdatePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UPDATE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    updatesContextLogger.warn('Failed to save update preferences to localStorage:', err);
  }
}

export interface AppUpdatesContextValue {
  currentVersion: string;
  includePrereleases: boolean;
  setIncludePrereleases: (include: boolean) => void;
  isChecking: boolean;
  lastCheckedAt: string | null;
  latestRelease: ReleaseInfo | null;
  updateAvailable: boolean;
  error: string | null;
  checkForUpdates: (options?: {
    silent?: boolean;
    includePrereleasesOverride?: boolean;
  }) => Promise<UpdateCheckResult | null>;
}

const AppUpdatesContext = createContext<AppUpdatesContextValue | null>(null);

export function AppUpdatesProvider({
  children,
  currentVersion = APP_VERSION,
}: {
  children: React.ReactNode;
  currentVersion?: string;
}) {
  const { t } = useI18n();
  const { notify } = useNotifications();

  const [includePrereleases, setIncludePrereleasesState] = useState<boolean>(
    () => loadStoredUpdatePreferences().includePrereleases,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [cachedReleases, setCachedReleases] = useState<GitHubReleasePayload[]>([]);
  const [error, setError] = useState<string | null>(null);

  const includePrereleasesRef = useRef(includePrereleases);
  includePrereleasesRef.current = includePrereleases;
  const userToggledChannelRef = useRef(false);

  const setIncludePrereleases = useCallback((next: boolean) => {
    userToggledChannelRef.current = true;
    includePrereleasesRef.current = next;
    setIncludePrereleasesState(next);
    saveStoredUpdatePreferences({ includePrereleases: next });

    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      void window.electronAPI.setDesktopPreference?.('includePrereleases', next);
    }
  }, []);

  const latestRelease = useMemo(
    () => selectLatestRelease(cachedReleases, { includePrereleases }),
    [cachedReleases, includePrereleases],
  );

  const updateAvailable = useMemo(
    () => latestRelease !== null && isNewerVersion(currentVersion, latestRelease.version),
    [latestRelease, currentVersion],
  );

  const checkForUpdates = useCallback(
    async (options?: { silent?: boolean; includePrereleasesOverride?: boolean }): Promise<UpdateCheckResult | null> => {
      const silent = options?.silent ?? false;
      const effectiveIncludePrereleases = options?.includePrereleasesOverride ?? includePrereleasesRef.current;

      setIsChecking(true);
      if (!silent) {
        setError(null);
      }

      try {
        const result = await checkForAppUpdates({
          currentVersion,
          includePrereleases: effectiveIncludePrereleases,
        });

        setCachedReleases(result.releases);
        setLastCheckedAt(result.checkedAt);
        setError(null);

        if (result.updateAvailable && result.latestRelease) {
          const releaseUrl = result.latestRelease.htmlUrl;
          notify.info('settings.updates.updateAvailableToast', {
            id: 'update-check-status',
            durationMs: 8000,
            params: { version: result.latestRelease.version },
            action: {
              label: t('settings.updates.viewRelease'),
              onClick: () => {
                if (typeof window !== 'undefined') {
                  window.open(releaseUrl, '_blank', 'noopener,noreferrer');
                }
              },
            },
          });
        } else if (!silent) {
          notify.success('settings.updates.upToDateToast', {
            id: 'update-check-status',
            params: { version: currentVersion },
          });
        }

        return result;
      } catch (err) {
        if (!silent) {
          const { key, params } = getUpdateCheckErrorDetails(err);
          const errorMsg = t(key, params);
          setError(errorMsg);
          notify.error(key, {
            id: 'update-check-status',
            params,
          });
        } else {
          updatesContextLogger.debug('Silent startup update check skipped or failed:', err);
        }
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [currentVersion, notify, t],
  );

  // Hydrate desktop preference and execute initial startup update check exclusively in Electron desktop app
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
      return;
    }

    let cancelled = false;

    async function initStartupCheck() {
      let effectivePref = includePrereleasesRef.current;

      try {
        const prefs = await window.electronAPI?.getDesktopPreferences?.();
        if (!cancelled && !userToggledChannelRef.current && typeof prefs?.includePrereleases === 'boolean') {
          effectivePref = prefs.includePrereleases;
          includePrereleasesRef.current = effectivePref;
          setIncludePrereleasesState(effectivePref);
          saveStoredUpdatePreferences({ includePrereleases: effectivePref });
        }
      } catch (err) {
        updatesContextLogger.warn('Failed to read desktop update preferences:', err);
      }

      if (!cancelled) {
        void checkForUpdates({ silent: true, includePrereleasesOverride: effectivePref });
      }
    }

    void initStartupCheck();

    return () => {
      cancelled = true;
    };
  }, [checkForUpdates]);

  const value = useMemo<AppUpdatesContextValue>(
    () => ({
      currentVersion,
      includePrereleases,
      setIncludePrereleases,
      isChecking,
      lastCheckedAt,
      latestRelease,
      updateAvailable,
      error,
      checkForUpdates,
    }),
    [
      currentVersion,
      includePrereleases,
      setIncludePrereleases,
      isChecking,
      lastCheckedAt,
      latestRelease,
      updateAvailable,
      error,
      checkForUpdates,
    ],
  );

  return <AppUpdatesContext.Provider value={value}>{children}</AppUpdatesContext.Provider>;
}

export function useAppUpdates(): AppUpdatesContextValue {
  const ctx = useContext(AppUpdatesContext);
  if (!ctx) {
    throw new Error('useAppUpdates must be used within an AppUpdatesProvider');
  }
  return ctx;
}
