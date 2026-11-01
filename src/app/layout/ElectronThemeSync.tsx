import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function ElectronThemeSync() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
      return;
    }

    // 1. Sync the current user theme choice down to Electron's nativeTheme
    void window.electronAPI.setThemeSource?.(theme as 'system' | 'light' | 'dark');

    // 2. If 'system' is selected, verify against Electron's desktop theme detection
    if (theme === 'system') {
      void window.electronAPI.getSystemTheme?.().then(sysTheme => {
        if (sysTheme) {
          const root = document.documentElement;
          if (!root.classList.contains(sysTheme)) {
            root.classList.remove('light', 'dark');
            root.classList.add(sysTheme);
          }
        }
      });
    }

    // 3. Listen for OS theme updates broadcast by the Electron main process
    const unsubscribe = window.electronAPI.onSystemThemeChange?.(sysTheme => {
      if (theme === 'system') {
        const root = document.documentElement;
        if (!root.classList.contains(sysTheme)) {
          root.classList.remove('light', 'dark');
          root.classList.add(sysTheme);
        }
      }
    });

    return unsubscribe;
  }, [theme, resolvedTheme]);

  return null;
}
