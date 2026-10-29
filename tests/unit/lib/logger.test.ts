import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '@/lib/logger';

describe('Client Logger & Diagnostic Engine', () => {
  beforeEach(() => {
    logger.clearLogs();
    logger.setLevel('trace');
  });

  describe('hierarchical namespaced logging', () => {
    it('creates child loggers with namespaced prefixes', () => {
      const dbLogger = logger.child('Database');
      dbLogger.info('Connected to database', { host: 'localhost' });

      const logs = logger.getRecentLogs();
      const last = logs[logs.length - 1];
      expect(last).toBeDefined();
      expect(last.namespace).toBe('Database');
      expect(last.message).toBe('Connected to database');
    });

    it('creates nested child loggers correctly', () => {
      const repoLogger = logger.child('Repo').child('SQLite');
      repoLogger.debug('Executing query');

      const logs = logger.getRecentLogs();
      const last = logs[logs.length - 1];
      expect(last.namespace).toBe('Repo:SQLite');
      expect(last.level).toBe('debug');
    });
  });

  describe('buffer and circular retention', () => {
    it('records entries with incrementing IDs and ISO timestamps', () => {
      logger.info('Message 1');
      logger.warn('Message 2');

      const logs = logger.getRecentLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2);
      const [first, second] = logs.slice(-2);
      expect(first.message).toBe('Message 1');
      expect(second.message).toBe('Message 2');
      expect(second.id).toBeGreaterThan(first.id);
      expect(new Date(first.timestamp).getTime()).not.toBeNaN();
    });

    it('clears buffered logs', () => {
      logger.info('To be deleted');
      expect(logger.getRecentLogs().length).toBeGreaterThan(0);
      logger.clearLogs();
      expect(logger.getRecentLogs()).toHaveLength(0);
    });

    it('caps buffer to 300 entries without unbounded memory growth', () => {
      logger.clearLogs();
      for (let i = 0; i < 350; i++) {
        logger.info(`Message ${i}`);
      }
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(300);
      expect(logs[0].message).toBe('Message 50');
      expect(logs[299].message).toBe('Message 349');
    });
  });

  describe('argument serialization & error safety', () => {
    it('safely serializes circular object references without crashing', () => {
      const circular: Record<string, unknown> = { name: 'circular-test' };
      circular.self = circular;

      expect(() => {
        logger.info('Logging circular', circular);
      }).not.toThrow();

      const logs = logger.getRecentLogs();
      const last = logs[logs.length - 1];
      expect(last.data).toBeDefined();
      const serializedData = last.data![0] as Record<string, unknown>;
      expect(serializedData.self).toBe('[Circular]');
    });

    it('truncates excessively long strings', () => {
      const hugeString = 'a'.repeat(1000);
      logger.info('Big string', hugeString);

      const logs = logger.getRecentLogs();
      const last = logs[logs.length - 1];
      const serialized = last.data![0] as string;
      expect(serialized.length).toBeLessThan(600);
      expect(serialized).toContain('[truncated');
    });

    it('captures structured Error properties (name, message, stack)', () => {
      const testErr = new Error('Test error exception');
      logger.error('Failed operation', testErr);

      const logs = logger.getRecentLogs();
      const last = logs[logs.length - 1];
      expect(last.error).toBeDefined();
      expect(last.error?.name).toBe('Error');
      expect(last.error?.message).toBe('Test error exception');
      expect(last.error?.stack).toBeDefined();
    });
  });

  describe('log levels and export', () => {
    it('sets and gets log level', () => {
      logger.setLevel('warn');
      expect(logger.getLevel()).toBe('warn');
      logger.setLevel('silent');
      expect(logger.getLevel()).toBe('silent');
    });

    it('exports formatted diagnostic text report', () => {
      logger.clearLogs();
      logger.setLevel('info');
      logger.info('App started');
      logger.error('Database connection failed', new Error('DB_CONN_TIMEOUT'));

      const report = logger.exportLogs();
      expect(report).toContain('=== Finance Tracker Diagnostic Logs ===');
      expect(report).toContain('[INFO]');
      expect(report).toContain('App started');
      expect(report).toContain('[ERROR]');
      expect(report).toContain('DB_CONN_TIMEOUT');
    });

    it('times execution and logs duration', () => {
      const timer = logger.time('expensiveOperation');
      timer();

      const logs = logger.getRecentLogs();
      const last = logs[logs.length - 1];
      expect(last.message).toContain('expensiveOperation finished in');
      expect(last.level).toBe('debug');
    });
  });
});

