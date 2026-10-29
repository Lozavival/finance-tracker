import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useTransactionSearch } from '@/state/useTransactionSearch';
import { FinanceProvider } from '@/state/FinanceContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { I18nProvider } from '@/i18n';
import { InMemoryFinanceRepository, setFinanceRepository } from '@/data/repository';
import { createTestSettings } from '../../fixtures/test-workspace';

describe('useTransactionSearch Hook', () => {
  let repository: InMemoryFinanceRepository;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    repository = new InMemoryFinanceRepository('development');
    setFinanceRepository(repository);

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ result: 'success', rates: { BRL: 5.5 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nProvider>
        <NotificationsProvider>
          <SettingsProvider initialSettings={createTestSettings()}>
            <FinanceProvider>{children}</FinanceProvider>
          </SettingsProvider>
        </NotificationsProvider>
      </I18nProvider>
    );
  }

  it('remains idle and returns empty for short queries (< 2 chars)', () => {
    const { result } = renderHook(() => useTransactionSearch('a'), { wrapper });

    expect(result.current.status).toBe('idle');
    expect(result.current.transactions).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('debounces and executes search query returning matching transactions', async () => {
    const { result } = renderHook(() => useTransactionSearch('Salary', { debounceMs: 50 }), { wrapper });

    // Initial state transitions to loading
    expect(result.current.status).toBe('loading');

    // Wait for search to complete
    await waitFor(
      () => {
        expect(result.current.status).toBe('success');
      },
      { timeout: 2000 },
    );

    expect(result.current.transactions.length).toBeGreaterThan(0);
    expect(result.current.totalCount).toBeGreaterThan(0);
    expect(result.current.tokens).toContain('salary');
  });

  it('handles empty search results cleanly', async () => {
    const { result } = renderHook(() => useTransactionSearch('nonexistentquery123xyz', { debounceMs: 50 }), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.status).toBe('success');
      },
      { timeout: 2000 },
    );

    expect(result.current.transactions).toHaveLength(0);
    expect(result.current.totalCount).toBe(0);
  });
});
