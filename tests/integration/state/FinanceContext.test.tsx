import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { FinanceProvider, useFinance } from '@/state/FinanceContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { I18nProvider } from '@/i18n';
import { InMemoryFinanceRepository, setFinanceRepository } from '@/data/repository';
import { createTestSettings } from '../../fixtures/test-workspace';
import { parseLocalDate } from '@/data/dates';

describe('FinanceContext Integration', () => {
  let repository: InMemoryFinanceRepository;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    repository = new InMemoryFinanceRepository('development');
    setFinanceRepository(repository);

    // Mock live exchange rate fetch so tests don't make network calls
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            result: 'success',
            rates: { BRL: 5.5 },
            time_last_update_utc: 'Wed, 29 Oct 2026 12:00:00 +0000',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
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

  it('loads workspace transactions, rules, and computes derived state', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadStatus).toBe('ready');
    });

    expect(result.current.transactions.length).toBeGreaterThan(0);
    expect(result.current.syncStatus).toBe('online');
    expect(result.current.ledgers).toBeDefined();
    expect(result.current.movements).toBeDefined();
  });

  it('saves new transaction draft optimistically and syncs with repository', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadStatus).toBe('ready');
    });

    const initialCount = result.current.transactions.length;

    let saved = false;
    await act(async () => {
      saved = await result.current.saveTransactionDraft({
        kind: 'single',
        transaction: {
          date: parseLocalDate('2026-03-15'),
          value: 5000,
          currency: 'USD',
          accountId: 'test-checking',
          typeId: 'food-dining',
          paymentMethodId: 'debit',
          direction: 'expense',
          description: 'Lunch at Cafe',
        },
      });
    });

    expect(saved).toBe(true);
    expect(result.current.transactions.length).toBe(initialCount + 1);
    expect(result.current.transactions.some(tx => tx.description === 'Lunch at Cafe')).toBe(true);
  });

  it('deletes transaction target and restores on undo', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadStatus).toBe('ready');
    });

    const targetTx = result.current.transactions[0];
    expect(targetTx).toBeDefined();

    let undoFn: (() => void) | undefined;
    act(() => {
      const deleteResult = result.current.deleteTransactionTarget(targetTx, 'only-this');
      undoFn = deleteResult.undo;
    });

    expect(result.current.transactions.some(tx => tx.id === targetTx.id)).toBe(false);

    // Call undo
    act(() => {
      undoFn?.();
    });

    expect(result.current.transactions.some(tx => tx.id === targetTx.id)).toBe(true);
  });

  it('handles transaction save failure gracefully and rolls back', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadStatus).toBe('ready');
    });

    // Mock saveTransactionDraft failure
    vi.spyOn(repository, 'saveTransactionDraft').mockRejectedValueOnce(new Error('Network error'));

    const initialCount = result.current.transactions.length;

    let saved = true;
    await act(async () => {
      saved = await result.current.saveTransactionDraft({
        kind: 'single',
        transaction: {
          date: parseLocalDate('2026-03-20'),
          value: 2500,
          currency: 'USD',
          accountId: 'test-checking',
          typeId: 'shopping',
          paymentMethodId: 'debit',
          direction: 'expense',
          description: 'Failed Item',
        },
      });
    });

    expect(saved).toBe(false);

    // Resync restores clean server state
    await act(async () => {
      await result.current.reloadWorkspace();
    });
    expect(result.current.transactions.length).toBe(initialCount);
  });
});
