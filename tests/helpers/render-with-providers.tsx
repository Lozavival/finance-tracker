import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/i18n';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { AppUpdatesProvider } from '@/state/AppUpdatesContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { FinanceProvider } from '@/state/FinanceContext';
import { InMemoryFinanceRepository, setFinanceRepository } from '@/data/repository';
import type { Settings } from '@/data/settings';
import { createTestSettings } from '../fixtures/test-workspace';

export interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  route?: string;
  initialSettings?: Settings;
  repository?: InMemoryFinanceRepository;
}

export function renderWithProviders(ui: ReactElement, options: ExtendedRenderOptions = {}) {
  const {
    route = '/',
    initialSettings = createTestSettings(),
    repository = new InMemoryFinanceRepository('development'),
    ...renderOptions
  } = options;

  setFinanceRepository(repository);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <I18nProvider>
          <NotificationsProvider>
            <AppUpdatesProvider>
              <SettingsProvider initialSettings={initialSettings}>
                <FinanceProvider>{children}</FinanceProvider>
              </SettingsProvider>
            </AppUpdatesProvider>
          </NotificationsProvider>
        </I18nProvider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    repository,
  };
}
