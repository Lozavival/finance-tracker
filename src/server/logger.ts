/**
 * Server-Side Logger & Diagnostic Tracing
 *
 * Provides structured logging for Vite API middleware, database operations,
 * and RPC actions with timestamping, levels, namespaces, and performance timing.
 */

/* eslint-disable no-console */

import type { ViteDevServer } from 'vite';

export type ServerLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ServerLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  time(label: string): () => void;
  child(namespace: string): ServerLogger;
}

const SERVER_LOG_LEVEL_PRIORITY: Record<ServerLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function formatServerMessage(level: ServerLogLevel, namespace: string, message: string): string {
  const timestamp = new Date().toISOString();
  const ns = namespace ? `[${namespace}]` : '';
  return `[${timestamp}] [${level.toUpperCase()}]${ns} ${message}`;
}

export function createServerLogger(viteLogger?: ViteDevServer['config']['logger'], namespace = 'server'): ServerLogger {
  const minLevel: ServerLogLevel = process.env.NODE_ENV === 'test' ? 'error' : 'info';

  const shouldLog = (level: ServerLogLevel): boolean => {
    return SERVER_LOG_LEVEL_PRIORITY[level] >= SERVER_LOG_LEVEL_PRIORITY[minLevel];
  };

  const instance: ServerLogger = {
    debug(message: string, ...args: unknown[]): void {
      if (!shouldLog('debug')) return;
      const formatted = formatServerMessage('debug', namespace, message);
      if (viteLogger) {
        viteLogger.info(formatted);
      } else {
        console.debug(formatted, ...args);
      }
    },

    info(message: string, ...args: unknown[]): void {
      if (!shouldLog('info')) return;
      const formatted = formatServerMessage('info', namespace, message);
      if (viteLogger) {
        viteLogger.info(formatted);
      } else {
        console.info(formatted, ...args);
      }
    },

    warn(message: string, ...args: unknown[]): void {
      if (!shouldLog('warn')) return;
      const formatted = formatServerMessage('warn', namespace, message);
      if (viteLogger) {
        viteLogger.warn(formatted);
      } else {
        console.warn(formatted, ...args);
      }
    },

    error(message: string, ...args: unknown[]): void {
      if (!shouldLog('error')) return;
      const formatted = formatServerMessage('error', namespace, message);
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
      return createServerLogger(viteLogger, combined);
    },
  };

  return instance;
}

export const defaultServerLogger = createServerLogger();
