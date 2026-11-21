import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AppUpdatesCard } from '@/features/settings/AppUpdatesCard';
import { AppUpdatesProvider, UPDATE_PREFS_STORAGE_KEY } from '@/state/AppUpdatesContext';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { I18nProvider } from '@/i18n';

function renderUpdatesCard(currentVersion = '1.0.0-rc.1') {
  return render(
    <I18nProvider>
      <NotificationsProvider>
        <AppUpdatesProvider currentVersion={currentVersion}>
          <AppUpdatesCard />
        </AppUpdatesProvider>
      </NotificationsProvider>
    </I18nProvider>,
  );
}

describe('AppUpdatesCard & AppUpdatesProvider', () => {
  let mockGetDesktopPreferences: ReturnType<typeof vi.fn>;
  let mockSetDesktopPreference: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    mockGetDesktopPreferences = vi.fn().mockResolvedValue({});
    mockSetDesktopPreference = vi.fn().mockResolvedValue(undefined);

    window.electronAPI = {
      isElectron: true,
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn(),
      onMaximizedChange: vi.fn(),
      getSystemTheme: vi.fn(),
      setThemeSource: vi.fn(),
      onSystemThemeChange: vi.fn(),
      getDesktopPreferences: mockGetDesktopPreferences,
      setDesktopPreference: mockSetDesktopPreference,
    };
  });

  afterEach(() => {
    delete (window as Partial<Window>).electronAPI;
    cleanup();
  });

  it('does not render or check for updates in the web version (when window.electronAPI is absent)', () => {
    delete (window as Partial<Window>).electronAPI;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const { container } = renderUpdatesCard('1.0.0-rc.1');
    expect(container.firstChild).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('automatically checks for updates on desktop startup and displays available full release', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            tag_name: 'v1.0.0',
            name: 'Release v1.0.0',
            html_url: 'https://github.com/Lozavival/finance-tracker/releases/tag/v1.0.0',
            prerelease: false,
            draft: false,
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderUpdatesCard('1.0.0-rc.1');

    await waitFor(() => {
      expect(screen.getByText('v1.0.0 available')).toBeInTheDocument();
    });

    expect(screen.getByText('Update v1.0.0 is available')).toBeInTheDocument();
    const downloadLink = screen.getByRole('link', { name: /view & download v1\.0\.0 on github/i });
    expect(downloadLink).toHaveAttribute('href', 'https://github.com/Lozavival/finance-tracker/releases/tag/v1.0.0');
  });

  it('defaults to Full Releases Only and switches to Include Pre-releases when toggled', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            tag_name: 'v1.0.0-rc.2',
            name: 'Release v1.0.0-rc.2',
            html_url: 'https://github.com/Lozavival/finance-tracker/releases/tag/v1.0.0-rc.2',
            prerelease: true,
            draft: false,
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderUpdatesCard('1.0.0-rc.1');

    // On default "Full Releases Only" channel, v1.0.0-rc.2 is ignored so app reports Up to date
    await waitFor(() => {
      expect(screen.getByText('Up to date')).toBeInTheDocument();
    });

    const stableToggle = screen.getByRole('button', { name: /full releases only/i });
    const prereleaseToggle = screen.getByRole('button', { name: /include pre-releases/i });

    expect(stableToggle).toHaveAttribute('aria-pressed', 'true');
    expect(prereleaseToggle).toHaveAttribute('aria-pressed', 'false');

    // Switch channel to "Include Pre-releases"
    fireEvent.click(prereleaseToggle);

    expect(prereleaseToggle).toHaveAttribute('aria-pressed', 'true');
    expect(stableToggle).toHaveAttribute('aria-pressed', 'false');

    // Immediately re-evaluates cached releases and surfaces v1.0.0-rc.2
    await waitFor(() => {
      expect(screen.getByText('v1.0.0-rc.2 available')).toBeInTheDocument();
    });
    expect(screen.getByText('Pre-release')).toBeInTheDocument();

    // Persisted in localStorage and desktop preferences
    const stored = JSON.parse(localStorage.getItem(UPDATE_PREFS_STORAGE_KEY) || '{}');
    expect(stored.includePrereleases).toBe(true);
    expect(mockSetDesktopPreference).toHaveBeenCalledWith('includePrereleases', true);
  });

  it('triggers manual update check when Check for Updates button is clicked and displays error on failure', async () => {
    // First call (startup silent check) fails silently
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response('Server error', { status: 500 }));
      }
      return Promise.resolve(new Response('Rate limit exceeded', { status: 403 }));
    });

    renderUpdatesCard('1.0.0-rc.1');

    // Silent startup check should not show an error alert
    await waitFor(() => {
      expect(callCount).toBe(1);
    });
    expect(screen.queryByText(/check failed/i)).not.toBeInTheDocument();

    // Click "Check for Updates" manually
    const checkBtn = screen.getByRole('button', { name: /check for updates/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText('Check failed')).toBeInTheDocument();
    });
    expect(screen.getByText(/GitHub Releases API returned status 403/i)).toBeInTheDocument();
  });
});
