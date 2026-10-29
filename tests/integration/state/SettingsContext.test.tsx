import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '@/state/SettingsContext';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { I18nProvider } from '@/i18n';
import { InMemoryFinanceRepository, setFinanceRepository } from '@/data/repository';
import { createTestSettings } from '../../fixtures/test-workspace';

describe('SettingsContext Integration', () => {
  let repository: InMemoryFinanceRepository;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    repository = new InMemoryFinanceRepository('development');
    setFinanceRepository(repository);
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nProvider>
        <NotificationsProvider>
          <SettingsProvider initialSettings={createTestSettings()}>{children}</SettingsProvider>
        </NotificationsProvider>
      </I18nProvider>
    );
  }

  it('provides derived maps and category/method lookups', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.accountMap).toBeInstanceOf(Map);
    expect(result.current.typeMap).toBeInstanceOf(Map);
    expect(result.current.methodMap).toBeInstanceOf(Map);

    expect(result.current.incomeTypes.length).toBeGreaterThan(0);
    expect(result.current.expenseTypes.length).toBeGreaterThan(0);

    // Lookups
    const checkingAcc = result.current.findAccount('test-checking');
    expect(checkingAcc).toBeDefined();
    expect(checkingAcc?.name).toBe('Checking Account');

    expect(result.current.isCreditCard('credit-card')).toBe(true);
    expect(result.current.isCreditCard('cash')).toBe(false);
  });

  it('optimistically dispatches type/add and persists to repository', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    let success = false;
    await act(async () => {
      success = await result.current.dispatch({
        type: 'type/add',
        payload: {
          id: 'custom-type-1',
          name: 'Consulting',
          direction: 'income',
          color: 'emerald',
          icon: 'briefcase',
        },
      });
    });

    expect(success).toBe(true);
    expect(result.current.findType('custom-type-1')).toBeDefined();
    expect(result.current.findType('custom-type-1')?.name).toBe('Consulting');
  });

  it('optimistically dispatches type/update and updates derived typeMap', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    await act(async () => {
      await result.current.dispatch({
        type: 'type/update',
        payload: {
          id: 'income',
          changes: { name: 'Primary Salary' },
        },
      });
    });

    expect(result.current.findType('income')?.name).toBe('Primary Salary');
  });

  it('optimistically dispatches goals/updateMode and persists', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    let success = false;
    await act(async () => {
      success = await result.current.dispatch({
        type: 'goals/updateMode',
        payload: {
          mode: 'fixed',
        },
      });
    });

    expect(success).toBe(true);
    expect(result.current.settings.goals.mode).toBe('fixed');
  });

  it('reports sync error and returns false when persistence fails', async () => {
    // Force repository failure on updateGoalsMode
    vi.spyOn(repository, 'updateGoalsMode').mockRejectedValueOnce(new Error('Persistence failed'));

    const { result } = renderHook(() => useSettings(), { wrapper });

    let success = true;
    await act(async () => {
      success = await result.current.dispatch({
        type: 'goals/updateMode',
        payload: {
          mode: 'percentage',
        },
      });
    });

    expect(success).toBe(false);
  });
});
