import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin, ViteDevServer } from 'vite';
import { createDatabaseConnection } from '../db/client';
import { SqliteRepository } from './sqliteRepository';
import { DEFAULT_WORKSPACE_ID, resolveDefaultSeedMode } from '../db/seedDatabase';
import { createServerLogger, type ServerLogger } from './logger';
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
import { clientLogBatchSchema, rpcRequestSchema, transactionSearchQuerySchema } from './rpcSchemas';

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

export function createFinanceApiMiddleware(dbPath?: string, viteLogger?: ViteDevServer['config']['logger']) {
  let repo: SqliteRepository | null = null;
  const logger: ServerLogger = createServerLogger(viteLogger, 'api');

  const getRepo = (): SqliteRepository => {
    if (!repo) {
      const conn = createDatabaseConnection(dbPath, logger);
      repo = new SqliteRepository(conn, DEFAULT_WORKSPACE_ID, resolveDefaultSeedMode(), logger);
    }
    return repo;
  };

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/')) {
      next();
      return;
    }

    const startHr = process.hrtime.bigint();
    const reqMethod = req.method ?? 'GET';
    const reqPath = req.url;

    const respond = (status: number, data: unknown, context?: string): void => {
      const durationMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
      const roundedMs = Math.round(durationMs * 100) / 100;
      const desc = context ? ` [${context}]` : '';

      if (status >= 500) {
        logger.error(`${reqMethod} ${reqPath}${desc} -> ${status} (${roundedMs}ms)`);
      } else if (status >= 400) {
        logger.warn(`${reqMethod} ${reqPath}${desc} -> ${status} (${roundedMs}ms)`);
      } else {
        logger.info(`${reqMethod} ${reqPath}${desc} -> ${status} (${roundedMs}ms)`);
      }

      sendJson(res, status, data);
    };

    try {
      const url = new URL(req.url, 'http://localhost');
      const repository = getRepo();

      if (req.method === 'GET' && url.pathname === '/api/workspace') {
        const windowDaysParam = url.searchParams.get('windowDays');
        const windowDays = windowDaysParam !== null ? Number(windowDaysParam) : 90;
        const snapshot = await repository.loadWorkspace(Number.isFinite(windowDays) ? windowDays : 90);
        respond(200, serializeSnapshot(snapshot), 'workspace');
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/transactions/search') {
        const parsed = transactionSearchQuerySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          sendJson(res, 400, { error: 'Invalid search query', issues: parsed.error.issues });
          return;
        }

        const result = await repository.searchTransactions({
          text: parsed.data.q,
          limit: parsed.data.limit,
        });

        sendJson(res, 200, {
          transactions: result.transactions.map(serializeTransaction),
          totalCount: result.totalCount,
        });
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
          respond(400, { error: 'Invalid date query format. Expected YYYY-MM-DD.' }, 'invalid-date');
          return;
        }

        const txs = await repository.fetchTransactions({
          fromDate,
          toDate,
          accountId,
        });
        respond(200, { transactions: txs.map(serializeTransaction) }, `${txs.length} txs`);
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/logs') {
        let rawBody: unknown;
        try {
          rawBody = await readJsonBody(req);
        } catch (err) {
          if (err instanceof BodyTooLargeError) {
            respond(413, { error: 'Payload too large (limit is 1MB)' }, 'payload-too-large');
            return;
          }
          if (err instanceof MalformedJsonError) {
            respond(400, { error: 'Malformed JSON payload' }, 'malformed-json');
            return;
          }
          throw err;
        }

        const parseResult = clientLogBatchSchema.safeParse(rawBody);
        if (!parseResult.success) {
          respond(400, { error: 'Invalid log payload', issues: parseResult.error.issues }, 'invalid-log-batch');
          return;
        }

        const clientLogger = logger.child('client');
        for (const entry of parseResult.data.entries) {
          const args: unknown[] = [];
          if (entry.data !== undefined) {
            args.push(entry.data);
          }
          if (entry.error !== undefined) {
            const err = new Error(entry.error.message);
            err.name = entry.error.name;
            if (entry.error.stack) {
              err.stack = entry.error.stack;
            }
            args.push(err);
          }

          const msg = `[${entry.namespace}] ${entry.message}`;
          switch (entry.level) {
            case 'error':
              clientLogger.error(msg, ...args);
              break;
            case 'warn':
              clientLogger.warn(msg, ...args);
              break;
            case 'info':
              clientLogger.info(msg, ...args);
              break;
            case 'debug':
            case 'trace':
              clientLogger.debug(msg, ...args);
              break;
          }
        }

        respond(200, { success: true, count: parseResult.data.entries.length }, 'logs-ingested');
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/rpc') {
        let rawBody: unknown;
        try {
          rawBody = await readJsonBody(req);
        } catch (err) {
          if (err instanceof BodyTooLargeError) {
            respond(413, { error: 'Payload too large (limit is 1MB)' }, 'payload-too-large');
            return;
          }
          if (err instanceof MalformedJsonError) {
            respond(400, { error: 'Malformed JSON payload' }, 'malformed-json');
            return;
          }
          throw err;
        }

        const parseResult = rpcRequestSchema.safeParse(rawBody);
        if (!parseResult.success) {
          const actionName = (rawBody as Record<string, unknown>)?.action;
          logger.warn(
            `RPC action "${actionName}" validation failed: ${JSON.stringify(parseResult.error.issues, null, 2)}`,
          );
          respond(
            400,
            {
              error: 'Invalid RPC request payload',
              issues: parseResult.error.issues,
            },
            `validation-failed:${actionName}`,
          );
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
            respond(
              200,
              {
                transactions: result.transactions.map(serializeTransaction),
                recurringRules: result.recurringRules.map(serializeRecurringRule),
              },
              `rpc:${request.action}`,
            );
            return;
          }

          case 'deleteTransactionTarget': {
            const target = deserializeTransaction(request.payload.target as SerializedTransaction);
            const scope = request.payload.scope as 'only-this' | 'this-and-future' | 'all' | undefined;
            const result = await repository.deleteTransactionTarget(target, scope);
            respond(
              200,
              {
                transactions: result.transactions.map(serializeTransaction),
                recurringRules: result.recurringRules.map(serializeRecurringRule),
              },
              `rpc:${request.action}`,
            );
            return;
          }

          case 'cancelRecurringRule': {
            const ruleId = request.payload.ruleId;
            const effectiveDate = parseLocalDate(request.payload.effectiveDate);
            const result = await repository.cancelRecurringRule(ruleId, effectiveDate);
            respond(
              200,
              {
                transactions: result.transactions.map(serializeTransaction),
                recurringRules: result.recurringRules.map(serializeRecurringRule),
              },
              `rpc:${request.action}`,
            );
            return;
          }

          case 'deleteRecurringRule': {
            const ruleId = request.payload.ruleId;
            const result = await repository.deleteRecurringRule(ruleId);
            respond(
              200,
              {
                transactions: result.transactions.map(serializeTransaction),
                recurringRules: result.recurringRules.map(serializeRecurringRule),
              },
              `rpc:${request.action}`,
            );
            return;
          }

          case 'createAccount': {
            const account = deserializeAccount(request.payload.account as SerializedAccountConfig);
            await repository.createAccount(account);
            respond(200, { ok: true }, `rpc:${request.action}`);
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
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'archiveAccount': {
            const id = request.payload.id;
            const cancelRecurrences = Boolean(request.payload.cancelRecurrences);
            const effectiveDate = request.payload.effectiveDate
              ? parseLocalDate(request.payload.effectiveDate)
              : undefined;
            await repository.archiveAccount(id, cancelRecurrences, effectiveDate);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'restoreAccount': {
            const id = request.payload.id;
            await repository.restoreAccount(id);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'deleteAccount': {
            const id = request.payload.id;
            await repository.deleteAccount(id);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'createTransactionType': {
            await repository.createTransactionType(request.payload.type as TransactionTypeConfig);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'updateTransactionType': {
            await repository.updateTransactionType(
              request.payload.id,
              request.payload.changes as Partial<Omit<TransactionTypeConfig, 'id'>>,
            );
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'reorderTransactionTypes': {
            await repository.reorderTransactionTypes(
              request.payload.direction as 'income' | 'expense',
              request.payload.orderedIds,
            );
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'reassignAndDeleteTransactionType': {
            await repository.reassignAndDeleteTransactionType(request.payload.fromTypeId, request.payload.toTypeId);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'createPaymentMethod': {
            await repository.createPaymentMethod(request.payload.method as PaymentMethodConfig);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'updatePaymentMethod': {
            await repository.updatePaymentMethod(
              request.payload.id,
              request.payload.changes as Partial<Omit<PaymentMethodConfig, 'id'>>,
            );
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'reorderPaymentMethods': {
            await repository.reorderPaymentMethods(request.payload.orderedIds);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'reassignAndDeletePaymentMethod': {
            await repository.reassignAndDeletePaymentMethod(request.payload.fromMethodId, request.payload.toMethodId);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'updateReferenceIncome': {
            await repository.updateReferenceIncome(request.payload.incomeCents);
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'updateGoalsMode': {
            await repository.updateGoalsMode(request.payload.mode as 'percentage' | 'currency');
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'saveGoalCategories': {
            await repository.saveGoalCategories(
              request.payload.categories as GoalCategory[],
              request.payload.typeMappings,
            );
            respond(200, { ok: true }, `rpc:${request.action}`);
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
            respond(200, { ok: true }, `rpc:${request.action}`);
            return;
          }

          case 'resetSettings': {
            const snapshot = await repository.resetSettings(
              request.payload.seedMode as 'production' | 'development' | undefined,
            );
            respond(200, serializeSnapshot(snapshot), `rpc:${request.action}`);
            return;
          }

          default: {
            logger.warn(`Unrecognized RPC action: "${(request as { action: string }).action}"`);
            respond(
              400,
              { error: `Unrecognized RPC action: "${(request as { action: string }).action}"` },
              'unknown-rpc-action',
            );
            return;
          }
        }
      }

      respond(404, { error: 'Not found' }, 'not-found');
    } catch (error) {
      const durationMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
      const roundedMs = Math.round(durationMs * 100) / 100;
      logger.error(
        `Unhandled error processing ${reqMethod} ${reqPath} (${roundedMs}ms):`,
        error instanceof Error ? error.stack || error.message : String(error),
      );
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
