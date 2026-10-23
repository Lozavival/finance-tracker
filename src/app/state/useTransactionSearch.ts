import { useState, useEffect } from 'react';
import type { Transaction } from '@/data/transactions';
import { getFinanceRepository } from '@/data/repository';
import { SEARCH_MIN_LENGTH, tokenizeSearchQuery } from '@/data/search';
import { useFinance } from './FinanceContext';
import { logger } from '@/lib/logger';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseTransactionSearchResult {
  status: SearchStatus;
  transactions: Transaction[];
  totalCount: number;
  tokens: string[];
}

export function useTransactionSearch(
  query: string,
  options?: { limit?: number; debounceMs?: number },
): UseTransactionSearchResult {
  const finance = useFinance();
  const limit = options?.limit ?? 500;
  const debounceMs = options?.debounceMs ?? 200;

  const [status, setStatus] = useState<SearchStatus>('idle');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const trimmed = query.trim();
  const tokens = tokenizeSearchQuery(trimmed);

  // We want to re-execute search when transactions list changes (e.g. after edit/delete)
  const transactionsVersion = finance.transactions;

  useEffect(() => {
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setStatus('idle');
      setTransactions([]);
      setTotalCount(0);
      return;
    }

    setStatus('loading');
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const repo = getFinanceRepository();
        const result = await repo.searchTransactions({
          text: trimmed,
          limit,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setTransactions(result.transactions);
          setTotalCount(result.totalCount);
          setStatus('success');
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        logger.error('Failed to execute transaction search:', err);
        if (!controller.signal.aborted) {
          setStatus('error');
          setTransactions([]);
          setTotalCount(0);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, limit, debounceMs, transactionsVersion]);

  return {
    status,
    transactions,
    totalCount,
    tokens,
  };
}
