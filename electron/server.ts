import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createFinanceApiMiddleware } from '../src/server/apiPlugin';
import { DEV_DATABASE_FILENAME, PROD_DATABASE_FILENAME } from '../src/db/client';
import type { SeedMode } from '../src/db/seedDatabase';

export interface ServerOptions {
  dbPath?: string;
  mode?: SeedMode;
  distDir?: string;
  port?: number;
}

export function startServer(options: ServerOptions = {}): Promise<{ port: number; server: http.Server }> {
  return new Promise((resolve, reject) => {
    const mode: SeedMode =
      options.mode ??
      (process.env.SEED_MODE as SeedMode | undefined) ??
      (process.env.NODE_ENV === 'production' ? 'production' : 'development');

    const dbPath =
      options.dbPath ??
      process.env.DATABASE_PATH ??
      (mode === 'development'
        ? (process.env.DEV_DATABASE_PATH ?? path.resolve(process.cwd(), 'data', DEV_DATABASE_FILENAME))
        : (process.env.PROD_DATABASE_PATH ?? path.resolve(process.cwd(), 'data', PROD_DATABASE_FILENAME)));

    const distDir = options.distDir ?? path.resolve(process.cwd(), 'dist');

    const apiMiddleware = createFinanceApiMiddleware({ dbPath, mode });

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
      if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
        void apiMiddleware(req, res, () => {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        });
        return;
      }

      const cleanPath = (req.url ?? '/').split('?')[0].split('#')[0];
      const relativePath = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
      const resolvedDistDir = path.resolve(distDir);
      let filePath = path.resolve(resolvedDistDir, relativePath);

      if (!filePath.startsWith(resolvedDistDir)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(resolvedDistDir, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      fs.createReadStream(filePath).pipe(res);
    });

    const basePort = options.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 24180);
    let attemptPort = basePort;

    const tryListen = () => {
      const errorHandler = (err: NodeJS.ErrnoException) => {
        server.removeListener('listening', listenSuccessHandler);
        if (err.code === 'EADDRINUSE' && attemptPort < basePort + 10) {
          attemptPort++;
          tryListen();
        } else {
          reject(err);
        }
      };

      const listenSuccessHandler = () => {
        server.removeListener('error', errorHandler);
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : attemptPort;
        resolve({ port, server });
      };

      server.once('error', errorHandler);
      server.once('listening', listenSuccessHandler);
      server.listen(attemptPort, '127.0.0.1');
    };

    tryListen();
  });
}

// When invoked directly via CLI (e.g. `node dist-electron/server.cjs --port=...`)
if (require.main === module || process.env.FINANCE_TRACKER_SERVER_STANDALONE === '1') {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const match = args.find((a) => a.startsWith(prefix));
    if (match) return match.slice(prefix.length);
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return undefined;
  };

  const mode = getArg('mode') as SeedMode | undefined;
  const dbPath = getArg('dbPath');
  const distDir = getArg('distDir');
  const portArg = getArg('port');
  const port = portArg ? parseInt(portArg, 10) : undefined;

  startServer({ mode, dbPath, distDir, port })
    .then(({ port: boundPort }) => {
      process.stdout.write(`FINANCE_TRACKER_PORT=${boundPort}\n`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

