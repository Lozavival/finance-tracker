import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { logger } from '@/lib/logger';

const themeSyncLogger = logger.child('ElectronThemeSync');

export function ElectronThemeSync() {
  const { theme, setTheme } = useTheme();
  const lastSyncedThemeRef = useRef<string | null>(null);
  const userInteractedRef = useRef(false);

  // 1. Initial hydration from desktop preferences (runs strictly ONCE on mount)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
      return;
    }

    void window.electronAPI.getDesktopPreferences?.().then(prefs => {
      // If user already changed theme before preferences resolved, don't overwrite
      if (userInteractedRef.current) {
        return;
      }
      if (prefs?.theme && (prefs.theme === 'light' || prefs.theme === 'dark' || prefs.theme === 'system')) {
        lastSyncedThemeRef.current = prefs.theme;
        if (prefs.theme !== theme) {
          setTheme(prefs.theme);
        }
        try {
          localStorage.setItem('theme', prefs.theme);
        } catch (err) {
          themeSyncLogger.warn('Failed to mirror desktop theme preference to localStorage:', err);
        }
      } else {
        lastSyncedThemeRef.current = theme ?? 'system';
      }
    });
    // Note: Mount-only initial desktop preference hydration
    // setTheme is omitted deliberately because in next-themes its identity mutates with theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Synchronize user theme changes down to Electron
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
      return;
    }
    // Skip initial mount before hydration
    if (!lastSyncedThemeRef.current) {
      return;
    }
    if (theme && theme !== lastSyncedThemeRef.current) {
      userInteractedRef.current = true;
      lastSyncedThemeRef.current = theme;
      void window.electronAPI.setThemeSource?.(theme as 'system' | 'light' | 'dark');
    }
  }, [theme]);

  // 3. Listen for OS theme updates when 'system' is selected
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
      return;
    }
    if (theme !== 'system') {
      return;
    }

    let isCancelled = false;

    // Verify against Electron's desktop theme detection on mount / system selection
    void window.electronAPI.getSystemTheme?.().then(sysTheme => {
      if (isCancelled) return;
      if (sysTheme) {
        const root = document.documentElement;
        if (!root.classList.contains(sysTheme)) {
          root.classList.remove('light', 'dark');
          root.classList.add(sysTheme);
        }
      }
    });

    // Listen for broadcast OS theme updates from Electron main process
    const unsubscribe = window.electronAPI.onSystemThemeChange?.(sysTheme => {
      if (isCancelled) return;
      const root = document.documentElement;
      if (!root.classList.contains(sysTheme)) {
        root.classList.remove('light', 'dark');
        root.classList.add(sysTheme);
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe?.();
    };
  }, [theme]);

  return null;
}
