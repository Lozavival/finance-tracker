import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createFinanceApiMiddleware } from '@/../../src/server/apiPlugin';

describe('Server API Endpoints Integration', () => {
  let server: http.Server;
  let baseUrl: string;
  let tmpDir: string;
  let dbPath: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-api-test-'));
    dbPath = path.join(tmpDir, 'test-api.db');

    const middleware = createFinanceApiMiddleware({ dbPath, mode: 'development' });
    server = http.createServer((req, res) => {
      middleware(req, res, () => {
        res.statusCode = 404;
        res.end('Not Found');
      });
    });

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('GET /api/workspace returns 200 with serialized workspace snapshot', async () => {
    const res = await fetch(`${baseUrl}/api/workspace`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { settings: unknown; transactions: unknown[] };
    expect(data.settings).toBeDefined();
    expect(Array.isArray(data.transactions)).toBe(true);
    expect(data.transactions.length).toBeGreaterThan(0);
  });

  it('GET /api/transactions/search performs full-history search', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/search?q=salary`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { transactions: unknown[]; totalCount: number };
    expect(Array.isArray(data.transactions)).toBe(true);
  });

  it('GET /api/transactions/search rejects queries shorter than 2 chars with 400', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/search?q=a`);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('Invalid search query');
  });

  it('POST /api/logs accepts batch client diagnostics and returns 200', async () => {
    const payload = {
      entries: [
        {
          timestamp: new Date().toISOString(),
          level: 'warn',
          namespace: 'ClientTest',
          message: 'Test client warning',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; count: number };
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
  });

  it('POST /api/logs returns 400 on malformed json', async () => {
    const res = await fetch(`${baseUrl}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json ...',
    });

    expect(res.status).toBe(400);
  });

  it('POST /api/rpc rejects resetSettings with development seedMode in production mode', async () => {
    const prodDbPath = path.join(tmpDir, 'test-prod-api.db');
    const prodMiddleware = createFinanceApiMiddleware({ dbPath: prodDbPath, mode: 'production' });

    const prodServer = http.createServer((req, res) => {
      prodMiddleware(req, res, () => {
        res.statusCode = 404;
        res.end('Not Found');
      });
    });

    await new Promise<void>(resolve => {
      prodServer.listen(0, '127.0.0.1', resolve);
    });
    const addr = prodServer.address() as { port: number };
    const prodUrl = `http://127.0.0.1:${addr.port}`;

    try {
      const res = await fetch(`${prodUrl}/api/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetSettings',
          payload: { seedMode: 'development' },
        }),
      });

      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/Cannot seed development fixtures into production database/);
    } finally {
      await new Promise<void>(resolve => prodServer.close(() => resolve()));
    }
  });
});
