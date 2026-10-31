import { app, BrowserWindow, shell } from 'electron';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createFinanceApiMiddleware } from '../src/server/apiPlugin';
import { PROD_DATABASE_FILENAME } from '../src/db/client';

let mainWindow: BrowserWindow | null = null;
let activeServer: http.Server | null = null;

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

function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  if (!app.isPackaged && !process.env.PROD_DATABASE_PATH) {
    return path.resolve(__dirname, '../data', PROD_DATABASE_FILENAME);
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
  const logDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'logs')
    : path.resolve(__dirname, '../logs');
  process.env.LOG_DIR = logDir;
}

function startEmbeddedServer(dbPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const apiMiddleware = createFinanceApiMiddleware({
      dbPath,
      mode: 'production',
    });
    const distDir = getDistDir();

    const mimeTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.wasm': 'application/wasm',
    };

    const server = http.createServer((req, res) => {
      // API routing
      if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
        void apiMiddleware(req, res, () => {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        });
        return;
      }

      // Static assets
      const cleanPath = (req.url ?? '/').split('?')[0].split('#')[0];
      let filePath = path.join(distDir, cleanPath === '/' ? 'index.html' : cleanPath);

      // Prevent directory traversal
      if (!filePath.startsWith(distDir)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      // Fallback to index.html for client-side SPA routing
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] ?? 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', (err) => {
      reject(err);
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to resolve server port'));
        return;
      }
      activeServer = server;
      resolve(address.port);
    });
  });
}

async function createWindow(port: number): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#07090e',
    title: 'Finance Tracker',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
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

  app.whenReady().then(async () => {
    setupLoggingDirectory();
    const dbPath = getDatabasePath();
    const port = await startEmbeddedServer(dbPath);
    await createWindow(port);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow(port);
      }
    });
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Electron application:', err);
    app.quit();
  });

  app.on('window-all-closed', () => {
    if (activeServer) {
      activeServer.close();
      activeServer = null;
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (activeServer) {
      activeServer.close();
      activeServer = null;
    }
  });
}
