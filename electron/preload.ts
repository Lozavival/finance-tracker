import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronWindowAPI {
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

const electronAPI: ElectronWindowAPI = {
  isElectron: true,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const listener = (_event: unknown, isMax: boolean) => {
      callback(isMax);
    };
    ipcRenderer.on('window-maximized-state', listener);
    return () => {
      ipcRenderer.removeListener('window-maximized-state', listener);
    };
  },
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  setThemeSource: (theme: 'system' | 'light' | 'dark') => ipcRenderer.invoke('set-theme-source', theme),
  onSystemThemeChange: (callback: (theme: 'dark' | 'light') => void) => {
    const listener = (_event: unknown, theme: 'dark' | 'light') => {
      callback(theme);
    };
    ipcRenderer.on('system-theme-updated', listener);
    return () => {
      ipcRenderer.removeListener('system-theme-updated', listener);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
