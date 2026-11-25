import { app, BrowserWindow, shell, ipcMain, nativeTheme } from 'electron';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DEV_DATABASE_FILENAME, PROD_DATABASE_FILENAME } from '../src/db/client';
import type { SeedMode } from '../src/db/seedDatabase';
import { startServer } from './server';

// On Linux Wayland (e.g. GNOME), ensure client-side window decorations (title bar / controls) are enabled
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

let mainWindow: BrowserWindow | null = null;

interface EmbeddedServerHandle {
  port: number;
  close: () => void;
}

let activeServerHandle: EmbeddedServerHandle | null = null;

let currentThemePreference: 'system' | 'light' | 'dark' = 'system';

function detectSystemTheme(): 'dark' | 'light' {
  if (nativeTheme.shouldUseDarkColors) {
    return 'dark';
  }

  // On Linux (GNOME/Ubuntu), theme changes or portals may not automatically
  // reflect in Chromium's nativeTheme. Query gsettings as a fallback.
  if (process.platform === 'linux') {
    try {
      const colorSchemeRes = spawnSync('gsettings', ['get', 'org.gnome.desktop.interface', 'color-scheme'], {
        encoding: 'utf-8',
        timeout: 1000,
      });

      if (colorSchemeRes.status === 0 && colorSchemeRes.stdout) {
        const colorScheme = colorSchemeRes.stdout.trim().replace(/['"]/g, '');
        if (colorScheme === 'prefer-dark') {
          return 'dark';
        }
        if (colorScheme === 'prefer-light') {
          return 'light';
        }
      } else if (colorSchemeRes.error) {
        // eslint-disable-next-line no-console
        console.warn('gsettings color-scheme query failed:', colorSchemeRes.error.message);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to query GNOME color-scheme via gsettings:', err instanceof Error ? err.message : String(err));
    }

    try {
      const gtkThemeRes = spawnSync('gsettings', ['get', 'org.gnome.desktop.interface', 'gtk-theme'], {
        encoding: 'utf-8',
        timeout: 1000,
      });

      if (gtkThemeRes.status === 0 && gtkThemeRes.stdout) {
        const gtkTheme = gtkThemeRes.stdout.trim().replace(/['"]/g, '').toLowerCase();
        if (gtkTheme.includes('dark')) {
          return 'dark';
        }
      } else if (gtkThemeRes.error) {
        // eslint-disable-next-line no-console
        console.warn('gsettings gtk-theme query failed:', gtkThemeRes.error.message);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to query GNOME gtk-theme via gsettings:', err instanceof Error ? err.message : String(err));
    }
  }

  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function broadcastThemeChange(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (currentThemePreference !== 'system') {
      return;
    }
    const currentTheme = detectSystemTheme();
    mainWindow.webContents.send('system-theme-updated', currentTheme);
    mainWindow.setBackgroundColor(currentTheme === 'dark' ? '#07090e' : '#f8fafc');
  }
}

function getDistDir(): string {
  const direct = path.resolve(__dirname, '../dist');
  if (fs.existsSync(direct)) {
    return direct;
  }
  const appPath = path.join(process.resourcesPath ?? '', 'app', 'dist');
  if (fs.existsSync(appPath)) {
    return appPath;
  }
  return direct;
}

function resolveMode(): SeedMode {
  if (process.env.SEED_MODE === 'production' || process.env.SEED_MODE === 'development') {
    return process.env.SEED_MODE;
  }
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  // When running unpackaged (e.g. `pnpm electron:dev`), default strictly to development
  if (!app.isPackaged) {
    return 'development';
  }
  return 'production';
}

function getDatabasePath(mode: SeedMode): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  if (mode === 'development') {
    if (process.env.DEV_DATABASE_PATH) {
      return process.env.DEV_DATABASE_PATH;
    }
    return path.resolve(process.cwd(), 'data', DEV_DATABASE_FILENAME);
  }

  // Production mode
  if (process.env.PROD_DATABASE_PATH) {
    return process.env.PROD_DATABASE_PATH;
  }
  if (!app.isPackaged) {
    return path.resolve(process.cwd(), 'data', PROD_DATABASE_FILENAME);
  }
  const userDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return path.join(userDir, PROD_DATABASE_FILENAME);
}

export interface DesktopPreferences {
  theme?: 'system' | 'light' | 'dark';
  locale?: string;
  currency?: string;
  includePrereleases?: boolean;
}

const DEFAULT_DESKTOP_PORT = 24180;

function getPreferencesFilePath(): string {
  return path.join(app.getPath('userData'), 'preferences.json');
}

function loadDesktopPreferences(): DesktopPreferences {
  try {
    const file = getPreferencesFilePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as DesktopPreferences;
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load desktop preferences from disk:', err);
  }
  return {};
}

function saveDesktopPreferences(prefs: Partial<DesktopPreferences>): void {
  try {
    const file = getPreferencesFilePath();
    const existing = loadDesktopPreferences();
    const merged = { ...existing, ...prefs };
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to save desktop preferences to disk:', err);
  }
}

function setupLoggingDirectory(): void {
  if (process.env.LOG_DIR || process.env.LOG_FILE_PATH) {
    return;
  }
  const logDir = app.isPackaged ? path.join(app.getPath('userData'), 'logs') : path.resolve(process.cwd(), 'logs');
  process.env.LOG_DIR = logDir;
}

function startEmbeddedServer(dbPath: string, mode: SeedMode): Promise<EmbeddedServerHandle> {
  const distDir = getDistDir();
  const targetPort = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_DESKTOP_PORT;

  return startServer({
    dbPath,
    mode,
    distDir,
    port: targetPort,
  }).then(({ port, server }) => ({
    port,
    close: () => {
      server.close();
    },
  }));
}

async function createWindow(port: number): Promise<void> {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  const prefs = loadDesktopPreferences();
  currentThemePreference = (prefs.theme as 'system' | 'light' | 'dark') || 'system';
  nativeTheme.themeSource = currentThemePreference;
  const effectiveTheme =
    currentThemePreference === 'system' ? detectSystemTheme() : currentThemePreference;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: effectiveTheme === 'dark' ? '#07090e' : '#f8fafc',
    title: 'Finance Tracker',
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-state', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-state', false);
  });

  mainWindow.on('focus', () => {
    if (currentThemePreference === 'system') {
      broadcastThemeChange();
    }
  });

  // Intercept Ctrl+Q / Cmd+Q to prompt for quit confirmation in the UI,
  // and disable Ctrl+W / Cmd+W since the app runs in a single window.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.control || input.meta) && !input.alt && !input.shift) {
      const key = input.key.toLowerCase();
      if (key === 'q') {
        event.preventDefault();
        mainWindow?.webContents.send('confirm-quit-requested');
      } else if (key === 'w') {
        event.preventDefault();
      }
    }
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }
  mainWindow.maximize();
  return true;
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('app-quit', () => {
  app.quit();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// Theme detection & synchronization IPC handlers
ipcMain.handle('get-system-theme', () => {
  return detectSystemTheme();
});

ipcMain.handle('set-theme-source', (_event, source: 'system' | 'light' | 'dark') => {
  currentThemePreference = source;
  saveDesktopPreferences({ theme: source });
  nativeTheme.themeSource = source;
  const effective = source === 'system' ? detectSystemTheme() : source;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(effective === 'dark' ? '#07090e' : '#f8fafc');
  }
  return effective;
});

ipcMain.handle('get-desktop-preferences', () => {
  return loadDesktopPreferences();
});

ipcMain.handle('set-desktop-preference', (_event, key: string, value: unknown) => {
  if (key === 'locale' && typeof value === 'string') {
    saveDesktopPreferences({ locale: value });
  } else if (key === 'currency' && typeof value === 'string') {
    saveDesktopPreferences({ currency: value });
  } else if (key === 'theme' && (value === 'system' || value === 'light' || value === 'dark')) {
    saveDesktopPreferences({ theme: value });
  } else if (key === 'includePrereleases' && typeof value === 'boolean') {
    saveDesktopPreferences({ includePrereleases: value });
  }
});

nativeTheme.on('updated', () => {
  if (currentThemePreference === 'system') {
    broadcastThemeChange();
  }
});

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app
    .whenReady()
    .then(async () => {
      setupLoggingDirectory();
      const mode = resolveMode();
      const dbPath = getDatabasePath(mode);
      activeServerHandle = await startEmbeddedServer(dbPath, mode);
      await createWindow(activeServerHandle.port);

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0 && activeServerHandle) {
          void createWindow(activeServerHandle.port);
        }
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize Electron application:', err);
      app.quit();
    });

  app.on('window-all-closed', () => {
    if (activeServerHandle) {
      activeServerHandle.close();
      activeServerHandle = null;
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (activeServerHandle) {
      activeServerHandle.close();
      activeServerHandle = null;
    }
  });
}
