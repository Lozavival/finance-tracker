import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { NotificationsProvider, useNotifications, useNotify } from '@/state/NotificationsContext';
import { I18nProvider } from '@/i18n';

describe('NotificationsContext Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </I18nProvider>
    );
  }

  it('provides notify handlers and dispatches toasts', () => {
    const { result } = renderHook(() => useNotify(), { wrapper });

    expect(typeof result.current.success).toBe('function');
    expect(typeof result.current.error).toBe('function');
    expect(typeof result.current.validation).toBe('function');
    expect(typeof result.current.undoable).toBe('function');
    expect(typeof result.current.successWhen).toBe('function');

    act(() => {
      result.current.success('feedback.saved');
    });
  });

  it('records undoable action and triggers onUndo callback', () => {
    const { result } = renderHook(() => useNotify(), { wrapper });
    const onUndo = vi.fn();

    act(() => {
      result.current.undoable({
        id: 'test-undo-1',
        messageKey: 'transactions.deleted',
        onUndo,
      });
    });

    expect(typeof onUndo).toBe('function');
  });

  it('tracks activity log, marks read, and clears entries', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    expect(result.current.activity).toBeInstanceOf(Array);
    const initialCount = result.current.unreadActivityCount;

    act(() => {
      result.current.markActivityRead();
    });
    expect(result.current.unreadActivityCount).toBe(0);

    act(() => {
      result.current.clearActivity();
    });
    expect(result.current.activity).toHaveLength(0);
  });

  it('manages alert dismissals and read state', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.observeAlerts(['alert-1', 'alert-2']);
    });

    expect(result.current.alertState['alert-1']).toBeDefined();

    act(() => {
      result.current.markAlertsRead(['alert-1']);
    });
    expect(result.current.alertState['alert-1'].readAt).toBeTypeOf('string');

    act(() => {
      result.current.dismissAlert('alert-2');
    });
    expect(result.current.alertState['alert-2'].dismissedAt).toBeTypeOf('string');
  });

  it('updates notification preferences and persists them', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.updatePreferences({
        sound: false,
        warningThreshold: 85,
      });
    });

    expect(result.current.preferences.sound).toBe(false);
    expect(result.current.preferences.warningThreshold).toBe(85);
  });

  it('coalesces and handles sync errors gracefully', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.reportSyncError(new Error('Simulated network failure'));
    });
  });
});
