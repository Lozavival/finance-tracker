/**
 * Server-Side Logger & Diagnostic Tracing
 *
 * Provides structured logging for Vite API middleware, database operations,
 * and RPC actions with timestamping, levels, namespaces, performance timing,
 * and persistent log file writing.
 */

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import type { ViteDevServer } from 'vite';

export type ServerLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface ServerLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  time(label: string): () => void;
  child(namespace: string): ServerLogger;
  getLogFilePath(): string;
  writeRaw(entry: string): void;
}

const SERVER_LOG_LEVEL_PRIORITY: Record<ServerLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const DEFAULT_LOG_FILE_PATH = path.resolve(process.cwd(), 'logs', 'app.log');
const MAX_LOG_FILE_BYTES = 10 * 1024 * 1024; // 10 MB limit before rotation

export function getResolvedLogFilePath(): string {
  if (process.env.LOG_FILE_PATH) {
    return path.resolve(process.cwd(), process.env.LOG_FILE_PATH);
  }
  if (process.env.LOG_DIR) {
    return path.resolve(process.cwd(), process.env.LOG_DIR, 'app.log');
  }
  return DEFAULT_LOG_FILE_PATH;
}

function appendToLogFile(filePath: string, text: string): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check size for rotation: keep 1 backup file
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > MAX_LOG_FILE_BYTES) {
        const backupPath = `${filePath}.1`;
        try {
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
          }
          fs.renameSync(filePath, backupPath);
        } catch (rotErr) {
          // If rotation fails, log warning and continue appending
          process.stderr.write(`[ServerLogger] Failed to rotate log file to ${backupPath}: ${String(rotErr)}\n`);
        }
      }
    }

    fs.appendFileSync(filePath, `${text}\n`, 'utf-8');
  } catch (writeErr) {
    // Failsafe: log to stderr to avoid crashing application if filesystem is restricted or full
    process.stderr.write(`[ServerLogger] Failed to write log entry to ${filePath}: ${String(writeErr)}\n`);
  }
}

function formatFileEntry(level: ServerLogLevel, namespace: string, message: string, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const ns = namespace ? `[${namespace}]` : '';
  let line = `[${timestamp}] [${level.toUpperCase()}]${ns} ${message}`;

  if (args.length > 0) {
    for (const arg of args) {
      if (arg instanceof Error) {
        line += `\n  Error: ${arg.name}: ${arg.message}`;
        if (arg.stack) {
          line += `\n  Stack: ${arg.stack}`;
        }
      } else if (typeof arg === 'object' && arg !== null) {
        try {
          line += `\n  Data: ${JSON.stringify(arg)}`;
        } catch (serErr) {
          line += `\n  Data: [Circular/Unserializable: ${String(serErr)}]`;
        }
      } else if (arg !== undefined) {
        line += `\n  Data: ${String(arg)}`;
      }
    }
  }

  return line;
}

function formatServerConsoleMessage(level: ServerLogLevel, namespace: string, message: string): string {
  const timestamp = new Date().toISOString();
  const ns = namespace ? `[${namespace}]` : '';
  return `[${timestamp}] [${level.toUpperCase()}]${ns} ${message}`;
}

export function createServerLogger(
  viteLogger?: ViteDevServer['config']['logger'],
  namespace = 'server',
  logFilePath: string = getResolvedLogFilePath(),
): ServerLogger {
  const minLevel: ServerLogLevel =
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.VITEST) ||
    Boolean(process.env.PLAYWRIGHT_TEST) ||
    Boolean(process.env.E2E)
      ? 'silent'
      : 'info';

  const shouldLog = (level: ServerLogLevel): boolean => {
    return SERVER_LOG_LEVEL_PRIORITY[level] >= SERVER_LOG_LEVEL_PRIORITY[minLevel];
  };

  const instance: ServerLogger = {
    debug(message: string, ...args: unknown[]): void {
      appendToLogFile(logFilePath, formatFileEntry('debug', namespace, message, args));
      if (!shouldLog('debug')) return;
      const formatted = formatServerConsoleMessage('debug', namespace, message);
      if (viteLogger) {
        viteLogger.info(formatted);
      } else {
        console.debug(formatted, ...args);
      }
    },

    info(message: string, ...args: unknown[]): void {
      appendToLogFile(logFilePath, formatFileEntry('info', namespace, message, args));
      if (!shouldLog('info')) return;
      const formatted = formatServerConsoleMessage('info', namespace, message);
      if (viteLogger) {
        viteLogger.info(formatted);
      } else {
        console.info(formatted, ...args);
      }
    },

    warn(message: string, ...args: unknown[]): void {
      appendToLogFile(logFilePath, formatFileEntry('warn', namespace, message, args));
      if (!shouldLog('warn')) return;
      const formatted = formatServerConsoleMessage('warn', namespace, message);
      if (viteLogger) {
        viteLogger.warn(formatted);
      } else {
        console.warn(formatted, ...args);
      }
    },

    error(message: string, ...args: unknown[]): void {
      appendToLogFile(logFilePath, formatFileEntry('error', namespace, message, args));
      if (!shouldLog('error')) return;
      const formatted = formatServerConsoleMessage('error', namespace, message);
      if (viteLogger) {
        viteLogger.error(formatted);
      } else {
        console.error(formatted, ...args);
      }
    },

    time(label: string): () => void {
      const start = process.hrtime.bigint();
      return () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        const rounded = Math.round(durationMs * 100) / 100;
        instance.debug(`${label} completed in ${rounded}ms`);
      };
    },

    child(subNamespace: string): ServerLogger {
      const combined = namespace ? `${namespace}:${subNamespace}` : subNamespace;
      return createServerLogger(viteLogger, combined, logFilePath);
    },

    getLogFilePath(): string {
      return logFilePath;
    },

    writeRaw(entry: string): void {
      appendToLogFile(logFilePath, entry);
    },
  };

  return instance;
}

export const defaultServerLogger = createServerLogger();
