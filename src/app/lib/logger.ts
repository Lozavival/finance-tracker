/**
 * Application Logger & Diagnostic Tracing Engine
 *
 * Provides hierarchical namespaced logging, runtime log-level configuration,
 * an in-memory circular breadcrumb buffer for error tracing, safe argument serialization,
 * and global unhandled error interceptors.
 */

/* eslint-disable no-console */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  namespace: string;
  message: string;
  data?: unknown[];
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface Logger {
  trace(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  time(label: string): () => void;
  child(namespace: string): Logger;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 100,
};

const MAX_BUFFER_SIZE = 300;
const STORAGE_LOG_LEVEL_KEY = 'ft_log_level';

class LogBuffer {
  private entries: LogEntry[] = [];
  private nextId = 1;

  add(entry: Omit<LogEntry, 'id'>): void {
    if (this.entries.length >= MAX_BUFFER_SIZE) {
      this.entries.shift();
    }
    this.entries.push({
      id: this.nextId++,
      ...entry,
    });
  }

  getEntries(): readonly LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

const buffer = new LogBuffer();

function resolveInitialLogLevel(): LogLevel {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_LOG_LEVEL_KEY);
      if (stored && stored in LOG_LEVEL_PRIORITY) {
        return stored as LogLevel;
      }
    } catch {
      // Storage access blocked or restricted
    }
  }

  const isDev =
    (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)) ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

  return isDev ? 'debug' : 'warn';
}

let currentLogLevel: LogLevel = resolveInitialLogLevel();

function safeSerialize(val: unknown, depth = 0, seen = new WeakSet()): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') {
    if (typeof val === 'string' && val.length > 500) {
      return `${val.slice(0, 500)}... [truncated ${val.length - 500} chars]`;
    }
    return val;
  }
  if (typeof val === 'bigint') return `${val.toString()}n`;
  if (typeof val === 'symbol') return val.toString();
  if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;

  if (val instanceof Error) {
    return {
      name: val.name,
      message: val.message,
      stack: val.stack,
    };
  }

  if (val instanceof Date) return val.toISOString();

  if (typeof val === 'object') {
    if (depth > 3) return '[Max Depth]';
    if (seen.has(val)) return '[Circular]';
    seen.add(val);

    if (Array.isArray(val)) {
      return val.slice(0, 20).map(item => safeSerialize(item, depth + 1, seen));
    }

    const obj: Record<string, unknown> = {};
    const keys = Object.keys(val as Record<string, unknown>).slice(0, 30);
    for (const key of keys) {
      obj[key] = safeSerialize((val as Record<string, unknown>)[key], depth + 1, seen);
    }
    return obj;
  }

  return String(val);
}

function extractErrorInfo(args: unknown[]): { name: string; message: string; stack?: string } | undefined {
  for (const arg of args) {
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }
    if (arg && typeof arg === 'object' && 'error' in arg && (arg as { error: unknown }).error instanceof Error) {
      const err = (arg as { error: Error }).error;
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }
  }
  return undefined;
}

function createLoggerInstance(namespace: string): Logger {
  const prefix = namespace ? `[FinanceTracker][${namespace}]` : '[FinanceTracker]';

  const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
  };

  const record = (level: LogLevel, message: string, args: unknown[]) => {
    const errorInfo = extractErrorInfo(args);
    const serializedArgs = args.length > 0 ? (safeSerialize(args) as unknown[]) : undefined;

    buffer.add({
      timestamp: new Date().toISOString(),
      level,
      namespace: namespace || 'Root',
      message,
      data: serializedArgs,
      error: errorInfo,
    });
  };

  return {
    trace: (message: string, ...args: unknown[]) => {
      record('trace', message, args);
      if (shouldLog('trace')) {
        console.debug(prefix, message, ...args);
      }
    },
    debug: (message: string, ...args: unknown[]) => {
      record('debug', message, args);
      if (shouldLog('debug')) {
        console.debug(prefix, message, ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      record('info', message, args);
      if (shouldLog('info')) {
        console.info(prefix, message, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      record('warn', message, args);
      if (shouldLog('warn')) {
        console.warn(prefix, message, ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      record('error', message, args);
      if (shouldLog('error')) {
        console.error(prefix, message, ...args);
      }
    },
    time: (label: string): (() => void) => {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return () => {
        const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const duration = Math.round((end - start) * 100) / 100;
        record('debug', `${label} finished in ${duration}ms`, [{ durationMs: duration }]);
        if (shouldLog('debug')) {
          console.debug(prefix, `${label} finished in ${duration}ms`);
        }
      };
    },
    child: (subNamespace: string): Logger => {
      const combined = namespace ? `${namespace}:${subNamespace}` : subNamespace;
      return createLoggerInstance(combined);
    },
  };
}

const rootLogger = createLoggerInstance('');

export interface ApplicationLogger extends Logger {
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  getRecentLogs(): readonly LogEntry[];
  clearLogs(): void;
  exportLogs(): string;
  setupGlobalHandlers(): () => void;
}

export const logger: ApplicationLogger = {
  ...rootLogger,
  setLevel: (level: LogLevel): void => {
    currentLogLevel = level;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LOG_LEVEL_KEY, level);
      } catch {
        // Storage access blocked or restricted
      }
    }
    rootLogger.info(`Log level changed to "${level}"`);
  },
  getLevel: (): LogLevel => currentLogLevel,
  getRecentLogs: (): readonly LogEntry[] => buffer.getEntries(),
  clearLogs: (): void => {
    buffer.clear();
  },
  exportLogs: (): string => {
    const entries = buffer.getEntries();
    const header = [
      '=== Finance Tracker Diagnostic Logs ===',
      `Exported at: ${new Date().toISOString()}`,
      `Current log level: ${currentLogLevel}`,
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown'}`,
      `Total buffered entries: ${entries.length}`,
      '========================================',
      '',
    ].join('\n');

    const lines = entries.map(entry => {
      let line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.namespace}] ${entry.message}`;
      if (entry.data && entry.data.length > 0) {
        try {
          line += `\n  Data: ${JSON.stringify(entry.data)}`;
        } catch {
          line += `\n  Data: [Unable to serialize]`;
        }
      }
      if (entry.error) {
        line += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
          line += `\n  Stack: ${entry.error.stack}`;
        }
      }
      return line;
    });

    return `${header}${lines.join('\n\n')}\n`;
  },
  setupGlobalHandlers: (): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const windowLogger = createLoggerInstance('Window');

    const handleError = (event: ErrorEvent) => {
      windowLogger.error('Uncaught browser error:', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      windowLogger.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  },
};

// Expose diagnostic interface on window in browser environments for immediate console inspection
if (typeof window !== 'undefined') {
  (window as unknown as { __FT_LOGGER__: unknown }).__FT_LOGGER__ = {
    getRecentLogs: () => logger.getRecentLogs(),
    exportLogs: () => logger.exportLogs(),
    clearLogs: () => logger.clearLogs(),
    setLevel: (lvl: LogLevel) => logger.setLevel(lvl),
    getLevel: () => logger.getLevel(),
  };
}
