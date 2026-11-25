import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import { QuitConfirmationDialog } from '@/layout/QuitConfirmationDialog';

describe('QuitConfirmationDialog', () => {
  let quitRequestListener: (() => void) | null = null;
  let mockQuitApp: ReturnType<typeof vi.fn>;
  let unsubscribeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    quitRequestListener = null;
    mockQuitApp = vi.fn().mockResolvedValue(undefined);
    unsubscribeSpy = vi.fn();

    window.electronAPI = {
      isElectron: true,
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      quitApp: mockQuitApp,
      onConfirmQuitRequested: vi.fn().mockImplementation((cb: () => void) => {
        quitRequestListener = cb;
        return unsubscribeSpy;
      }),
      isMaximized: vi.fn(),
      onMaximizedChange: vi.fn(),
      getSystemTheme: vi.fn(),
      setThemeSource: vi.fn(),
      onSystemThemeChange: vi.fn(),
      getDesktopPreferences: vi.fn().mockResolvedValue({}),
      setDesktopPreference: vi.fn(),
    };
  });

  afterEach(() => {
    delete (window as Partial<Window>).electronAPI;
    vi.restoreAllMocks();
  });

  it('opens confirmation dialog when confirm-quit-requested fires and cancels cleanly', () => {
    render(
      <I18nProvider>
        <QuitConfirmationDialog />
      </I18nProvider>,
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    act(() => {
      quitRequestListener?.();
    });

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/quit finance tracker\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockQuitApp).not.toHaveBeenCalled();
  });

  it('calls electronAPI.quitApp when the user confirms quit', () => {
    render(
      <I18nProvider>
        <QuitConfirmationDialog />
      </I18nProvider>,
    );

    act(() => {
      quitRequestListener?.();
    });

    fireEvent.click(screen.getByRole('button', { name: /^quit$/i }));

    expect(mockQuitApp).toHaveBeenCalledTimes(1);
  });

  it('renders nothing and does not subscribe when outside Electron', () => {
    delete (window as Partial<Window>).electronAPI;

    const { container } = render(
      <I18nProvider>
        <QuitConfirmationDialog />
      </I18nProvider>,
    );

    expect(container.firstChild).toBeNull();
  });
});
