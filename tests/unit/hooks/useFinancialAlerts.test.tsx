import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useFinancialAlerts } from '@/state/useFinancialAlerts';
import { FinanceProvider, useFinance } from '@/state/FinanceContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { I18nProvider } from '@/i18n';
import { InMemoryFinanceRepository, setFinanceRepository } from '@/data/repository';
import { createTestSettings } from '../../fixtures/test-workspace';

describe('useFinancialAlerts Hook', () => {
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

  it('evaluates active alerts, unread counts, and severity flags', async () => {
    const { result } = renderHook(
      () => ({
        financialAlerts: useFinancialAlerts(),
        finance: useFinance(),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.finance.loadStatus).toBe('ready');
    });

    expect(result.current.financialAlerts.alerts).toBeInstanceOf(Array);
    expect(typeof result.current.financialAlerts.unreadCount).toBe('number');
    expect(typeof result.current.financialAlerts.hasCritical).toBe('boolean');
  });

  it('derives alert items containing required title, severity, and keys', async () => {
    const { result } = renderHook(
      () => ({
        financialAlerts: useFinancialAlerts(),
        finance: useFinance(),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.finance.loadStatus).toBe('ready');
    });

    for (const alert of result.current.financialAlerts.alerts) {
      expect(alert.key).toBeDefined();
      expect(['warning', 'critical', 'info', 'success']).toContain(alert.severity);
      expect(alert.titleKey).toBeDefined();
      expect(alert.descriptionKey).toBeDefined();
    }
  });
});
