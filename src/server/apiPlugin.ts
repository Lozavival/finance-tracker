import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';
import { createDatabaseConnection } from '../db/client';
import { SqliteRepository } from './sqliteRepository';
import {
  deserializeAccount,
  deserializeDraft,
  deserializeEditingTarget,
  deserializeTransaction,
  serializeRecurringRule,
  serializeSnapshot,
  serializeTransaction,
  type SerializedAccountConfig,
  type SerializedEditingTarget,
  type SerializedTransaction,
  type SerializedTransactionDraft,
} from '../app/data/repository/serialization';
import { parseLocalDate } from '../app/data/dates';
import type { AccountConfig, PaymentMethodConfig, Settings, TransactionTypeConfig } from '../app/data/settings';
import type { GoalCategory } from '../app/data/goals';
import type { SupportedCurrency, SupportedLocale } from '../app/i18n/types';

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function createFinanceApiMiddleware(dbPath?: string) {
  let repo: SqliteRepository | null = null;

  const getRepo = (): SqliteRepository => {
    if (!repo) {
      const conn = createDatabaseConnection(dbPath);
      repo = new SqliteRepository(conn);
    }
    return repo;
  };

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/')) {
      next();
      return;
    }

    try {
      const url = new URL(req.url, 'http://localhost');
      const repository = getRepo();

      if (req.method === 'GET' && url.pathname === '/api/workspace') {
        const windowDaysParam = url.searchParams.get('windowDays');
        const windowDays = windowDaysParam !== null ? Number(windowDaysParam) : 90;
        const snapshot = await repository.loadWorkspace(Number.isFinite(windowDays) ? windowDays : 90);
        sendJson(res, 200, serializeSnapshot(snapshot));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/transactions') {
        const fromDateStr = url.searchParams.get('fromDate');
        const toDateStr = url.searchParams.get('toDate');
        const accountId = url.searchParams.get('accountId') ?? undefined;

        const txs = await repository.fetchTransactions({
          fromDate: fromDateStr ? parseLocalDate(fromDateStr) : undefined,
          toDate: toDateStr ? parseLocalDate(toDateStr) : undefined,
          accountId,
        });
        sendJson(res, 200, { transactions: txs.map(serializeTransaction) });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/rpc') {
        const body = await readJsonBody(req);
        const action = body.action as string;
        const payload = (body.payload ?? {}) as Record<string, unknown>;

        switch (action) {
          case 'saveTransactionDraft': {
            const draft = deserializeDraft(payload.draft as SerializedTransactionDraft);
            const editingTarget = deserializeEditingTarget(
              payload.editingTarget as SerializedEditingTarget | null | undefined,
            );
            const result = await repository.saveTransactionDraft(draft, editingTarget);
            sendJson(res, 200, {
              transactions: result.transactions.map(serializeTransaction),
              recurringRules: result.recurringRules.map(serializeRecurringRule),
            });
            return;
          }

          case 'deleteTransactionTarget': {
            const target = deserializeTransaction(payload.target as SerializedTransaction);
            const scope = payload.scope as 'only-this' | 'this-and-future' | 'all' | undefined;
            const result = await repository.deleteTransactionTarget(target, scope);
            sendJson(res, 200, {
              transactions: result.transactions.map(serializeTransaction),
              recurringRules: result.recurringRules.map(serializeRecurringRule),
            });
            return;
          }

          case 'cancelRecurringRule': {
            const ruleId = payload.ruleId as string;
            const effectiveDate = parseLocalDate(payload.effectiveDate as string);
            const result = await repository.cancelRecurringRule(ruleId, effectiveDate);
            sendJson(res, 200, {
              transactions: result.transactions.map(serializeTransaction),
              recurringRules: result.recurringRules.map(serializeRecurringRule),
            });
            return;
          }

          case 'deleteRecurringRule': {
            const ruleId = payload.ruleId as string;
            const result = await repository.deleteRecurringRule(ruleId);
            sendJson(res, 200, {
              transactions: result.transactions.map(serializeTransaction),
              recurringRules: result.recurringRules.map(serializeRecurringRule),
            });
            return;
          }

          case 'createAccount': {
            const account = deserializeAccount(payload.account as SerializedAccountConfig);
            await repository.createAccount(account);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updateAccount': {
            const id = payload.id as string;
            const { openingDate: rawOpeningDate, ...restChanges } = payload.changes as Partial<
              Omit<SerializedAccountConfig, 'id'>
            >;
            const changes: Partial<Omit<AccountConfig, 'id'>> = {
              ...restChanges,
              ...(rawOpeningDate ? { openingDate: parseLocalDate(rawOpeningDate) } : {}),
            };
            await repository.updateAccount(id, changes);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'archiveAccount': {
            const id = payload.id as string;
            const cancelRecurrences = Boolean(payload.cancelRecurrences);
            const effectiveDate = payload.effectiveDate ? parseLocalDate(payload.effectiveDate as string) : undefined;
            await repository.archiveAccount(id, cancelRecurrences, effectiveDate);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'restoreAccount': {
            const id = payload.id as string;
            await repository.restoreAccount(id);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'deleteAccount': {
            const id = payload.id as string;
            await repository.deleteAccount(id);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'createTransactionType': {
            await repository.createTransactionType(payload.type as TransactionTypeConfig);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updateTransactionType': {
            await repository.updateTransactionType(
              payload.id as string,
              payload.changes as Partial<Omit<TransactionTypeConfig, 'id'>>,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'reorderTransactionTypes': {
            await repository.reorderTransactionTypes(
              payload.direction as 'income' | 'expense',
              payload.orderedIds as string[],
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'reassignAndDeleteTransactionType': {
            await repository.reassignAndDeleteTransactionType(
              payload.fromTypeId as string,
              payload.toTypeId as string | undefined,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'createPaymentMethod': {
            await repository.createPaymentMethod(payload.method as PaymentMethodConfig);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updatePaymentMethod': {
            await repository.updatePaymentMethod(
              payload.id as string,
              payload.changes as Partial<Omit<PaymentMethodConfig, 'id'>>,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'reorderPaymentMethods': {
            await repository.reorderPaymentMethods(payload.orderedIds as string[]);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'reassignAndDeletePaymentMethod': {
            await repository.reassignAndDeletePaymentMethod(
              payload.fromMethodId as string,
              payload.toMethodId as string | undefined,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updateReferenceIncome': {
            await repository.updateReferenceIncome(payload.incomeCents as number);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updateGoalsMode': {
            await repository.updateGoalsMode(payload.mode as 'percentage' | 'currency');
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'saveGoalCategories': {
            await repository.saveGoalCategories(
              payload.categories as GoalCategory[],
              payload.typeMappings as Record<string, string>,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updatePreferences': {
            await repository.updatePreferences(
              payload.changes as {
                language?: SupportedLocale;
                currency?: SupportedCurrency;
                exchangeRate?: Partial<Settings['exchangeRate']>;
              },
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'resetSettings': {
            const snapshot = await repository.resetSettings(
              payload.seedMode as 'production' | 'development' | undefined,
            );
            sendJson(res, 200, serializeSnapshot(snapshot));
            return;
          }

          default:
            sendJson(res, 400, { error: `Unknown action: ${action}` });
            return;
        }
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      sendJson(res, 500, { error: message });
    }
  };
}

export function financeApiPlugin(dbPath?: string): Plugin {
  const middleware = createFinanceApiMiddleware(dbPath);
  return {
    name: 'finance-tracker-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
