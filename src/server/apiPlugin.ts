import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin, ViteDevServer } from 'vite';
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
import { rpcRequestSchema } from './rpcSchemas';

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB limit

class BodyTooLargeError extends Error {
  constructor() {
    super('Payload too large');
    this.name = 'BodyTooLargeError';
  }
}

class MalformedJsonError extends Error {
  constructor(message = 'Malformed JSON body') {
    super(message);
    this.name = 'MalformedJsonError';
  }
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let receivedBytes = 0;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new BodyTooLargeError());
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new MalformedJsonError(err instanceof Error ? err.message : undefined));
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

export function createFinanceApiMiddleware(dbPath?: string, serverLogger?: ViteDevServer['config']['logger']) {
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

        let fromDate: Date | undefined;
        let toDate: Date | undefined;
        try {
          if (fromDateStr) fromDate = parseLocalDate(fromDateStr);
          if (toDateStr) toDate = parseLocalDate(toDateStr);
        } catch {
          sendJson(res, 400, { error: 'Invalid date query format. Expected YYYY-MM-DD.' });
          return;
        }

        const txs = await repository.fetchTransactions({
          fromDate,
          toDate,
          accountId,
        });
        sendJson(res, 200, { transactions: txs.map(serializeTransaction) });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/rpc') {
        let rawBody: unknown;
        try {
          rawBody = await readJsonBody(req);
        } catch (err) {
          if (err instanceof BodyTooLargeError) {
            sendJson(res, 413, { error: 'Payload too large (limit is 1MB)' });
            return;
          }
          if (err instanceof MalformedJsonError) {
            sendJson(res, 400, { error: 'Malformed JSON payload' });
            return;
          }
          throw err;
        }

        const parseResult = rpcRequestSchema.safeParse(rawBody);
        if (!parseResult.success) {
          sendJson(res, 400, {
            error: 'Invalid RPC request payload',
            issues: parseResult.error.issues,
          });
          return;
        }

        const request = parseResult.data;
        switch (request.action) {
          case 'saveTransactionDraft': {
            const draft = deserializeDraft(request.payload.draft as SerializedTransactionDraft);
            const editingTarget = deserializeEditingTarget(
              request.payload.editingTarget as SerializedEditingTarget | null | undefined,
            );
            const result = await repository.saveTransactionDraft(draft, editingTarget);
            sendJson(res, 200, {
              transactions: result.transactions.map(serializeTransaction),
              recurringRules: result.recurringRules.map(serializeRecurringRule),
            });
            return;
          }

          case 'deleteTransactionTarget': {
            const target = deserializeTransaction(request.payload.target as SerializedTransaction);
            const scope = request.payload.scope as 'only-this' | 'this-and-future' | 'all' | undefined;
            const result = await repository.deleteTransactionTarget(target, scope);
            sendJson(res, 200, {
              transactions: result.transactions.map(serializeTransaction),
              recurringRules: result.recurringRules.map(serializeRecurringRule),
            });
            return;
          }

          case 'cancelRecurringRule': {
            const ruleId = request.payload.ruleId;
            const effectiveDate = parseLocalDate(request.payload.effectiveDate);
            const result = await repository.cancelRecurringRule(ruleId, effectiveDate);
            sendJson(res, 200, {
              transactions: result.transactions.map(serializeTransaction),
              recurringRules: result.recurringRules.map(serializeRecurringRule),
            });
            return;
          }

          case 'deleteRecurringRule': {
            const ruleId = request.payload.ruleId;
            const result = await repository.deleteRecurringRule(ruleId);
            sendJson(res, 200, {
              transactions: result.transactions.map(serializeTransaction),
              recurringRules: result.recurringRules.map(serializeRecurringRule),
            });
            return;
          }

          case 'createAccount': {
            const account = deserializeAccount(request.payload.account as SerializedAccountConfig);
            await repository.createAccount(account);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updateAccount': {
            const id = request.payload.id;
            const { openingDate: rawOpeningDate, ...restChanges } = request.payload.changes as Partial<
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
            const id = request.payload.id;
            const cancelRecurrences = Boolean(request.payload.cancelRecurrences);
            const effectiveDate = request.payload.effectiveDate
              ? parseLocalDate(request.payload.effectiveDate)
              : undefined;
            await repository.archiveAccount(id, cancelRecurrences, effectiveDate);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'restoreAccount': {
            const id = request.payload.id;
            await repository.restoreAccount(id);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'deleteAccount': {
            const id = request.payload.id;
            await repository.deleteAccount(id);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'createTransactionType': {
            await repository.createTransactionType(request.payload.type as TransactionTypeConfig);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updateTransactionType': {
            await repository.updateTransactionType(
              request.payload.id,
              request.payload.changes as Partial<Omit<TransactionTypeConfig, 'id'>>,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'reorderTransactionTypes': {
            await repository.reorderTransactionTypes(
              request.payload.direction as 'income' | 'expense',
              request.payload.orderedIds,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'reassignAndDeleteTransactionType': {
            await repository.reassignAndDeleteTransactionType(request.payload.fromTypeId, request.payload.toTypeId);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'createPaymentMethod': {
            await repository.createPaymentMethod(request.payload.method as PaymentMethodConfig);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updatePaymentMethod': {
            await repository.updatePaymentMethod(
              request.payload.id,
              request.payload.changes as Partial<Omit<PaymentMethodConfig, 'id'>>,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'reorderPaymentMethods': {
            await repository.reorderPaymentMethods(request.payload.orderedIds);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'reassignAndDeletePaymentMethod': {
            await repository.reassignAndDeletePaymentMethod(request.payload.fromMethodId, request.payload.toMethodId);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updateReferenceIncome': {
            await repository.updateReferenceIncome(request.payload.incomeCents);
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updateGoalsMode': {
            await repository.updateGoalsMode(request.payload.mode as 'percentage' | 'currency');
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'saveGoalCategories': {
            await repository.saveGoalCategories(
              request.payload.categories as GoalCategory[],
              request.payload.typeMappings,
            );
            sendJson(res, 200, { ok: true });
            return;
          }

          case 'updatePreferences': {
            await repository.updatePreferences(
              request.payload.changes as {
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
              request.payload.seedMode as 'production' | 'development' | undefined,
            );
            sendJson(res, 200, serializeSnapshot(snapshot));
            return;
          }
        }
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      if (serverLogger) {
        serverLogger.error(error instanceof Error ? error.stack || error.message : String(error));
      }
      sendJson(res, 500, { error: 'Internal server error' });
    }
  };
}

export function financeApiPlugin(dbPath?: string): Plugin {
  let serverLogger: ViteDevServer['config']['logger'] | undefined;
  return {
    name: 'finance-tracker-api',
    configureServer(server) {
      serverLogger = server.config.logger;
      server.middlewares.use(createFinanceApiMiddleware(dbPath, serverLogger));
    },
    configurePreviewServer(server) {
      serverLogger = server.config.logger;
      server.middlewares.use(createFinanceApiMiddleware(dbPath, serverLogger));
    },
  };
}
