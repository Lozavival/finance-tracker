import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTransactionActions } from '@/state/useTransactionActions';
import { FinanceProvider, useFinance } from '@/state/FinanceContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { I18nProvider } from '@/i18n';
import { InMemoryFinanceRepository, setFinanceRepository } from '@/data/repository';
import { createTestSettings } from '../../fixtures/test-workspace';
import { parseLocalDate } from '@/data/dates';

describe('useTransactionActions Hook', () => {
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

  it('manages openAddDialog and openEditDialog lifecycle', async () => {
    const { result } = renderHook(
      () => ({
        actions: useTransactionActions(),
        finance: useFinance(),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.finance.loadStatus).toBe('ready');
    });

    // Open add dialog
    act(() => {
      result.current.actions.openAddDialog();
    });
    expect(result.current.actions.dialogOpen).toBe(true);
    expect(result.current.actions.editingTarget).toBeNull();
    expect(result.current.actions.initialRecurring).toBe(false);

    // Open recurring add dialog
    act(() => {
      result.current.actions.openAddDialog({ recurring: true });
    });
    expect(result.current.actions.dialogOpen).toBe(true);
    expect(result.current.actions.initialRecurring).toBe(true);

    // Open edit dialog on a single transaction
    const targetTx = result.current.finance.transactions[0];
    act(() => {
      result.current.actions.openEditDialog(targetTx);
    });
    expect(result.current.actions.dialogOpen).toBe(true);
    expect(result.current.actions.editingTarget).not.toBeNull();
  });

  it('saves new transaction and closes dialog', async () => {
    const { result } = renderHook(
      () => ({
        actions: useTransactionActions(),
        finance: useFinance(),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.finance.loadStatus).toBe('ready');
    });

    act(() => {
      result.current.actions.openAddDialog();
    });

    await act(async () => {
      result.current.actions.saveTransaction({
        kind: 'single',
        transaction: {
          date: parseLocalDate('2026-03-25'),
          value: 4500,
          currency: 'USD',
          accountId: 'test-checking',
          typeId: 'shopping',
          paymentMethodId: 'debit',
          direction: 'expense',
          description: 'Headphones',
        },
      });
    });

    expect(result.current.actions.dialogOpen).toBe(false);
    expect(result.current.actions.editingTarget).toBeNull();
  });

  it('deletes transaction and provides undo callback', async () => {
    const { result } = renderHook(
      () => ({
        actions: useTransactionActions(),
        finance: useFinance(),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.finance.loadStatus).toBe('ready');
    });

    const targetTx = result.current.finance.transactions[0];
    act(() => {
      result.current.actions.setDeleteTarget(targetTx);
    });
    expect(result.current.actions.deleteTarget).toBe(targetTx);

    act(() => {
      result.current.actions.deleteTransaction('only-this');
    });

    expect(result.current.actions.deleteTarget).toBeNull();
    expect(result.current.finance.transactions.some(tx => tx.id === targetTx.id)).toBe(false);
  });
});
