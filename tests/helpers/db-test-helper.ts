import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDatabaseConnection, type DatabaseConnection } from '../../src/db/client';
import { SqliteRepository } from '../../src/server/sqliteRepository';
import { DEFAULT_WORKSPACE_ID, type SeedMode } from '../../src/db/seedDatabase';

export interface TestDatabaseContext {
  conn: DatabaseConnection;
  repo: SqliteRepository;
  dbPath: string;
  tmpDir: string;
  cleanup: () => void;
}

export function createTestDatabase(mode: SeedMode = 'development'): TestDatabaseContext {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-vitest-db-'));
  const dbPath = path.join(tmpDir, `test-${mode}.db`);

  const conn = createDatabaseConnection(dbPath, undefined, mode);
  const repo = new SqliteRepository(conn, DEFAULT_WORKSPACE_ID, mode);

  const cleanup = () => {
    try {
      conn.sqlite.close();
    } catch {
      // ignore if already closed
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  };

  return { conn, repo, dbPath, tmpDir, cleanup };
}

