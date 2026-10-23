import type { Transaction } from '@/data/transactions';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_TOKENS = 8;
export const TRIGRAM_MIN_TOKEN = 3;

/**
 * Lowercase and strip diacritics ("Café" -> "cafe").
 * Also registered as SQLite custom function `fold`.
 */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Tokenizes search query into clean, folded, unique terms.
 * "  Pão  de AÇÚCAR " -> ["pao", "de", "acucar"] (max 8)
 */
export function tokenizeSearchQuery(text: string): string[] {
  const folded = foldText(text.trim());
  if (!folded) return [];

  // Split on whitespace or non-alphanumeric characters (keeping basic letters and numbers)
  const tokens = folded.split(/[^\p{L}\p{N}]+/gu).filter(token => token.length > 0);

  const unique = Array.from(new Set(tokens));
  return unique.slice(0, SEARCH_MAX_TOKENS);
}

/**
 * Build FTS5 match expression: ["pao", "acucar"] -> '"pao" AND "acucar"'
 * Quotes are escaped by doubling.
 */
export function buildFtsMatchExpression(tokens: string[]): string | null {
  const validTokens = tokens.filter(t => t.length >= TRIGRAM_MIN_TOKEN).map(t => `"${t.replace(/"/g, '""')}"`);

  if (validTokens.length === 0) return null;
  return validTokens.join(' AND ');
}

/**
 * Escape %, _, and \ for SQL LIKE ... ESCAPE '\'
 */
export function escapeLikePattern(token: string): string {
  return token.replace(/([%_\\])/g, '\\$1');
}

export type MatchRange = {
  start: number;
  end: number;
};

/**
 * Finds character ranges in original string that match any of the folded tokens.
 * Handles diacritics/accents correctly by mapping code-point indices back to original positions.
 */
export function findMatchRanges(text: string, tokens: string[]): MatchRange[] {
  if (!text || tokens.length === 0) return [];

  // Create an index mapping from folded string indices back to original string indices
  // Normalizing to NFD separates base letters and diacritics
  const foldedTokens = tokens.map(t => foldText(t)).filter(t => t.length > 0);
  if (foldedTokens.length === 0) return [];

  // For robust mapping across Unicode combining characters, we can map character indices
  const originalChars = Array.from(text);
  let foldedTextStr = '';
  // foldedIndexToOriginal maps each index in foldedTextStr to the start index in originalChars
  const foldedIndexToOriginal: number[] = [];

  for (let i = 0; i < originalChars.length; i++) {
    const char = originalChars[i];
    const foldedChar = foldText(char);
    for (let j = 0; j < foldedChar.length; j++) {
      foldedIndexToOriginal.push(i);
    }
    foldedTextStr += foldedChar;
  }

  const rawRanges: MatchRange[] = [];

  for (const token of foldedTokens) {
    let searchStart = 0;
    while (searchStart <= foldedTextStr.length - token.length) {
      const matchIndex = foldedTextStr.indexOf(token, searchStart);
      if (matchIndex === -1) break;

      const foldedEnd = matchIndex + token.length - 1;
      const origStartCharIdx = foldedIndexToOriginal[matchIndex];
      const origEndCharIdx = foldedIndexToOriginal[foldedEnd];

      // Convert char array indices to string slice positions
      let strStart = 0;
      for (let k = 0; k < origStartCharIdx; k++) {
        strStart += originalChars[k].length;
      }
      let strEnd = strStart;
      for (let k = origStartCharIdx; k <= origEndCharIdx; k++) {
        strEnd += originalChars[k].length;
      }

      rawRanges.push({ start: strStart, end: strEnd });
      searchStart = matchIndex + 1;
    }
  }

  if (rawRanges.length === 0) return [];

  // Sort and merge overlapping or adjacent ranges
  rawRanges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: MatchRange[] = [];
  let current = { ...rawRanges[0] };

  for (let i = 1; i < rawRanges.length; i++) {
    const next = rawRanges[i];
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Past/today rows first (newest first), then future rows (soonest first).
 */
export function compareSearchOrder(today: Date): (a: Transaction, b: Transaction) => number {
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

  return (a: Transaction, b: Transaction) => {
    const aTime = a.date.getTime();
    const bTime = b.date.getTime();
    const aIsFuture = aTime > todayTime;
    const bIsFuture = bTime > todayTime;

    if (aIsFuture !== bIsFuture) {
      return aIsFuture ? 1 : -1; // past/today first
    }

    if (!aIsFuture) {
      // Past transactions: newest first
      return bTime - aTime || b.id.localeCompare(a.id);
    } else {
      // Future transactions: closest first
      return aTime - bTime || a.id.localeCompare(b.id);
    }
  };
}

export type SearchResultGroup = {
  key: string;
  kind: 'single' | 'recurring' | 'installments' | 'transfer';
  representative: Transaction;
  count: number;
};

/**
 * Collapses recurring series, installment groups, and transfers for the preview dropdown.
 * Preserves the order of the first encountered representative.
 */
export function collapseSearchResults(transactions: Transaction[]): SearchResultGroup[] {
  const groups: SearchResultGroup[] = [];
  const groupMap = new Map<string, SearchResultGroup>();

  for (const tx of transactions) {
    let key: string;
    let kind: SearchResultGroup['kind'];

    if (tx.recurring) {
      key = `rec:${tx.recurring.ruleId}`;
      kind = 'recurring';
    } else if (tx.installment) {
      key = `inst:${tx.installment.groupId}`;
      kind = 'installments';
    } else if (tx.transferId) {
      key = `tr:${tx.transferId}`;
      kind = 'transfer';
    } else {
      key = `tx:${tx.id}`;
      kind = 'single';
    }

    let existing = groupMap.get(key);
    if (!existing) {
      existing = {
        key,
        kind,
        representative: tx,
        count: 0,
      };
      groupMap.set(key, existing);
      groups.push(existing);
    }

    existing.count += 1;

    // For installments, we want representative to have total accrual value if possible
    if (kind === 'installments' && tx.installment) {
      // If representative isn't already accumulating, we can update or keep the first one
      if (existing.count === 1) {
        existing.representative = {
          ...tx,
          installment: {
            ...tx.installment,
            number: -1, // Accrual style
          },
        };
      } else {
        existing.representative = {
          ...existing.representative,
          value: existing.representative.value + tx.value,
        };
      }
    } else if (kind === 'transfer' && tx.direction === 'expense') {
      // Prefer outgoing (expense) leg as representative for transfers
      existing.representative = tx;
    }
  }

  return groups;
}
