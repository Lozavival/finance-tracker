import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadStoredPreferences,
  saveStoredPreferences,
  loadStoredActivity,
  saveStoredActivity,
  loadStoredAlertState,
  saveStoredAlertState,
} from '@/state/notificationStorage';
import { DEFAULT_NOTIFICATION_PREFERENCES, type ActivityEntry, type AlertState } from '@/data/notifications';

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('Notification Storage Engine', () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    // @ts-expect-error setting mock window for node environment
    globalThis.window = {} as unknown as Window & typeof globalThis;
    globalThis.localStorage = mockStorage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('preferences storage', () => {
    it('returns default preferences when storage is empty', () => {
      const prefs = loadStoredPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('saves and reloads custom preferences', () => {
      const custom = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        successToasts: false,
        budgetWarningPercent: 75,
      };

      saveStoredPreferences(custom);
      const loaded = loadStoredPreferences();
      expect(loaded.successToasts).toBe(false);
      expect(loaded.budgetWarningPercent).toBe(75);
    });

    it('falls back to default preferences when localStorage throws or contains malformed JSON', () => {
      mockStorage.setItem('finance-tracker_notifications_prefs', '{ invalid json ...');
      const loaded = loadStoredPreferences();
      expect(loaded).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });
  });

  describe('activity log storage', () => {
    it('returns empty array when storage is empty', () => {
      expect(loadStoredActivity()).toEqual([]);
    });

    it('saves and reloads activity entries', () => {
      const entries: ActivityEntry[] = [
        {
          id: 'act-1',
          level: 'success',
          messageKey: 'notifications.activity.transactionCreated',
          createdAt: new Date().toISOString(),
        },
      ];

      saveStoredActivity(entries);
      expect(loadStoredActivity()).toEqual(entries);
    });

    it('falls back to empty array when storage contains non-array JSON', () => {
      mockStorage.setItem('finance-tracker_notifications_activity', JSON.stringify({ not: 'an array' }));
      expect(loadStoredActivity()).toEqual([]);
    });
  });

  describe('alert state storage', () => {
    it('returns empty object when storage is empty', () => {
      expect(loadStoredAlertState()).toEqual({});
    });

    it('saves and reloads alert states', () => {
      const state: Record<string, AlertState> = {
        'spike-food:2026-03': {
          firstSeenAt: new Date().toISOString(),
          readAt: new Date().toISOString(),
        },
      };

      saveStoredAlertState(state);
      expect(loadStoredAlertState()).toEqual(state);
    });
  });
});
