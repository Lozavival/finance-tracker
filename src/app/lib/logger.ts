/**
 * Application logger
 * Formats errors and logs to console in development environments only.
 */

/* eslint-disable no-console */
export const logger = {
  error: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.error('[FinanceTracker]', ...args);
    }
  },
  warn: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.warn('[FinanceTracker]', ...args);
    }
  },
  info: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.info('[FinanceTracker]', ...args);
    }
  },
};
