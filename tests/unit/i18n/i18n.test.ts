import { describe, it, expect } from 'vitest';
import { en } from '@/i18n/locales/en';
import { pt } from '@/i18n/locales/pt';

function collectLeafKeys(
  obj: Record<string, unknown>,
  prefix = '',
): Map<string, { value: string; placeholders: string[] }> {
  const map = new Map<string, { value: string; placeholders: string[] }>();

  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const subMap = collectLeafKeys(val as Record<string, unknown>, fullKey);
      for (const [subKey, subVal] of subMap.entries()) {
        map.set(subKey, subVal);
      }
    } else if (typeof val === 'string') {
      const matches = val.match(/\{(\w+)\}/g) || [];
      const placeholders = matches.map(m => m.slice(1, -1)).sort();
      map.set(fullKey, { value: val, placeholders });
    }
  }

  return map;
}

describe('Internationalization (i18n) Parity', () => {
  const enKeys = collectLeafKeys(en as unknown as Record<string, unknown>);
  const ptKeys = collectLeafKeys(pt as unknown as Record<string, unknown>);

  it('guarantees 100% symmetric key count between en and pt', () => {
    expect(enKeys.size).toBeGreaterThan(50);
    expect(ptKeys.size).toBe(enKeys.size);
  });

  it('ensures every English key exists in Portuguese with non-empty translation', () => {
    const missingInPt: string[] = [];
    const emptyInPt: string[] = [];

    for (const [key, { value }] of enKeys.entries()) {
      if (!ptKeys.has(key)) {
        missingInPt.push(key);
      } else {
        const ptVal = ptKeys.get(key)!.value;
        if (!ptVal || ptVal.trim() === '') {
          emptyInPt.push(key);
        }
      }
    }

    expect(missingInPt).toEqual([]);
    expect(emptyInPt).toEqual([]);
  });

  it('ensures every Portuguese key exists in English', () => {
    const missingInEn: string[] = [];

    for (const key of ptKeys.keys()) {
      if (!enKeys.has(key)) {
        missingInEn.push(key);
      }
    }

    expect(missingInEn).toEqual([]);
  });

  it('ensures placeholders {param} match identically between en and pt for all keys', () => {
    const mismatchedPlaceholders: Array<{ key: string; enParams: string[]; ptParams: string[] }> = [];

    for (const [key, { placeholders: enPlaceholders }] of enKeys.entries()) {
      const ptInfo = ptKeys.get(key);
      if (ptInfo) {
        if (JSON.stringify(enPlaceholders) !== JSON.stringify(ptInfo.placeholders)) {
          mismatchedPlaceholders.push({
            key,
            enParams: enPlaceholders,
            ptParams: ptInfo.placeholders,
          });
        }
      }
    }

    expect(mismatchedPlaceholders).toEqual([]);
  });
});

