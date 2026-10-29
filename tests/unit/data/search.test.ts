import { describe, it, expect } from 'vitest';
import {
  foldText,
  tokenizeSearchQuery,
  buildFtsMatchExpression,
  escapeLikePattern,
  findMatchRanges,
  compareSearchOrder,
  collapseSearchResults,
  matchAccounts,
} from '@/data/search';
import { parseLocalDate } from '@/data/dates';
import type { Transaction } from '@/data/transactions';
import type { AccountConfig } from '@/data/settings';

describe('Search & Normalization Engine', () => {
  describe('foldText and tokenizeSearchQuery', () => {
    it('folds text by removing diacritics and lowercasing', () => {
      expect(foldText('Café & Pão de Açúcar')).toBe('cafe & pao de acucar');
      expect(foldText('Übergrößenträger')).toBe('ubergroßentrager');
    });

    it('tokenizes search queries into unique folded terms capped at 8', () => {
      const query = '  Pão   de AÇÚCAR café pão café  ';
      const tokens = tokenizeSearchQuery(query);
      expect(tokens).toEqual(['pao', 'de', 'acucar', 'cafe']);

      const longQuery = 'one two three four five six seven eight nine ten';
      expect(tokenizeSearchQuery(longQuery)).toHaveLength(8);
    });

    it('returns empty array for empty or whitespace query', () => {
      expect(tokenizeSearchQuery('')).toEqual([]);
      expect(tokenizeSearchQuery('   ')).toEqual([]);
    });
  });

  describe('buildFtsMatchExpression and escapeLikePattern', () => {
    it('builds trigram FTS match expression for tokens with length >= 3', () => {
      const expr = buildFtsMatchExpression(['pao', 'acucar', 'de']); // 'de' has length 2 < 3
      expect(expr).toBe('"pao" AND "acucar"');
    });

    it('escapes internal quotes in FTS match expressions', () => {
      const expr = buildFtsMatchExpression(['mac"book']);
      expect(expr).toBe('"mac""book"');
    });

    it('returns null if no tokens qualify for FTS trigram index', () => {
      expect(buildFtsMatchExpression(['a', 'ab'])).toBeNull();
      expect(buildFtsMatchExpression([])).toBeNull();
    });

    it('escapes LIKE special characters %, _, and \\', () => {
      expect(escapeLikePattern('100%_val\\test')).toBe('100\\%\\_val\\\\test');
    });
  });

  describe('findMatchRanges', () => {
    it('finds character match ranges in original string mapping diacritics correctly', () => {
      const original = 'Delicioso Café Gelado';
      const ranges = findMatchRanges(original, ['cafe']);
      expect(ranges).toHaveLength(1);
      const matchSlice = original.slice(ranges[0].start, ranges[0].end);
      expect(matchSlice).toBe('Café');
    });

    it('merges overlapping or adjacent match ranges', () => {
      const original = 'Supermarket';
      // 'super' (0..5) and 'market' (5..11) should merge to (0..11)
      const ranges = findMatchRanges(original, ['super', 'market']);
      expect(ranges).toHaveLength(1);
      expect(original.slice(ranges[0].start, ranges[0].end)).toBe('Supermarket');
    });
  });

  describe('compareSearchOrder', () => {
    const today = parseLocalDate('2026-03-15');
    const comparator = compareSearchOrder(today);

    it('orders past/today rows newest first, before future rows', () => {
      const pastRecent: Transaction = {
        id: 'tx-1',
        date: parseLocalDate('2026-03-10'),
        description: 'Past Recent',
        typeId: 'food-dining',
        direction: 'expense',
        value: 100,
        currency: 'USD',
        accountId: 'acc',
      };
      const pastOlder: Transaction = {
        id: 'tx-2',
        date: parseLocalDate('2026-02-10'),
        description: 'Past Older',
        typeId: 'food-dining',
        direction: 'expense',
        value: 100,
        currency: 'USD',
        accountId: 'acc',
      };
      const futureSoon: Transaction = {
        id: 'tx-3',
        date: parseLocalDate('2026-03-20'),
        description: 'Future Soon',
        typeId: 'food-dining',
        direction: 'expense',
        value: 100,
        currency: 'USD',
        accountId: 'acc',
      };
      const futureLater: Transaction = {
        id: 'tx-4',
        date: parseLocalDate('2026-04-10'),
        description: 'Future Later',
        typeId: 'food-dining',
        direction: 'expense',
        value: 100,
        currency: 'USD',
        accountId: 'acc',
      };

      const sorted = [futureLater, pastOlder, futureSoon, pastRecent].sort(comparator);
      expect(sorted.map(s => s.id)).toEqual(['tx-1', 'tx-2', 'tx-3', 'tx-4']);
    });
  });

  describe('collapseSearchResults', () => {
    it('collapses installment series and accumulates total value', () => {
      const txs: Transaction[] = [
        {
          id: 'i1',
          date: parseLocalDate('2026-01-10'),
          description: 'Phone (1/2)',
          typeId: 'shopping',
          direction: 'expense',
          value: 30000,
          currency: 'USD',
          accountId: 'card',
          installment: { groupId: 'phone-grp', number: 1, total: 2 },
        },
        {
          id: 'i2',
          date: parseLocalDate('2026-02-10'),
          description: 'Phone (2/2)',
          typeId: 'shopping',
          direction: 'expense',
          value: 30000,
          currency: 'USD',
          accountId: 'card',
          installment: { groupId: 'phone-grp', number: 2, total: 2 },
        },
      ];

      const groups = collapseSearchResults(txs);
      expect(groups).toHaveLength(1);
      expect(groups[0].kind).toBe('installments');
      expect(groups[0].count).toBe(2);
      expect(groups[0].representative.value).toBe(60000);
      expect(groups[0].representative.installment?.number).toBe(-1);
    });
  });

  describe('matchAccounts', () => {
    const accounts: AccountConfig[] = [
      {
        id: 'chk',
        name: 'Nubank Checking',
        kind: 'Checking',
        currencies: ['BRL'],
        openingDate: parseLocalDate('2026-01-01'),
        initials: 'NU',
        color: 'purple',
      },
      {
        id: 'card',
        name: 'Chase Sapphire',
        kind: 'Checking',
        currencies: ['USD'],
        openingDate: parseLocalDate('2026-01-01'),
        initials: 'CS',
        color: 'blue',
        card: { name: 'Sapphire Preferred', closingDay: 15, dueDay: 25, limit: 1000000 },
      },
      {
        id: 'arch',
        name: 'Old Account',
        kind: 'Savings',
        currencies: ['USD'],
        openingDate: parseLocalDate('2026-01-01'),
        initials: 'OA',
        color: 'slate',
        archived: true,
      },
    ];

    it('matches accounts by name, kind, card name, or initials', () => {
      const matchNubank = matchAccounts(accounts, 'nubank');
      expect(matchNubank).toHaveLength(1);
      expect(matchNubank[0].account.id).toBe('chk');

      const matchCard = matchAccounts(accounts, 'sapphire');
      expect(matchCard).toHaveLength(1);
      expect(matchCard[0].account.id).toBe('card');

      // Archived accounts should be excluded
      const matchArchived = matchAccounts(accounts, 'old');
      expect(matchArchived).toHaveLength(0);
    });
  });
});

