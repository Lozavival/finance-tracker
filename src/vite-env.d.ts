/// <reference types="vite/client" />

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
}

interface Window {
  electronAPI?: ElectronWindowAPI;
}
