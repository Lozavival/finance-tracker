import { logger } from '../lib/logger';

const updatesLogger = logger.child('Updates');

export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0-rc.1';
export const GITHUB_REPO_OWNER = 'Lozavival';
export const GITHUB_REPO_NAME = 'finance-tracker';
export const GITHUB_RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;
export const GITHUB_RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;

export interface ParsedSemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  raw: string;
}

export interface GitHubReleasePayload {
  tag_name?: string;
  name?: string;
  html_url?: string;
  prerelease?: boolean;
  draft?: boolean;
  published_at?: string;
}

export interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  htmlUrl: string;
  prerelease: boolean;
  publishedAt: string | null;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestRelease: ReleaseInfo | null;
  releases: GitHubReleasePayload[];
  updateAvailable: boolean;
  checkedAt: string;
}

export type UpdateCheckErrorCode = 'OFFLINE' | 'TIMEOUT' | 'HTTP_ERROR' | 'INVALID_RESPONSE' | 'UNKNOWN';

export class UpdateCheckFetchError extends Error {
  readonly code: UpdateCheckErrorCode;

  constructor(code: UpdateCheckErrorCode, message: string) {
    super(message);
    this.name = 'UpdateCheckFetchError';
    this.code = code;
  }
}

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

export function parseSemVer(versionStr: string): ParsedSemVer | null {
  if (typeof versionStr !== 'string') return null;
  const cleaned = versionStr.trim().replace(/^[vV]/, '');
  const match = SEMVER_REGEX.exec(cleaned);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) {
    return null;
  }

  const prerelease = match[4] ?? null;
  if (prerelease !== null) {
    const parts = prerelease.split('.');
    if (parts.some(p => p.length === 0 || !/^[0-9A-Za-z-]+$/.test(p))) {
      return null;
    }
  }

  const raw = `${major}.${minor}.${patch}${prerelease ? `-${prerelease}` : ''}`;
  return { major, minor, patch, prerelease, raw };
}

export function compareSemVer(a: string, b: string): number {
  const parsedA = parseSemVer(a);
  const parsedB = parseSemVer(b);

  if (!parsedA && !parsedB) return 0;
  if (!parsedA) return -1;
  if (!parsedB) return 1;

  if (parsedA.major !== parsedB.major) {
    return parsedA.major > parsedB.major ? 1 : -1;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor > parsedB.minor ? 1 : -1;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch > parsedB.patch ? 1 : -1;
  }

  // Normal release has higher precedence than a pre-release (e.g. 1.0.0 > 1.0.0-rc.1)
  if (parsedA.prerelease === null && parsedB.prerelease === null) return 0;
  if (parsedA.prerelease === null && parsedB.prerelease !== null) return 1;
  if (parsedA.prerelease !== null && parsedB.prerelease === null) return -1;

  const partsA = parsedA.prerelease!.split('.');
  const partsB = parsedB.prerelease!.split('.');
  const len = Math.min(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const idA = partsA[i];
    const idB = partsB[i];
    if (idA === idB) continue;

    const isNumA = /^\d+$/.test(idA);
    const isNumB = /^\d+$/.test(idB);

    if (isNumA && isNumB) {
      const numA = Number(idA);
      const numB = Number(idB);
      if (numA !== numB) {
        return numA > numB ? 1 : -1;
      }
      continue;
    }

    // Numeric identifiers always have lower precedence than non-numeric identifiers
    if (isNumA && !isNumB) return -1;
    if (!isNumA && isNumB) return 1;

    return idA < idB ? -1 : 1;
  }

  if (partsA.length === partsB.length) return 0;
  return partsA.length > partsB.length ? 1 : -1;
}

export function isNewerVersion(currentVersion: string, candidateVersion: string): boolean {
  if (!parseSemVer(currentVersion) || !parseSemVer(candidateVersion)) {
    return false;
  }
  return compareSemVer(candidateVersion, currentVersion) > 0;
}

export function selectLatestRelease(
  releases: GitHubReleasePayload[],
  options?: { includePrereleases?: boolean },
): ReleaseInfo | null {
  if (!Array.isArray(releases) || releases.length === 0) {
    return null;
  }

  const includePrereleases = options?.includePrereleases ?? false;
  const candidates: ReleaseInfo[] = [];

  for (const r of releases) {
    if (!r || typeof r !== 'object') continue;
    if (r.draft === true) continue;
    if (typeof r.tag_name !== 'string') continue;

    const parsed = parseSemVer(r.tag_name);
    if (!parsed) continue;

    const isPrerelease = Boolean(r.prerelease) || parsed.prerelease !== null;
    if (!includePrereleases && isPrerelease) {
      continue;
    }

    const tagName = r.tag_name.trim();
    const name = typeof r.name === 'string' && r.name.trim().length > 0 ? r.name.trim() : tagName;
    const htmlUrl =
      typeof r.html_url === 'string' && r.html_url.trim().length > 0 ? r.html_url.trim() : GITHUB_RELEASES_PAGE_URL;
    const publishedAt = typeof r.published_at === 'string' ? r.published_at : null;

    candidates.push({
      version: parsed.raw,
      tagName,
      name,
      htmlUrl,
      prerelease: isPrerelease,
      publishedAt,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => compareSemVer(b.version, a.version));
  return candidates[0];
}

export async function checkForAppUpdates(options?: {
  currentVersion?: string;
  includePrereleases?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<UpdateCheckResult> {
  const currentVersion = options?.currentVersion ?? APP_VERSION;
  const includePrereleases = options?.includePrereleases ?? false;
  const timeoutMs = options?.timeoutMs ?? 5000;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new UpdateCheckFetchError('OFFLINE', 'Connection offline');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new UpdateCheckFetchError('TIMEOUT', 'Request timed out'));
  }, timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort(options.signal?.reason);
    });
  }

  updatesLogger.debug('Checking for application updates on GitHub Releases...', {
    currentVersion,
    includePrereleases,
  });

  try {
    const res = await fetch(GITHUB_RELEASES_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      throw new UpdateCheckFetchError('HTTP_ERROR', `GitHub Releases API returned status ${res.status}`);
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new UpdateCheckFetchError('INVALID_RESPONSE', 'Invalid release list payload received');
    }

    const releases = data as GitHubReleasePayload[];
    const latestRelease = selectLatestRelease(releases, { includePrereleases });
    const updateAvailable = latestRelease !== null && isNewerVersion(currentVersion, latestRelease.version);

    const result: UpdateCheckResult = {
      currentVersion,
      latestRelease,
      releases,
      updateAvailable,
      checkedAt: new Date().toISOString(),
    };

    updatesLogger.info('Application update check completed:', {
      currentVersion,
      latestVersion: latestRelease?.version ?? null,
      updateAvailable,
    });

    return result;
  } catch (err) {
    updatesLogger.warn('Failed to check for application updates:', err);
    if (err instanceof UpdateCheckFetchError) {
      throw err;
    }

    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason instanceof UpdateCheckFetchError) {
        throw reason;
      }
      throw new UpdateCheckFetchError('TIMEOUT', 'Request timed out');
    }

    if (
      (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      (err instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(err.message))
    ) {
      throw new UpdateCheckFetchError('OFFLINE', 'Connection offline');
    }

    throw new UpdateCheckFetchError('UNKNOWN', err instanceof Error ? err.message : 'Unknown network error');
  } finally {
    clearTimeout(timer);
  }
}

export function getUpdateCheckErrorCode(err: unknown): UpdateCheckErrorCode {
  if (err instanceof UpdateCheckFetchError) {
    return err.code;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'OFFLINE';
  }
  if (err instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(err.message)) {
    return 'OFFLINE';
  }
  return 'UNKNOWN';
}

export type UpdateCheckErrorKey =
  'settings.updates.offlineError' | 'settings.updates.timeoutError' | 'settings.updates.fetchFailed';

export function getUpdateCheckErrorDetails(err: unknown): {
  key: UpdateCheckErrorKey;
  params?: { error: string };
} {
  const code = getUpdateCheckErrorCode(err);
  if (code === 'OFFLINE') {
    return { key: 'settings.updates.offlineError' };
  }
  if (code === 'TIMEOUT') {
    return { key: 'settings.updates.timeoutError' };
  }
  return {
    key: 'settings.updates.fetchFailed',
    params: { error: err instanceof Error ? err.message : 'Unknown error' },
  };
}
