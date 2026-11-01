import { app, BrowserWindow, shell, ipcMain, nativeTheme } from 'electron';
import { execSync } from 'node:child_process';
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

function detectSystemTheme(): 'dark' | 'light' {
  if (nativeTheme.shouldUseDarkColors) {
    return 'dark';
  }

  // On Linux (GNOME/Ubuntu), theme changes or portals may not automatically
  // reflect in Chromium's nativeTheme. Query gsettings directly as a robust fallback.
  if (process.platform === 'linux') {
    try {
      const colorScheme = execSync('gsettings get org.gnome.desktop.interface color-scheme 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 1000,
      })
        .trim()
        .replace(/['"]/g, '');

      if (colorScheme === 'prefer-dark') {
        return 'dark';
      }
      if (colorScheme === 'prefer-light') {
        return 'light';
      }
    } catch {
      // Ignore fallback error
    }

    try {
      const gtkTheme = execSync('gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 1000,
      })
        .trim()
        .replace(/['"]/g, '')
        .toLowerCase();

      if (gtkTheme.includes('dark')) {
        return 'dark';
      }
    } catch {
      // Ignore fallback error
    }
  }

  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function broadcastThemeChange(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const currentTheme = detectSystemTheme();
    mainWindow.webContents.send('system-theme-updated', currentTheme);
    if (nativeTheme.themeSource === 'system') {
      mainWindow.setBackgroundColor(currentTheme === 'dark' ? '#07090e' : '#f8fafc');
    }
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

function setupLoggingDirectory(): void {
  if (process.env.LOG_DIR || process.env.LOG_FILE_PATH) {
    return;
  }
  const logDir = app.isPackaged ? path.join(app.getPath('userData'), 'logs') : path.resolve(process.cwd(), 'logs');
  process.env.LOG_DIR = logDir;
}

function startEmbeddedServer(dbPath: string, mode: SeedMode): Promise<EmbeddedServerHandle> {
  const distDir = getDistDir();

  return startServer({
    dbPath,
    mode,
    distDir,
    port: 0,
  }).then(({ port, server }) => ({
    port,
    close: () => {
      server.close();
    },
  }));
}

async function createWindow(port: number): Promise<void> {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  const initialTheme = detectSystemTheme();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: initialTheme === 'dark' ? '#07090e' : '#f8fafc',
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
    broadcastThemeChange();
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

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// Theme detection & synchronization IPC handlers
ipcMain.handle('get-system-theme', () => {
  return detectSystemTheme();
});

ipcMain.handle('set-theme-source', (_event, source: 'system' | 'light' | 'dark') => {
  nativeTheme.themeSource = source;
  const current = source === 'system' ? detectSystemTheme() : source;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(current === 'dark' ? '#07090e' : '#f8fafc');
  }
  return current;
});

nativeTheme.on('updated', () => {
  broadcastThemeChange();
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
