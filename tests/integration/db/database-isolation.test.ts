import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { resolveDatabasePath, createDatabaseConnection } from '../../../src/db/client';
import { SqliteRepository } from '../../../src/server/sqliteRepository';
import { financeApiPlugin } from '../../../src/server/apiPlugin';
import type { ViteDevServer, PreviewServer } from 'vite';

describe('Dev and Prod Database Separation Integration', () => {
  it('resolves database path defaults correctly', () => {
    const originalEnv = { ...process.env };
    delete process.env.DATABASE_PATH;
    delete process.env.DEV_DATABASE_PATH;
    delete process.env.PROD_DATABASE_PATH;

    try {
      const devPath = resolveDatabasePath(undefined, 'development');
      const prodPath = resolveDatabasePath(undefined, 'production');

      expect(devPath).toBe(path.resolve(process.cwd(), 'data', 'finance-tracker.dev.db'));
      expect(prodPath).toBe(path.resolve(process.cwd(), 'data', 'finance-tracker.prod.db'));
      expect(devPath).not.toBe(prodPath);
    } finally {
      process.env = originalEnv;
    }
  });

  it('respects environment variable hierarchy for database path resolution', () => {
    const originalEnv = { ...process.env };

    try {
      // 1. DEV_DATABASE_PATH and PROD_DATABASE_PATH
      delete process.env.DATABASE_PATH;
      process.env.DEV_DATABASE_PATH = '/custom/dev.db';
      process.env.PROD_DATABASE_PATH = '/custom/prod.db';

      expect(resolveDatabasePath(undefined, 'development')).toBe('/custom/dev.db');
      expect(resolveDatabasePath(undefined, 'production')).toBe('/custom/prod.db');

      // 2. Global DATABASE_PATH takes precedence over mode-specific paths
      process.env.DATABASE_PATH = '/custom/override.db';
      expect(resolveDatabasePath(undefined, 'development')).toBe('/custom/override.db');
      expect(resolveDatabasePath(undefined, 'production')).toBe('/custom/override.db');

      // 3. Explicit argument takes precedence over all env variables
      expect(resolveDatabasePath('/explicit.db', 'development')).toBe('/explicit.db');
      expect(resolveDatabasePath('/explicit.db', 'production')).toBe('/explicit.db');
    } finally {
      process.env = originalEnv;
    }
  });

  it('initializes Dev and Prod databases with isolated, appropriate defaults', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-db-test-'));
    const devDbPath = path.join(tmpDir, 'test-dev.db');
    const prodDbPath = path.join(tmpDir, 'test-prod.db');

    try {
      // Create dev connection and repo
      const devConn = createDatabaseConnection(devDbPath, undefined, 'development');
      const devRepo = new SqliteRepository(devConn, 'default', 'development');

      // Create prod connection and repo
      const prodConn = createDatabaseConnection(prodDbPath, undefined, 'production');
      const prodRepo = new SqliteRepository(prodConn, 'default', 'production');

      // Inspect dev state
      const devSnapshot = await devRepo.loadWorkspace();
      const devTransactions = devConn.sqlite.prepare('SELECT count(*) as c FROM transactions').get() as { c: number };

      // Inspect prod state
      const prodSnapshot = await prodRepo.loadWorkspace();
      const prodTransactions = prodConn.sqlite.prepare('SELECT count(*) as c FROM transactions').get() as {
        c: number;
      };

      // Dev must have fixture accounts and seeded transactions
      expect(devSnapshot.settings.accounts.length).toBeGreaterThan(0);
      expect(devTransactions.c).toBeGreaterThan(0);

      // Prod must be clean and minimal: zero accounts, zero demo transactions, empty goals config
      expect(prodSnapshot.settings.accounts.length).toBe(0);
      expect(prodTransactions.c).toBe(0);
      expect(prodSnapshot.settings.goals.categories.length).toBe(0);

      // Close sqlite connections
      devConn.sqlite.close();
      prodConn.sqlite.close();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('ensures mutations and resets in Dev do not affect Prod (zero cross-contamination)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-db-isolation-'));
    const devDbPath = path.join(tmpDir, 'isolation-dev.db');
    const prodDbPath = path.join(tmpDir, 'isolation-prod.db');

    try {
      const devConn = createDatabaseConnection(devDbPath, undefined, 'development');
      const devRepo = new SqliteRepository(devConn, 'default', 'development');

      const prodConn = createDatabaseConnection(prodDbPath, undefined, 'production');
      const prodRepo = new SqliteRepository(prodConn, 'default', 'production');

      // Add a production account
      await prodRepo.createAccount({
        id: 'real-bank',
        name: 'Real Bank Checking',
        kind: 'Checking',
        initials: 'RB',
        color: 'cyan',
        openingDate: new Date('2026-01-01'),
        balances: [{ currency: 'USD', openingBalanceCents: 50000 }],
        paymentMethodIds: ['cash'],
      });

      // Verify prod now has 1 account, and dev is untouched
      const prodSnapshot1 = await prodRepo.loadWorkspace();
      expect(prodSnapshot1.settings.accounts.length).toBe(1);

      const devSnapshot1 = await devRepo.loadWorkspace();
      expect(devSnapshot1.settings.accounts.length).toBeGreaterThan(1);
      expect(devSnapshot1.settings.accounts.some(a => a.id === 'real-bank')).toBe(false);

      // Reset settings in Dev
      await devRepo.resetSettings('development');

      // Verify Prod still has its 1 real account!
      const prodSnapshot2 = await prodRepo.loadWorkspace();
      expect(prodSnapshot2.settings.accounts.length).toBe(1);
      expect(prodSnapshot2.settings.accounts[0].name).toBe('Real Bank Checking');

      devConn.sqlite.close();
      prodConn.sqlite.close();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('preserves developer data during legacy database migration while leaving prod clean', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-legacy-test-'));
    const originalEnv = { ...process.env };

    try {
      // 1. Create a legacy finance-tracker.db in tmpDir
      const legacyPath = path.join(tmpDir, 'finance-tracker.db');
      const legacyConn = createDatabaseConnection(legacyPath, undefined, 'development');
      const legacyRepo = new SqliteRepository(legacyConn, 'default', 'development');

      // Add a custom account in the legacy database
      await legacyRepo.createAccount({
        id: 'legacy-acc',
        name: 'Legacy Dev Account',
        kind: 'Savings',
        initials: 'LD',
        color: 'emerald',
        openingDate: new Date('2026-02-01'),
        balances: [{ currency: 'USD', openingBalanceCents: 12345 }],
        paymentMethodIds: ['cash'],
      });
      legacyConn.sqlite.close();

      // Set DEV_DATABASE_PATH and PROD_DATABASE_PATH inside tmpDir
      delete process.env.DATABASE_PATH;
      process.env.DEV_DATABASE_PATH = path.join(tmpDir, 'finance-tracker.dev.db');
      process.env.PROD_DATABASE_PATH = path.join(tmpDir, 'finance-tracker.prod.db');

      // Connect to Dev: should detect legacyPath in tmpDir and copy it over
      const devConn = createDatabaseConnection(undefined, undefined, 'development');
      const devRepo = new SqliteRepository(devConn, 'default', 'development');
      const devSnapshot = await devRepo.loadWorkspace();

      expect(devSnapshot.settings.accounts.some(a => a.id === 'legacy-acc')).toBe(true);
      devConn.sqlite.close();

      // Connect to Prod: should NOT copy legacy dev data!
      const prodConn = createDatabaseConnection(undefined, undefined, 'production');
      const prodRepo = new SqliteRepository(prodConn, 'default', 'production');
      const prodSnapshot = await prodRepo.loadWorkspace();

      expect(prodSnapshot.settings.accounts.length).toBe(0);
      expect(prodSnapshot.settings.accounts.some(a => a.id === 'legacy-acc')).toBe(false);
      prodConn.sqlite.close();
    } finally {
      process.env = originalEnv;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('configures dev and preview servers with correct modes in financeApiPlugin', () => {
    const plugin = financeApiPlugin();

    let devRegistered = false;
    let prodRegistered = false;

    const fakeDevServer = {
      config: { mode: 'development', logger: undefined },
      middlewares: {
        use(middleware: unknown) {
          expect(typeof middleware).toBe('function');
          devRegistered = true;
        },
      },
    } as unknown as ViteDevServer;

    const fakePreviewServer = {
      config: { mode: 'production', logger: undefined },
      middlewares: {
        use(middleware: unknown) {
          expect(typeof middleware).toBe('function');
          prodRegistered = true;
        },
      },
    } as unknown as PreviewServer;

    plugin.configureServer?.(fakeDevServer);
    plugin.configurePreviewServer?.(fakePreviewServer);

    expect(devRegistered).toBe(true);
    expect(prodRegistered).toBe(true);
  });
});
