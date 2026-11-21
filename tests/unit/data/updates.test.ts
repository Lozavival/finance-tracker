import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseSemVer,
  compareSemVer,
  isNewerVersion,
  selectLatestRelease,
  checkForAppUpdates,
  UpdateCheckFetchError,
  getUpdateCheckErrorCode,
  getUpdateCheckErrorDetails,
  GITHUB_RELEASES_PAGE_URL,
  type GitHubReleasePayload,
} from '@/data/updates';

describe('Application Update Checker & SemVer Engine', () => {
  describe('parseSemVer', () => {
    it('parses standard stable SemVer strings with or without leading v', () => {
      expect(parseSemVer('1.0.0')).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: null,
        raw: '1.0.0',
      });
      expect(parseSemVer('v2.14.5')).toEqual({
        major: 2,
        minor: 14,
        patch: 5,
        prerelease: null,
        raw: '2.14.5',
      });
      expect(parseSemVer('  V0.0.1+build.123  ')).toEqual({
        major: 0,
        minor: 0,
        patch: 1,
        prerelease: null,
        raw: '0.0.1',
      });
    });

    it('parses pre-release SemVer strings accurately', () => {
      expect(parseSemVer('v1.0.0-rc.1')).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'rc.1',
        raw: '1.0.0-rc.1',
      });
      expect(parseSemVer('1.2.0-beta.2+exp.sha.5114f85')).toEqual({
        major: 1,
        minor: 2,
        patch: 0,
        prerelease: 'beta.2',
        raw: '1.2.0-beta.2',
      });
    });

    it('returns null for malformed version strings', () => {
      expect(parseSemVer('')).toBeNull();
      expect(parseSemVer('1.0')).toBeNull();
      expect(parseSemVer('1.0.0.0')).toBeNull();
      expect(parseSemVer('v1.0.0-')).toBeNull();
      expect(parseSemVer('v1.0.0-rc..1')).toBeNull();
      expect(parseSemVer('latest')).toBeNull();
    });
  });

  describe('compareSemVer and isNewerVersion', () => {
    it('orders major, minor, and patch versions numerically', () => {
      expect(compareSemVer('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemVer('1.2.0', '1.1.9')).toBe(1);
      expect(compareSemVer('1.0.2', '1.0.1')).toBe(1);
      expect(compareSemVer('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemVer('v1.0.0', '1.0.0')).toBe(0);
    });

    it('ranks stable releases higher than pre-releases of the same version', () => {
      expect(compareSemVer('1.0.0', '1.0.0-rc.1')).toBe(1);
      expect(compareSemVer('1.0.0-rc.1', '1.0.0')).toBe(-1);
      expect(isNewerVersion('1.0.0-rc.1', '1.0.0')).toBe(true);
      expect(isNewerVersion('1.0.0', '1.0.0-rc.1')).toBe(false);
    });

    it('orders pre-release identifiers according to SemVer 2.0.0 precedence', () => {
      // alpha < beta < rc
      expect(compareSemVer('1.0.0-alpha.1', '1.0.0-beta.1')).toBe(-1);
      expect(compareSemVer('1.0.0-beta.1', '1.0.0-rc.1')).toBe(-1);
      // numeric pre-release comparison (rc.2 < rc.10)
      expect(compareSemVer('1.0.0-rc.10', '1.0.0-rc.2')).toBe(1);
      expect(isNewerVersion('1.0.0-rc.1', '1.0.0-rc.2')).toBe(true);
      // numeric identifier has lower precedence than non-numeric
      expect(compareSemVer('1.0.0-1', '1.0.0-alpha')).toBe(-1);
      // more fields has higher precedence when prefix matches
      expect(compareSemVer('1.0.0-rc.1.1', '1.0.0-rc.1')).toBe(1);
    });
  });

  describe('selectLatestRelease', () => {
    const sampleReleases: GitHubReleasePayload[] = [
      {
        tag_name: 'v1.2.0-rc.1',
        name: 'Release v1.2.0-rc.1',
        html_url: 'https://github.com/Lozavival/finance-tracker/releases/tag/v1.2.0-rc.1',
        prerelease: true,
        draft: false,
        published_at: '2026-11-20T12:00:00Z',
      },
      {
        tag_name: 'v1.1.0',
        name: 'Release v1.1.0',
        html_url: 'https://github.com/Lozavival/finance-tracker/releases/tag/v1.1.0',
        prerelease: false,
        draft: false,
        published_at: '2026-11-15T12:00:00Z',
      },
      {
        tag_name: 'v1.3.0',
        name: 'Draft Release v1.3.0',
        html_url: 'https://github.com/Lozavival/finance-tracker/releases/tag/v1.3.0',
        prerelease: false,
        draft: true,
      },
      {
        tag_name: 'v1.0.0',
        name: 'Release v1.0.0',
        prerelease: false,
        draft: false,
      },
    ];

    it('excludes drafts and pre-releases by default (includePrereleases: false)', () => {
      const selected = selectLatestRelease(sampleReleases, { includePrereleases: false });
      expect(selected).not.toBeNull();
      expect(selected?.version).toBe('1.1.0');
      expect(selected?.prerelease).toBe(false);
    });

    it('includes pre-releases when includePrereleases is true', () => {
      const selected = selectLatestRelease(sampleReleases, { includePrereleases: true });
      expect(selected).not.toBeNull();
      expect(selected?.version).toBe('1.2.0-rc.1');
      expect(selected?.prerelease).toBe(true);
    });

    it('treats SemVer pre-release tag suffixes as pre-releases even if GitHub flag is omitted', () => {
      const list: GitHubReleasePayload[] = [
        { tag_name: 'v1.0.0-beta.1', prerelease: false, draft: false },
      ];
      expect(selectLatestRelease(list, { includePrereleases: false })).toBeNull();
      const withPre = selectLatestRelease(list, { includePrereleases: true });
      expect(withPre?.version).toBe('1.0.0-beta.1');
      expect(withPre?.prerelease).toBe(true);
      expect(withPre?.htmlUrl).toBe(GITHUB_RELEASES_PAGE_URL);
    });
  });

  describe('checkForAppUpdates', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('detects available stable update when remote release is newer than currentVersion', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            tag_name: 'v1.0.0',
            name: 'Release v1.0.0',
            html_url: 'https://github.com/Lozavival/finance-tracker/releases/tag/v1.0.0',
            prerelease: false,
            draft: false,
          },
        ],
      } as unknown as Response);

      const res = await checkForAppUpdates({
        currentVersion: '1.0.0-rc.1',
        includePrereleases: false,
        timeoutMs: 1000,
      });

      expect(res.updateAvailable).toBe(true);
      expect(res.latestRelease?.version).toBe('1.0.0');
      expect(new Date(res.checkedAt).getTime()).not.toBeNaN();
    });

    it('ignores newer pre-release when includePrereleases is false, and detects it when true', async () => {
      const releasesPayload: GitHubReleasePayload[] = [
        {
          tag_name: 'v1.0.0-rc.2',
          name: 'Release v1.0.0-rc.2',
          html_url: 'https://github.com/Lozavival/finance-tracker/releases/tag/v1.0.0-rc.2',
          prerelease: true,
          draft: false,
        },
        {
          tag_name: 'v1.0.0-rc.1',
          name: 'Release v1.0.0-rc.1',
          prerelease: true,
          draft: false,
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => releasesPayload,
      } as unknown as Response);

      const stableOnly = await checkForAppUpdates({
        currentVersion: '1.0.0-rc.1',
        includePrereleases: false,
      });
      expect(stableOnly.updateAvailable).toBe(false);
      expect(stableOnly.latestRelease).toBeNull();

      const withPrereleases = await checkForAppUpdates({
        currentVersion: '1.0.0-rc.1',
        includePrereleases: true,
      });
      expect(withPrereleases.updateAvailable).toBe(true);
      expect(withPrereleases.latestRelease?.version).toBe('1.0.0-rc.2');
    });

    it('throws HTTP_ERROR when GitHub API returns non-OK status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      } as unknown as Response);

      try {
        await checkForAppUpdates({ timeoutMs: 1000 });
        expect.unreachable('Should have thrown HTTP_ERROR');
      } catch (err) {
        expect(err).toBeInstanceOf(UpdateCheckFetchError);
        expect((err as UpdateCheckFetchError).code).toBe('HTTP_ERROR');
      }
    });

    it('throws INVALID_RESPONSE when JSON payload is not an array', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Not an array' }),
      } as unknown as Response);

      try {
        await checkForAppUpdates({ timeoutMs: 1000 });
        expect.unreachable('Should have thrown INVALID_RESPONSE');
      } catch (err) {
        expect(err).toBeInstanceOf(UpdateCheckFetchError);
        expect((err as UpdateCheckFetchError).code).toBe('INVALID_RESPONSE');
      }
    });

    it('throws TIMEOUT when request exceeds timeoutMs', async () => {
      globalThis.fetch = vi.fn().mockImplementation((_url, { signal }) => {
        return new Promise((_, reject) => {
          signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      try {
        await checkForAppUpdates({ timeoutMs: 20 });
        expect.unreachable('Should have timed out');
      } catch (err) {
        expect(err).toBeInstanceOf(UpdateCheckFetchError);
        expect((err as UpdateCheckFetchError).code).toBe('TIMEOUT');
      }
    });
  });

  describe('error helpers', () => {
    it('maps UpdateCheckFetchError codes to localized error keys', () => {
      const offlineErr = new UpdateCheckFetchError('OFFLINE', 'Offline');
      expect(getUpdateCheckErrorCode(offlineErr)).toBe('OFFLINE');
      expect(getUpdateCheckErrorDetails(offlineErr)).toEqual({
        key: 'settings.updates.offlineError',
      });

      const timeoutErr = new UpdateCheckFetchError('TIMEOUT', 'Timeout');
      expect(getUpdateCheckErrorCode(timeoutErr)).toBe('TIMEOUT');
      expect(getUpdateCheckErrorDetails(timeoutErr)).toEqual({
        key: 'settings.updates.timeoutError',
      });

      const genericErr = new Error('Rate limit exceeded');
      expect(getUpdateCheckErrorCode(genericErr)).toBe('UNKNOWN');
      expect(getUpdateCheckErrorDetails(genericErr)).toEqual({
        key: 'settings.updates.fetchFailed',
        params: { error: 'Rate limit exceeded' },
      });
    });
  });
});
