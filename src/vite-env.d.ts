/// <reference types="vite/client" />

declare const __APP_VERSION__: string | undefined;

interface DesktopPreferences {
  theme?: 'system' | 'light' | 'dark';
  locale?: string;
  currency?: string;
  includePrereleases?: boolean;
}

interface ElectronWindowAPI {
  isElectron: boolean;
  minimize: () => Promise<void>;
  maximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  getSystemTheme: () => Promise<'dark' | 'light'>;
  setThemeSource: (theme: 'system' | 'light' | 'dark') => Promise<'dark' | 'light'>;
  onSystemThemeChange: (callback: (theme: 'dark' | 'light') => void) => () => void;
  getDesktopPreferences: () => Promise<DesktopPreferences>;
  setDesktopPreference: (key: string, value: unknown) => Promise<void>;
}

interface Window {
  electronAPI?: ElectronWindowAPI;
}
