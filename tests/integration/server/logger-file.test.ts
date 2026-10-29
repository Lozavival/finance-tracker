import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getResolvedLogFilePath, createServerLogger } from '../../../src/server/logger';
import { createFinanceApiMiddleware } from '../../../src/server/apiPlugin';

describe('Server & Client File Logging Integration', () => {
  it('resolves log file path defaults and respects environment overrides', () => {
    const originalEnv = { ...process.env };
    delete process.env.LOG_FILE_PATH;
    delete process.env.LOG_DIR;

    try {
      const defaultPath = getResolvedLogFilePath();
      expect(defaultPath).toBe(path.resolve(process.cwd(), 'logs', 'app.log'));

      process.env.LOG_FILE_PATH = 'custom/test.log';
      expect(getResolvedLogFilePath()).toBe(path.resolve(process.cwd(), 'custom/test.log'));
      delete process.env.LOG_FILE_PATH;

      process.env.LOG_DIR = 'var/logs';
      expect(getResolvedLogFilePath()).toBe(path.resolve(process.cwd(), 'var/logs', 'app.log'));
    } finally {
      process.env = originalEnv;
    }
  });

  it('writes formatted entries and serialized errors to disk log file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-log-test-'));
    const testLogFile = path.join(tmpDir, 'test.log');

    try {
      const logger = createServerLogger(undefined, 'testService', testLogFile);

      logger.info('System initialization complete', { version: '1.2.3' });
      logger.warn('Resource usage high', { cpu: 85 });
      const testError = new Error('Database connection timed out');
      logger.error('Query execution failed', testError);

      expect(fs.existsSync(testLogFile)).toBe(true);
      const content = fs.readFileSync(testLogFile, 'utf-8');

      expect(content).toMatch(/\[INFO\]\[testService\] System initialization complete/);
      expect(content).toMatch(/"version":\s*"1.2.3"/);
      expect(content).toMatch(/\[WARN\]\[testService\] Resource usage high/);
      expect(content).toMatch(/"cpu":\s*85/);
      expect(content).toMatch(/\[ERROR\]\[testService\] Query execution failed/);
      expect(content).toMatch(/Database connection timed out/);
      expect(content).toMatch(/Stack:/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates nested directories automatically when log file is placed in non-existent directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-log-nested-'));
    const nestedLogFile = path.join(tmpDir, 'deeply', 'nested', 'subfolder', 'app.log');

    try {
      const logger = createServerLogger(undefined, 'nestedLogger', nestedLogFile);
      logger.info('Deep path message');

      expect(fs.existsSync(nestedLogFile)).toBe(true);
      const content = fs.readFileSync(nestedLogFile, 'utf-8');
      expect(content).toMatch(/\[INFO\]\[nestedLogger\] Deep path message/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rotates log file when exceeding 10MB limit and creates .1 backup', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-log-rotate-'));
    const logFile = path.join(tmpDir, 'rotating.log');
    const backupFile = `${logFile}.1`;

    try {
      // Create a file just exceeding 10MB
      const buffer10MB = Buffer.alloc(10 * 1024 * 1024 + 1024, 'x');
      fs.writeFileSync(logFile, buffer10MB);

      const logger = createServerLogger(undefined, 'rotationTest', logFile);
      logger.info('Message after file exceeded 10MB limit');

      expect(fs.existsSync(backupFile)).toBe(true);
      expect(fs.existsSync(logFile)).toBe(true);

      const newContent = fs.readFileSync(logFile, 'utf-8');
      expect(newContent).toMatch(/Message after file exceeded 10MB limit/);
      expect(newContent.length).toBeLessThan(1000);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('ingests client log batches via POST /api/logs and appends to server file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-api-logs-'));
    const testLogFile = path.join(tmpDir, 'api-test.log');
    const originalEnv = { ...process.env };
    process.env.LOG_FILE_PATH = testLogFile;

    try {
      const middleware = createFinanceApiMiddleware({
        dbPath: path.join(tmpDir, 'test-api.db'),
        mode: 'development',
      });

      function simulatePost(urlPath: string, body: unknown) {
        return new Promise<{ statusCode: number; headers: Record<string, string>; data: Record<string, unknown> }>(
          (resolve, reject) => {
            const req = new EventEmitter() as IncomingMessage & EventEmitter;
            req.method = 'POST';
            req.url = urlPath;
            req.headers = { 'content-type': 'application/json' };

            const res = {
              statusCode: 200,
              headers: {} as Record<string, string>,
              body: '',
              setHeader(key: string, val: string) {
                this.headers[key.toLowerCase()] = val;
              },
              end(chunk?: string | Buffer) {
                if (chunk) this.body += chunk.toString();
                resolve({
                  statusCode: this.statusCode,
                  headers: this.headers,
                  data: this.body ? (JSON.parse(this.body) as Record<string, unknown>) : {},
                });
              },
            } as unknown as ServerResponse;

            middleware(req, res, () => {
              reject(new Error('Next should not be called for matched API route'));
            });

            const jsonStr = JSON.stringify(body);
            req.emit('data', Buffer.from(jsonStr));
            req.emit('end');
          },
        );
      }

      // 1. Valid client log batch
      const response = await simulatePost('/api/logs', {
        entries: [
          {
            level: 'warn',
            namespace: 'NetworkMonitor',
            message: 'Server latency elevated',
            data: { rttMs: 850 },
          },
          {
            level: 'error',
            namespace: 'TransactionForm',
            message: 'Validation failed unexpectedly',
            error: {
              name: 'TypeError',
              message: 'Cannot read properties of undefined',
              stack: 'TypeError: Cannot read properties...',
            },
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.count).toBe(2);

      expect(fs.existsSync(testLogFile)).toBe(true);
      const fileContent = fs.readFileSync(testLogFile, 'utf-8');

      expect(fileContent).toMatch(/\[WARN\]\[api:client\] \[NetworkMonitor\] Server latency elevated/);
      expect(fileContent).toMatch(/"rttMs":\s*850/);
      expect(fileContent).toMatch(/\[ERROR\]\[api:client\] \[TransactionForm\] Validation failed unexpectedly/);
      expect(fileContent).toMatch(/TypeError: Cannot read properties of undefined/);

      // 2. Invalid log batch rejected with 400
      const invalidResponse = await simulatePost('/api/logs', {
        entries: [{ invalid: true }],
      });
      expect(invalidResponse.statusCode).toBe(400);
      expect(invalidResponse.data.error).toBe('Invalid log payload');
    } finally {
      process.env = originalEnv;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
