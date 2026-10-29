import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ErrorFallback } from '@/components/shared/ErrorFallback';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { I18nProvider } from '@/i18n';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Explosive test error!');
  }
  return <div>Component rendered safely</div>;
}

describe('ErrorBoundary & ErrorFallback Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Component rendered safely')).toBeInTheDocument();
  });

  it('catches render error and displays default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Explosive test error!')).toBeInTheDocument();
  });

  it('renders custom ErrorFallback with action buttons', () => {
    const error = new Error('Database schema mismatch');
    const resetFn = vi.fn();

    render(
      <I18nProvider>
        <NotificationsProvider>
          <ErrorFallback error={error} resetErrorBoundary={resetFn} />
        </NotificationsProvider>
      </I18nProvider>,
    );

    expect(screen.getByText('Database schema mismatch')).toBeInTheDocument();

    const reloadBtn = screen.getByRole('button', { name: /reload page/i });
    expect(reloadBtn).toBeInTheDocument();
    fireEvent.click(reloadBtn);
    expect(resetFn).toHaveBeenCalledTimes(1);
  });
});
