import { HttpFinanceRepository } from './httpRepository';
import type { FinanceRepository } from './types';

export type { FinanceRepository, SaveTransactionResult, TransactionQuery, WorkspaceSnapshot } from './types';

export { HttpFinanceRepository } from './httpRepository';
export { InMemoryFinanceRepository } from './inMemoryRepository';

let defaultRepository: FinanceRepository | null = null;

export function getFinanceRepository(): FinanceRepository {
  if (!defaultRepository) {
    defaultRepository = new HttpFinanceRepository('/api');
  }
  return defaultRepository;
}

export function setFinanceRepository(repo: FinanceRepository): void {
  defaultRepository = repo;
}
