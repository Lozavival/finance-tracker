import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, flushRemoteLogs } from '@/lib/logger';

describe('Client Logger Remote Ingestion Integration', () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Provide window and fetch in node test runner
    // @ts-expect-error setting mock window for node environment
    globalThis.window = {} as unknown as Window & typeof globalThis;
    logger.clearLogs();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  it('buffers and flushes warn and error events to /api/logs with keepalive', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    let capturedKeepalive = false;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      capturedUrl = String(url);
      capturedBody = options?.body as string;
      capturedKeepalive = Boolean(options?.keepalive);
      return Promise.resolve({ ok: true, status: 200 });
    });

    logger.warn('Client warning event', { feature: 'auth' });
    logger.error('Client error event', new Error('NetworkTimeout'));

    await flushRemoteLogs();

    expect(capturedUrl).toBe('/api/logs');
    expect(capturedKeepalive).toBe(true);

    const parsed = JSON.parse(capturedBody) as { entries: Array<{ level: string; message: string }> };
    expect(parsed.entries.length).toBe(2);
    expect(parsed.entries[0].level).toBe('warn');
    expect(parsed.entries[0].message).toBe('Client warning event');
    expect(parsed.entries[1].level).toBe('error');
    expect(parsed.entries[1].message).toBe('Client error event');
  });

  it('handles remote ingestion failure gracefully without throwing or recursion', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Offline'));

    logger.error('Another error');

    // Should not throw
    await expect(flushRemoteLogs()).resolves.toBeUndefined();
  });
});

