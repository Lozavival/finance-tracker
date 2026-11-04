import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from 'next-themes';
import { ElectronThemeSync } from '@/layout/ElectronThemeSync';

describe('ElectronThemeSync Component', () => {
  let mockGetDesktopPreferences: ReturnType<typeof vi.fn>;
  let mockSetThemeSource: ReturnType<typeof vi.fn>;
  let mockGetSystemTheme: ReturnType<typeof vi.fn>;
  let mockOnSystemThemeChange: ReturnType<typeof vi.fn>;
  let systemThemeListener: ((theme: 'dark' | 'light') => void) | null = null;
  let unsubscribeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    systemThemeListener = null;
    unsubscribeSpy = vi.fn();

    mockGetDesktopPreferences = vi.fn().mockResolvedValue({});
    mockSetThemeSource = vi.fn().mockResolvedValue('dark');
    mockGetSystemTheme = vi.fn().mockResolvedValue('dark');
    mockOnSystemThemeChange = vi.fn().mockImplementation((cb: (theme: 'dark' | 'light') => void) => {
      systemThemeListener = cb;
      return unsubscribeSpy;
    });

    window.electronAPI = {
      isElectron: true,
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn(),
      onMaximizedChange: vi.fn(),
      getSystemTheme: mockGetSystemTheme,
      setThemeSource: mockSetThemeSource,
      onSystemThemeChange: mockOnSystemThemeChange,
      getDesktopPreferences: mockGetDesktopPreferences,
      setDesktopPreference: vi.fn(),
    };
  });

  afterEach(() => {
    delete (window as Partial<Window>).electronAPI;
    vi.restoreAllMocks();
  });

  function ThemeSwitcher({ targetTheme }: { targetTheme: string }) {
    const { theme, setTheme } = useTheme();
    return (
      <div>
        <span data-testid="current-theme">{theme}</span>
        <button onClick={() => setTheme(targetTheme)}>Switch</button>
      </div>
    );
  }

  it('hydrates theme from desktop preferences on mount and updates localStorage without flickering', async () => {
    mockGetDesktopPreferences.mockResolvedValue({ theme: 'light' });

    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ElectronThemeSync />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(mockGetDesktopPreferences).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('theme')).toBe('light');
    });
  });

  it('synchronizes user theme changes to electron setThemeSource after initial hydration', async () => {
    mockGetDesktopPreferences.mockResolvedValue({ theme: 'dark' });

    const { getByText } = render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ElectronThemeSync />
        <ThemeSwitcher targetTheme="light" />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(mockGetDesktopPreferences).toHaveBeenCalledTimes(1);
    });

    act(() => {
      getByText('Switch').click();
    });

    await waitFor(() => {
      expect(mockSetThemeSource).toHaveBeenCalledWith('light');
    });
  });

  it('listens for OS system theme updates when system theme is active', async () => {
    mockGetDesktopPreferences.mockResolvedValue({ theme: 'system' });

    const { unmount } = render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ElectronThemeSync />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(mockOnSystemThemeChange).toHaveBeenCalled();
      expect(systemThemeListener).not.toBeNull();
    });

    // Simulate system OS theme change broadcast from main process
    act(() => {
      systemThemeListener?.('dark');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    unmount();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('transitions from system to light while system theme is dark without reverting', async () => {
    mockGetDesktopPreferences.mockResolvedValue({ theme: 'system' });
    mockGetSystemTheme.mockResolvedValue('dark');

    const { getByText, getByTestId } = render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ElectronThemeSync />
        <ThemeSwitcher targetTheme="light" />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    // Transition from system to light
    act(() => {
      getByText('Switch').click();
    });

    await waitFor(() => {
      expect(getByTestId('current-theme').textContent).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    // Confirm setThemeSource was synchronized down to electron
    expect(mockSetThemeSource).toHaveBeenCalledWith('light');
  });
});
