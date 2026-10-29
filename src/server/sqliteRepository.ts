import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { type DatabaseConnection } from '../db/client';
import * as schema from '../db/schema';
import type { ServerLogger } from './logger';
import {
  DEFAULT_WORKSPACE_ID,
  resetAndSeedWorkspace,
  resolveDefaultSeedMode,
  seedWorkspaceIfNeeded,
  type SeedMode,
} from '../db/seedDatabase';
import type {
  FinanceRepository,
  SaveTransactionResult,
  TransactionQuery,
  TransactionSearchQuery,
  TransactionSearchResult,
  WorkspaceSnapshot,
} from '../app/data/repository/types';
import {
  type AccountConfig,
  type ColorToken,
  type Direction,
  type PaymentMethodConfig,
  type Settings,
  type TransactionTypeConfig,
  CREDIT_CARD_METHOD_ID,
  TRANSFER_TYPE_ID,
  findAccount,
  getAccountCurrencies,
  getAccountOpeningBalance,
  getAllowedPaymentMethodIds,
  isCreditCard,
} from '../app/data/settings';
import {
  type EditingTarget,
  type Transaction,
  type TransactionDraft,
  buildTransferLegs,
  createTransactionId,
} from '../app/data/transactions';
import { buildInstallments } from '../app/data/installments';
import { type RecurringRule, buildRecurringTransactions } from '../app/data/recurring';
import { buildStatements } from '../app/data/cardStatements';
import { type GoalCategory } from '../app/data/goals';
import { addDays, getToday, parseLocalDate, toLocalDateString } from '../app/data/dates';
import {
  SEARCH_MIN_LENGTH,
  TRIGRAM_MIN_TOKEN,
  tokenizeSearchQuery,
  buildFtsMatchExpression,
  escapeLikePattern,
} from '../app/data/search';
import type { IconKey } from '../app/data/icons';
import type { SupportedCurrency, SupportedLocale } from '../app/i18n/types';

type RawSqliteTransactionRow = {
  id: string;
  workspace_id: string;
  date: string;
  description: string;
  type_id: string;
  direction: string;
  amount_cents: number;
  currency: string;
  account_id: string;
  payment_method_id: string | null;
  transfer_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  recurring_rule_id: string | null;
  recurring_index: number | null;
  recurring_total: number | null;
  created_at: string;
};

function mapRowToTransaction(row: typeof schema.transactions.$inferSelect): Transaction {
  return {
    id: row.id,
    date: parseLocalDate(row.date),
    description: row.description,
    typeId: row.typeId,
    direction: row.direction as Direction,
    value: row.amountCents,
    currency: row.currency as SupportedCurrency,
    accountId: row.accountId,
    ...(row.paymentMethodId ? { paymentMethodId: row.paymentMethodId } : {}),
    ...(row.transferId ? { transferId: row.transferId } : {}),
    ...(row.installmentGroupId && row.installmentNumber !== null && row.installmentTotal !== null
      ? {
          installment: {
            groupId: row.installmentGroupId,
            number: row.installmentNumber,
            total: row.installmentTotal,
          },
        }
      : {}),
    ...(row.recurringRuleId && row.recurringIndex !== null
      ? {
          recurring: {
            ruleId: row.recurringRuleId,
            iteration: row.recurringIndex,
            frequency: 'monthly' as const,
            ...(row.recurringTotal !== null ? { total: row.recurringTotal } : {}),
          },
        }
      : {}),
  };
}

function mapRawRowToTransaction(row: RawSqliteTransactionRow): Transaction {
  return {
    id: row.id,
    date: parseLocalDate(row.date),
    description: row.description,
    typeId: row.type_id,
    direction: row.direction as Direction,
    value: row.amount_cents,
    currency: row.currency as SupportedCurrency,
    accountId: row.account_id,
    ...(row.payment_method_id ? { paymentMethodId: row.payment_method_id } : {}),
    ...(row.transfer_id ? { transferId: row.transfer_id } : {}),
    ...(row.installment_group_id && row.installment_number !== null && row.installment_total !== null
      ? {
          installment: {
            groupId: row.installment_group_id,
            number: row.installment_number,
            total: row.installment_total,
          },
        }
      : {}),
    ...(row.recurring_rule_id && row.recurring_index !== null
      ? {
          recurring: {
            ruleId: row.recurring_rule_id,
            iteration: row.recurring_index,
            frequency: 'monthly' as const,
            ...(row.recurring_total !== null ? { total: row.recurring_total } : {}),
          },
        }
      : {}),
  };
}

export class SqliteRepository implements FinanceRepository {
  private loadedFromDateStr: string | null = null;
  private readonly logger?: ServerLogger;

  constructor(
    private readonly conn: DatabaseConnection,
    private readonly workspaceId: string = DEFAULT_WORKSPACE_ID,
    private readonly seedMode: SeedMode = resolveDefaultSeedMode(),
    logger?: ServerLogger,
  ) {
    this.logger = logger?.child('SqliteRepo');
    const seeded = seedWorkspaceIfNeeded(this.conn, this.seedMode, this.workspaceId);
    if (seeded) {
      this.logger?.info(`Initialized and seeded workspace "${this.workspaceId}" in mode "${this.seedMode}"`);
    } else {
      this.logger?.debug(`Connected to existing workspace "${this.workspaceId}"`);
    }
  }

  private runInTransaction<T>(operationName: string, fn: () => T): T {
    this.logger?.debug(`[tx:begin] ${operationName}`);
    const tx = this.conn.sqlite.transaction(fn);
    try {
      const result = tx();
      this.logger?.debug(`[tx:commit] ${operationName}`);
      return result;
    } catch (err) {
      this.logger?.error(`[tx:rollback] ${operationName} failed:`, err);
      throw err;
    }
  }

  private loadSettingsFromDb(): Settings {
    const ws = this.conn.db.select().from(schema.workspaces).where(eq(schema.workspaces.id, this.workspaceId)).get();

    if (!ws) {
      throw new Error(`Workspace "${this.workspaceId}" not found`);
    }

    const typeRows = this.conn.db
      .select()
      .from(schema.transactionTypes)
      .where(eq(schema.transactionTypes.workspaceId, this.workspaceId))
      .orderBy(asc(schema.transactionTypes.sortOrder))
      .all();

    const transactionTypes: TransactionTypeConfig[] = typeRows.map(r => ({
      id: r.id,
      name: r.name,
      direction: r.direction as Direction,
      color: r.color as ColorToken,
      icon: r.icon as IconKey,
      ...(r.systemTag === 'transfer' ? { system: 'transfer' as const } : {}),
    }));

    const methodRows = this.conn.db
      .select()
      .from(schema.paymentMethods)
      .where(eq(schema.paymentMethods.workspaceId, this.workspaceId))
      .orderBy(asc(schema.paymentMethods.sortOrder))
      .all();

    const paymentMethods: PaymentMethodConfig[] = methodRows.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon as IconKey,
      behavior: r.systemTag === 'credit-card' || r.id === CREDIT_CARD_METHOD_ID ? 'credit-card' : 'standard',
    }));

    const accountRows = this.conn.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.workspaceId, this.workspaceId))
      .all();

    const accounts: AccountConfig[] = accountRows.map(acc => {
      const balanceRows = this.conn.db
        .select()
        .from(schema.accountBalances)
        .where(eq(schema.accountBalances.accountId, acc.id))
        .orderBy(asc(schema.accountBalances.sortOrder))
        .all();

      const currencies: SupportedCurrency[] =
        balanceRows.length > 0 ? balanceRows.map(b => b.currency as SupportedCurrency) : ['USD'];

      const openingBalances: Partial<Record<SupportedCurrency, number>> = {};
      for (const b of balanceRows) {
        openingBalances[b.currency as SupportedCurrency] = b.openingBalanceCents;
      }

      const pmRows = this.conn.db
        .select()
        .from(schema.accountPaymentMethods)
        .where(eq(schema.accountPaymentMethods.accountId, acc.id))
        .all();

      const allowedPaymentMethods = pmRows.map(pm => pm.paymentMethodId);

      const hasCard =
        acc.cardName !== null && acc.cardLimitCents !== null && acc.cardClosingDay !== null && acc.cardDueDay !== null;

      return {
        id: acc.id,
        name: acc.name,
        kind: (acc.kind === 'Investment' ? 'Savings' : acc.kind) as AccountConfig['kind'],
        currencies,
        openingBalances,
        openingDate: parseLocalDate(acc.openingDate),
        initials: acc.initials,
        color: acc.color as ColorToken,
        allowedPaymentMethods,
        archived: acc.archived,
        ...(hasCard
          ? {
              card: {
                name: acc.cardName!,
                limit: acc.cardLimitCents!,
                closingDay: acc.cardClosingDay!,
                dueDay: acc.cardDueDay!,
              },
            }
          : {}),
      };
    });

    const goalCatRows = this.conn.db
      .select()
      .from(schema.goalCategories)
      .where(eq(schema.goalCategories.workspaceId, this.workspaceId))
      .orderBy(asc(schema.goalCategories.sortOrder))
      .all();

    const categories: GoalCategory[] = goalCatRows.map(g => ({
      id: g.id,
      name: g.name,
      percentage: g.percentage,
      color: g.color as ColorToken,
      icon: g.icon as IconKey,
      ...(g.description ? { description: g.description } : {}),
    }));

    const mappingRows = this.conn.db
      .select()
      .from(schema.goalTypeMappings)
      .where(eq(schema.goalTypeMappings.workspaceId, this.workspaceId))
      .all();

    const typeMappings: Record<string, string> = {};
    for (const m of mappingRows) {
      typeMappings[m.transactionTypeId] = m.goalCategoryId;
    }

    return {
      transactionTypes,
      paymentMethods,
      accounts,
      goals: {
        referenceMonthlyIncome: ws.goalsReferenceIncomeCents,
        mode: ws.goalsMode,
        categories,
        typeMappings,
      },
      exchangeRate: {
        rate: ws.exchangeRate ?? null,
        lastUpdated: ws.exchangeRateUpdatedAt ?? null,
        source: ws.exchangeRateSource,
        isLoading: false,
        error: null,
      },
    };
  }

  private loadRecurringRulesFromDb(): RecurringRule[] {
    const rows = this.conn.db
      .select()
      .from(schema.recurringRules)
      .where(eq(schema.recurringRules.workspaceId, this.workspaceId))
      .all();

    return rows.map(r => ({
      id: r.id,
      description: r.description,
      value: r.amountCents,
      currency: r.currency as SupportedCurrency,
      direction: r.direction as Direction,
      typeId: r.typeId,
      accountId: r.accountId,
      ...(r.paymentMethodId ? { paymentMethodId: r.paymentMethodId } : {}),
      startDate: parseLocalDate(r.startDate),
      frequency: 'monthly',
      limit:
        r.limitKind === 'count' && r.limitCount !== null
          ? { kind: 'count', count: r.limitCount }
          : { kind: 'infinite' },
      status: r.status as 'active' | 'canceled',
      createdAt: parseLocalDate(r.createdAt),
      ...(r.canceledAt ? { canceledAt: parseLocalDate(r.canceledAt) } : {}),
    }));
  }

  private loadWindowedTransactionsAndRollups(
    settings: Settings,
    cutoffDateStr: string | null,
  ): {
    transactions: Transaction[];
    historicalRollups: Record<string, number>;
  } {
    if (!cutoffDateStr) {
      const allRows = this.conn.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.workspaceId, this.workspaceId))
        .orderBy(asc(schema.transactions.date))
        .all();

      return {
        transactions: allRows.map(mapRowToTransaction),
        historicalRollups: {},
      };
    }

    // 1. Pre-window non-credit-card rollup via SQL GROUP BY
    const rollupStmt = this.conn.sqlite.prepare(`
      SELECT
        t.account_id AS accountId,
        t.currency AS currency,
        SUM(CASE WHEN t.direction = 'income' THEN t.amount_cents ELSE -t.amount_cents END) AS netCents
      FROM transactions t
      INNER JOIN accounts a ON a.id = t.account_id
      LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
      WHERE t.workspace_id = ?
        AND t.date < ?
        AND t.date >= a.opening_date
        AND (pm.system_tag IS NULL OR pm.system_tag != 'credit-card')
      GROUP BY t.account_id, t.currency
    `);

    const rollupRows = rollupStmt.all(this.workspaceId, cutoffDateStr) as Array<{
      accountId: string;
      currency: string;
      netCents: number | null;
    }>;

    const historicalRollups: Record<string, number> = {};
    for (const row of rollupRows) {
      if (row.netCents) {
        historicalRollups[`${row.accountId}:${row.currency}`] = row.netCents;
      }
    }

    // 2. Fetch transactions from cutoffDate onwards
    const windowRows = this.conn.db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.workspaceId, this.workspaceId), gte(schema.transactions.date, cutoffDateStr)))
      .orderBy(asc(schema.transactions.date))
      .all();

    const windowTransactions = windowRows.map(mapRowToTransaction);

    // 3. Handle credit card transactions prior to cutoffDate so billing cycles are 100% exact
    const creditCardMethodIds = new Set(
      settings.paymentMethods.filter(m => m.behavior === 'credit-card').map(m => m.id),
    );

    if (creditCardMethodIds.size > 0) {
      const preWindowCardRows = this.conn.db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.workspaceId, this.workspaceId),
            sql`${schema.transactions.date} < ${cutoffDateStr}`,
            inArray(schema.transactions.paymentMethodId, Array.from(creditCardMethodIds)),
          ),
        )
        .orderBy(asc(schema.transactions.date))
        .all();

      if (preWindowCardRows.length > 0) {
        const preWindowCardTxs = preWindowCardRows.map(mapRowToTransaction);
        const allCardTxs = [
          ...preWindowCardTxs,
          ...windowTransactions.filter(t => isCreditCard(settings, t.paymentMethodId)),
        ];
        const today = getToday();
        const cutoffDate = parseLocalDate(cutoffDateStr);
        const statements = buildStatements(allCardTxs, settings, today);

        const straddlingTxIds = new Set<string>();
        for (const stmt of statements) {
          const acc = findAccount(settings, stmt.accountId);
          if (!acc || stmt.dueDate.getTime() < acc.openingDate.getTime()) continue;

          if (stmt.dueDate.getTime() < cutoffDate.getTime()) {
            const key = `${stmt.accountId}:${stmt.currency}`;
            historicalRollups[key] = (historicalRollups[key] ?? 0) - stmt.total;
          } else {
            for (const tx of stmt.items) {
              if (tx.date.getTime() < cutoffDate.getTime()) {
                straddlingTxIds.add(tx.id);
              }
            }
          }
        }

        if (straddlingTxIds.size > 0) {
          const extraCardTxs = preWindowCardTxs.filter(t => straddlingTxIds.has(t.id));
          windowTransactions.unshift(...extraCardTxs);
        }
      }
    }

    return {
      transactions: windowTransactions,
      historicalRollups,
    };
  }

  loadWorkspace(windowDays = 90): Promise<WorkspaceSnapshot> {
    this.logger?.debug(`loadWorkspace requested (windowDays=${windowDays})`);
    const settings = this.loadSettingsFromDb();
    const recurringRules = this.loadRecurringRulesFromDb();

    const cutoffDate = windowDays > 0 ? addDays(getToday(), -windowDays) : null;
    this.loadedFromDateStr = cutoffDate ? toLocalDateString(cutoffDate) : null;

    const { transactions, historicalRollups } = this.loadWindowedTransactionsAndRollups(
      settings,
      this.loadedFromDateStr,
    );

    this.logger?.info(
      `loadWorkspace loaded: ${transactions.length} transactions, ${recurringRules.length} recurring rules, ${settings.accounts.length} accounts`,
    );

    return Promise.resolve({
      settings,
      transactions,
      recurringRules,
      historicalRollups,
      loadedFromDate: cutoffDate,
    });
  }

  fetchTransactions(query: TransactionQuery): Promise<Transaction[]> {
    this.logger?.debug('fetchTransactions query:', query);
    const conditions = [eq(schema.transactions.workspaceId, this.workspaceId)];

    if (query.fromDate) {
      const fromStr = toLocalDateString(query.fromDate);
      conditions.push(gte(schema.transactions.date, fromStr));
      if (this.loadedFromDateStr && fromStr < this.loadedFromDateStr) {
        this.loadedFromDateStr = fromStr;
      }
    } else if (!query.accountId) {
      this.loadedFromDateStr = null;
    }

    if (query.toDate) {
      conditions.push(lte(schema.transactions.date, toLocalDateString(query.toDate)));
    }

    if (query.accountId) {
      conditions.push(eq(schema.transactions.accountId, query.accountId));
    }

    const rows = this.conn.db
      .select()
      .from(schema.transactions)
      .where(and(...conditions))
      .orderBy(asc(schema.transactions.date))
      .all();

    this.logger?.debug(`fetchTransactions returned ${rows.length} transactions`);

    return Promise.resolve(rows.map(mapRowToTransaction));
  }

  searchTransactions(query: TransactionSearchQuery): Promise<TransactionSearchResult> {
    const rawText = query.text?.trim() ?? '';
    const tokens = tokenizeSearchQuery(rawText);
    if (tokens.length === 0 || rawText.length < SEARCH_MIN_LENGTH) {
      return Promise.resolve({ transactions: [], totalCount: 0 });
    }

    const endTimer = this.logger?.time(`searchTransactions "${rawText.slice(0, 30)}"`);
    const limit = Math.min(Math.max(query.limit ?? 500, 1), 2000);
    const trigramMatch = buildFtsMatchExpression(tokens.filter(t => t.length >= TRIGRAM_MIN_TOKEN));
    const shortTokens = tokens.filter(t => t.length < TRIGRAM_MIN_TOKEN);
    const todayStr = toLocalDateString(getToday());

    // When we have trigram tokens, join with transactions_fts using rowid and MATCH
    // Also include description parity guard (f.description = t.description)
    const baseFrom = trigramMatch
      ? sql`transactions t JOIN transactions_fts f ON f.rowid = t.rowid AND f.description = t.description AND transactions_fts MATCH ${trigramMatch}`
      : sql`transactions t`;

    const whereClauses = [sql`t.workspace_id = ${this.workspaceId}`];
    for (const tok of shortTokens) {
      const pattern = `%${escapeLikePattern(tok)}%`;
      whereClauses.push(sql`fold(t.description) LIKE ${pattern} ESCAPE '\\'`);
    }

    const whereSql = sql.join(whereClauses, sql` AND `);

    // Count query for total matching rows
    const countQuery = sql`SELECT count(*) as count FROM ${baseFrom} WHERE ${whereSql}`;
    const countRows = this.conn.db.get<{ count: number }>(countQuery);
    const totalCount = countRows?.count ?? 0;

    // Search results ordered: past/today first (newest first), future next (soonest first)
    const selectQuery = sql`
      SELECT t.* FROM ${baseFrom}
      WHERE ${whereSql}
      ORDER BY
        (t.date > ${todayStr}) ASC,
        CASE WHEN t.date <= ${todayStr} THEN t.date END DESC,
        t.date ASC,
        t.id ASC
      LIMIT ${limit}
    `;

    const rows = this.conn.db.all<RawSqliteTransactionRow>(selectQuery);
    endTimer?.();
    this.logger?.debug(`searchTransactions matched ${totalCount} rows (returning ${rows.length}) for tokens:`, tokens);
    return Promise.resolve({
      transactions: rows.map(mapRawRowToTransaction),
      totalCount,
    });
  }

  private insertTransactionModel(tx: Transaction, nowIso: string): void {
    this.conn.db
      .insert(schema.transactions)
      .values({
        id: tx.id,
        workspaceId: this.workspaceId,
        date: toLocalDateString(tx.date),
        description: tx.description,
        typeId: tx.typeId,
        direction: tx.direction,
        amountCents: tx.value,
        currency: tx.currency,
        accountId: tx.accountId,
        paymentMethodId: tx.paymentMethodId ?? null,
        transferId: tx.transferId ?? null,
        installmentGroupId: tx.installment?.groupId ?? null,
        installmentNumber: tx.installment?.number ?? null,
        installmentTotal: tx.installment?.total ?? null,
        recurringRuleId: tx.recurring?.ruleId ?? null,
        recurringIndex: tx.recurring?.iteration ?? null,
        recurringTotal: tx.recurring?.total ?? null,
        createdAt: nowIso,
      })
      .run();
  }

  saveTransactionDraft(draft: TransactionDraft, editingTarget?: EditingTarget | null): Promise<SaveTransactionResult> {
    const settings = this.loadSettingsFromDb();
    const nowIso = new Date().toISOString();

    this.runInTransaction(`saveTransactionDraft (${draft.kind})`, () => {
      let existingIds: string[] = [];
      let groupId = createTransactionId();
      let transferId = createTransactionId();

      if (editingTarget) {
        if (editingTarget.kind === 'single') {
          existingIds = [editingTarget.transaction.id];
          this.conn.db
            .delete(schema.transactions)
            .where(
              and(
                eq(schema.transactions.workspaceId, this.workspaceId),
                eq(schema.transactions.id, editingTarget.transaction.id),
              ),
            )
            .run();
        } else if (editingTarget.kind === 'transfer') {
          existingIds = [editingTarget.outgoing.id, editingTarget.incoming.id];
          transferId = editingTarget.outgoing.transferId ?? createTransactionId();
          this.conn.db
            .delete(schema.transactions)
            .where(
              and(
                eq(schema.transactions.workspaceId, this.workspaceId),
                eq(schema.transactions.transferId, transferId),
              ),
            )
            .run();
        } else if (editingTarget.kind === 'installments') {
          existingIds = editingTarget.series.map(t => t.id);
          groupId = editingTarget.series[0]?.installment?.groupId ?? createTransactionId();
          this.conn.db
            .delete(schema.transactions)
            .where(
              and(
                eq(schema.transactions.workspaceId, this.workspaceId),
                eq(schema.transactions.installmentGroupId, groupId),
              ),
            )
            .run();
        } else if (editingTarget.kind === 'recurring') {
          existingIds = editingTarget.series.map(t => t.id);
          this.conn.db
            .delete(schema.transactions)
            .where(
              and(
                eq(schema.transactions.workspaceId, this.workspaceId),
                eq(schema.transactions.recurringRuleId, editingTarget.ruleId),
              ),
            )
            .run();
          if (draft.kind !== 'recurring') {
            this.conn.db
              .delete(schema.recurringRules)
              .where(
                and(
                  eq(schema.recurringRules.workspaceId, this.workspaceId),
                  eq(schema.recurringRules.id, editingTarget.ruleId),
                ),
              )
              .run();
          }
        }
      }

      if (draft.kind === 'single') {
        const id = existingIds[0] ?? createTransactionId();
        this.insertTransactionModel({ ...draft.transaction, id }, nowIso);
      } else if (draft.kind === 'transfer') {
        const ids: [string, string] = [
          existingIds[0] ?? createTransactionId(),
          existingIds[1] ?? createTransactionId(),
        ];
        const fromAcc = findAccount(settings, draft.fromAccountId);
        const toAcc = findAccount(settings, draft.toAccountId);
        const legs = buildTransferLegs(draft, transferId, ids, {
          fromName: fromAcc?.name,
          toName: toAcc?.name,
        });
        this.insertTransactionModel(legs[0], nowIso);
        this.insertTransactionModel(legs[1], nowIso);
      } else if (draft.kind === 'installments') {
        if (!isCreditCard(settings, draft.transaction.paymentMethodId)) {
          const id = existingIds[0] ?? createTransactionId();
          this.insertTransactionModel(
            {
              ...draft.transaction,
              id,
              date: draft.firstDate,
              value: draft.totalValue,
            },
            nowIso,
          );
        } else {
          const ids = Array.from({ length: draft.count }, (_, i) => existingIds[i] ?? createTransactionId());
          const newInstallments = buildInstallments(draft, groupId, ids);
          for (const inst of newInstallments) {
            this.insertTransactionModel(inst, nowIso);
          }
        }
      } else if (draft.kind === 'recurring') {
        let ruleId = createTransactionId();
        if (editingTarget && editingTarget.kind === 'recurring') {
          ruleId = editingTarget.ruleId;
          this.conn.db
            .delete(schema.recurringRules)
            .where(and(eq(schema.recurringRules.workspaceId, this.workspaceId), eq(schema.recurringRules.id, ruleId)))
            .run();
        }

        const newRule: RecurringRule = {
          id: ruleId,
          description: draft.transaction.description,
          value: draft.value,
          currency: draft.transaction.currency,
          direction: draft.transaction.direction,
          typeId: draft.transaction.typeId,
          accountId: draft.transaction.accountId,
          paymentMethodId: draft.transaction.paymentMethodId,
          startDate: draft.startDate,
          frequency: draft.frequency,
          limit: draft.limit,
          status: 'active',
          createdAt: getToday(),
        };

        this.conn.db
          .insert(schema.recurringRules)
          .values({
            id: newRule.id,
            workspaceId: this.workspaceId,
            description: newRule.description,
            amountCents: newRule.value,
            currency: newRule.currency,
            direction: newRule.direction,
            typeId: newRule.typeId,
            accountId: newRule.accountId,
            paymentMethodId: newRule.paymentMethodId ?? null,
            startDate: toLocalDateString(newRule.startDate),
            frequency: newRule.frequency,
            limitKind: newRule.limit.kind,
            limitCount: newRule.limit.kind === 'count' ? newRule.limit.count : null,
            status: newRule.status,
            createdAt: toLocalDateString(newRule.createdAt),
            canceledAt: null,
          })
          .run();

        const newInstances = buildRecurringTransactions(newRule, i => existingIds[i] ?? createTransactionId());
        for (const inst of newInstances) {
          this.insertTransactionModel(inst, nowIso);
        }
      }
    });

    this.logger?.info('saveTransactionDraft completed', {
      kind: draft.kind,
      isEditing: Boolean(editingTarget),
    });

    const { transactions } = this.loadWindowedTransactionsAndRollups(settings, this.loadedFromDateStr);
    const recurringRules = this.loadRecurringRulesFromDb();
    return Promise.resolve({ transactions, recurringRules });
  }

  deleteTransactionTarget(
    target: Transaction,
    scope: 'only-this' | 'this-and-future' | 'all' = 'only-this',
  ): Promise<SaveTransactionResult> {
    this.runInTransaction(`deleteTransactionTarget (${target.id}, ${scope})`, () => {
      if (target.transferId) {
        this.conn.db
          .delete(schema.transactions)
          .where(
            and(
              eq(schema.transactions.workspaceId, this.workspaceId),
              eq(schema.transactions.transferId, target.transferId),
            ),
          )
          .run();
        return;
      }

      if (target.installment) {
        this.conn.db
          .delete(schema.transactions)
          .where(
            and(
              eq(schema.transactions.workspaceId, this.workspaceId),
              eq(schema.transactions.installmentGroupId, target.installment.groupId),
            ),
          )
          .run();
        return;
      }

      if (target.recurring) {
        const ruleId = target.recurring.ruleId;
        if (scope === 'all') {
          this.conn.db
            .delete(schema.transactions)
            .where(
              and(
                eq(schema.transactions.workspaceId, this.workspaceId),
                eq(schema.transactions.recurringRuleId, ruleId),
              ),
            )
            .run();
          this.conn.db
            .delete(schema.recurringRules)
            .where(and(eq(schema.recurringRules.workspaceId, this.workspaceId), eq(schema.recurringRules.id, ruleId)))
            .run();
          return;
        }

        if (scope === 'this-and-future') {
          const targetDateStr = toLocalDateString(target.date);
          this.conn.db
            .update(schema.recurringRules)
            .set({ status: 'canceled', canceledAt: targetDateStr })
            .where(and(eq(schema.recurringRules.workspaceId, this.workspaceId), eq(schema.recurringRules.id, ruleId)))
            .run();

          this.conn.db
            .delete(schema.transactions)
            .where(
              and(
                eq(schema.transactions.workspaceId, this.workspaceId),
                eq(schema.transactions.recurringRuleId, ruleId),
                gte(schema.transactions.date, targetDateStr),
              ),
            )
            .run();
          return;
        }
      }

      this.conn.db
        .delete(schema.transactions)
        .where(and(eq(schema.transactions.workspaceId, this.workspaceId), eq(schema.transactions.id, target.id)))
        .run();
    });

    this.logger?.info('deleteTransactionTarget completed', {
      targetId: target.id,
      scope,
      isTransfer: Boolean(target.transferId),
      isInstallment: Boolean(target.installment),
      isRecurring: Boolean(target.recurring),
    });

    const settings = this.loadSettingsFromDb();
    const { transactions } = this.loadWindowedTransactionsAndRollups(settings, this.loadedFromDateStr);
    const recurringRules = this.loadRecurringRulesFromDb();
    return Promise.resolve({ transactions, recurringRules });
  }

  cancelRecurringRule(ruleId: string, effectiveDate: Date): Promise<SaveTransactionResult> {
    const effectiveStr = toLocalDateString(effectiveDate);
    this.runInTransaction(`cancelRecurringRule (${ruleId})`, () => {
      this.conn.db
        .update(schema.recurringRules)
        .set({ status: 'canceled', canceledAt: effectiveStr })
        .where(and(eq(schema.recurringRules.workspaceId, this.workspaceId), eq(schema.recurringRules.id, ruleId)))
        .run();

      this.conn.db
        .delete(schema.transactions)
        .where(
          and(
            eq(schema.transactions.workspaceId, this.workspaceId),
            eq(schema.transactions.recurringRuleId, ruleId),
            gte(schema.transactions.date, effectiveStr),
          ),
        )
        .run();
    });

    this.logger?.info('cancelRecurringRule completed', { ruleId, effectiveDate: effectiveStr });

    const settings = this.loadSettingsFromDb();
    const { transactions } = this.loadWindowedTransactionsAndRollups(settings, this.loadedFromDateStr);
    const recurringRules = this.loadRecurringRulesFromDb();
    return Promise.resolve({ transactions, recurringRules });
  }

  deleteRecurringRule(ruleId: string): Promise<SaveTransactionResult> {
    this.runInTransaction(`deleteRecurringRule (${ruleId})`, () => {
      this.conn.db
        .delete(schema.transactions)
        .where(
          and(eq(schema.transactions.workspaceId, this.workspaceId), eq(schema.transactions.recurringRuleId, ruleId)),
        )
        .run();

      this.conn.db
        .delete(schema.recurringRules)
        .where(and(eq(schema.recurringRules.workspaceId, this.workspaceId), eq(schema.recurringRules.id, ruleId)))
        .run();
    });

    this.logger?.info('deleteRecurringRule completed', { ruleId });

    const settings = this.loadSettingsFromDb();
    const { transactions } = this.loadWindowedTransactionsAndRollups(settings, this.loadedFromDateStr);
    const recurringRules = this.loadRecurringRulesFromDb();
    return Promise.resolve({ transactions, recurringRules });
  }

  createAccount(account: AccountConfig): Promise<void> {
    const settings = this.loadSettingsFromDb();
    const nowIso = new Date().toISOString();

    this.runInTransaction(`createAccount (${account.name})`, () => {
      this.conn.db
        .insert(schema.accounts)
        .values({
          id: account.id,
          workspaceId: this.workspaceId,
          name: account.name,
          kind: account.kind,
          initials: account.initials,
          color: account.color,
          openingDate: toLocalDateString(account.openingDate),
          archived: Boolean(account.archived),
          system: account.kind === 'Cash' || account.id === 'cash-wallet',
          cardName: account.card?.name ?? null,
          cardLimitCents: account.card?.limit ?? null,
          cardClosingDay: account.card?.closingDay ?? null,
          cardDueDay: account.card?.dueDay ?? null,
          createdAt: nowIso,
        })
        .run();

      const currencies = getAccountCurrencies(account);
      currencies.forEach((curr, idx) => {
        this.conn.db
          .insert(schema.accountBalances)
          .values({
            accountId: account.id,
            currency: curr,
            openingBalanceCents: getAccountOpeningBalance(account, curr),
            sortOrder: idx,
          })
          .run();
      });

      const allowedMethods = getAllowedPaymentMethodIds(account, settings);
      for (const pmId of allowedMethods) {
        this.conn.db
          .insert(schema.accountPaymentMethods)
          .values({
            accountId: account.id,
            paymentMethodId: pmId,
          })
          .run();
      }
    });

    this.logger?.info('Created account', {
      id: account.id,
      name: account.name,
      kind: account.kind,
      currencies: getAccountCurrencies(account),
      hasCard: Boolean(account.card),
    });

    return Promise.resolve();
  }

  updateAccount(id: string, changes: Partial<Omit<AccountConfig, 'id'>>): Promise<void> {
    const settings = this.loadSettingsFromDb();
    const current = findAccount(settings, id);
    if (!current) {
      this.logger?.warn(`Cannot update account "${id}": not found`);
      return Promise.resolve();
    }

    const merged: AccountConfig = { ...current, ...changes };

    this.runInTransaction(`updateAccount (${id})`, () => {
      this.conn.db
        .update(schema.accounts)
        .set({
          name: merged.name,
          kind: merged.kind,
          initials: merged.initials,
          color: merged.color,
          openingDate: toLocalDateString(merged.openingDate),
          archived: Boolean(merged.archived),
          cardName: merged.card?.name ?? null,
          cardLimitCents: merged.card?.limit ?? null,
          cardClosingDay: merged.card?.closingDay ?? null,
          cardDueDay: merged.card?.dueDay ?? null,
        })
        .where(and(eq(schema.accounts.workspaceId, this.workspaceId), eq(schema.accounts.id, id)))
        .run();

      if (changes.currencies !== undefined || changes.openingBalances !== undefined) {
        this.conn.db.delete(schema.accountBalances).where(eq(schema.accountBalances.accountId, id)).run();
        const currencies = getAccountCurrencies(merged);
        currencies.forEach((curr, idx) => {
          this.conn.db
            .insert(schema.accountBalances)
            .values({
              accountId: id,
              currency: curr,
              openingBalanceCents: getAccountOpeningBalance(merged, curr),
              sortOrder: idx,
            })
            .run();
        });
      }

      if (changes.allowedPaymentMethods !== undefined || changes.card !== undefined || changes.kind !== undefined) {
        this.conn.db.delete(schema.accountPaymentMethods).where(eq(schema.accountPaymentMethods.accountId, id)).run();
        const allowedMethods = getAllowedPaymentMethodIds(merged, settings);
        for (const pmId of allowedMethods) {
          this.conn.db
            .insert(schema.accountPaymentMethods)
            .values({
              accountId: id,
              paymentMethodId: pmId,
            })
            .run();
        }
      }
    });

    this.logger?.info('Updated account', {
      id,
      changedFields: Object.keys(changes),
    });

    return Promise.resolve();
  }

  archiveAccount(id: string, cancelRecurrences = false, effectiveDate: Date = getToday()): Promise<void> {
    const effectiveStr = toLocalDateString(effectiveDate);
    this.runInTransaction(`archiveAccount (${id})`, () => {
      this.conn.db
        .update(schema.accounts)
        .set({ archived: true })
        .where(and(eq(schema.accounts.workspaceId, this.workspaceId), eq(schema.accounts.id, id)))
        .run();

      if (cancelRecurrences) {
        const activeRules = this.conn.db
          .select()
          .from(schema.recurringRules)
          .where(
            and(
              eq(schema.recurringRules.workspaceId, this.workspaceId),
              eq(schema.recurringRules.accountId, id),
              eq(schema.recurringRules.status, 'active'),
            ),
          )
          .all();

        for (const rule of activeRules) {
          this.conn.db
            .update(schema.recurringRules)
            .set({ status: 'canceled', canceledAt: effectiveStr })
            .where(eq(schema.recurringRules.id, rule.id))
            .run();

          this.conn.db
            .delete(schema.transactions)
            .where(
              and(
                eq(schema.transactions.workspaceId, this.workspaceId),
                eq(schema.transactions.recurringRuleId, rule.id),
                gte(schema.transactions.date, effectiveStr),
              ),
            )
            .run();
        }
      }
    });

    this.logger?.info('Archived account', { id, cancelRecurrences, effectiveDate: effectiveStr });

    return Promise.resolve();
  }

  restoreAccount(id: string): Promise<void> {
    this.logger?.info(`Restoring account "${id}"`);
    this.conn.db
      .update(schema.accounts)
      .set({ archived: false })
      .where(and(eq(schema.accounts.workspaceId, this.workspaceId), eq(schema.accounts.id, id)))
      .run();
    return Promise.resolve();
  }

  deleteAccount(id: string): Promise<void> {
    const target = this.conn.db
      .select()
      .from(schema.accounts)
      .where(and(eq(schema.accounts.workspaceId, this.workspaceId), eq(schema.accounts.id, id)))
      .get();

    if (!target || target.system) {
      this.logger?.warn(`Cannot delete account "${id}": system account or not found`);
      return Promise.reject(new Error('Cannot delete system account'));
    }

    this.runInTransaction(`deleteAccount (${id})`, () => {
      const transferRows = this.conn.db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.workspaceId, this.workspaceId),
            eq(schema.transactions.accountId, id),
            sql`${schema.transactions.transferId} IS NOT NULL`,
          ),
        )
        .all();

      const transferIds = transferRows.map(r => r.transferId).filter((tid): tid is string => Boolean(tid));
      if (transferIds.length > 0) {
        this.conn.db
          .delete(schema.transactions)
          .where(
            and(
              eq(schema.transactions.workspaceId, this.workspaceId),
              inArray(schema.transactions.transferId, transferIds),
            ),
          )
          .run();
      }

      this.conn.db
        .delete(schema.accounts)
        .where(and(eq(schema.accounts.workspaceId, this.workspaceId), eq(schema.accounts.id, id)))
        .run();
    });

    this.logger?.info('Deleted account', { id });

    return Promise.resolve();
  }

  createTransactionType(type: TransactionTypeConfig): Promise<void> {
    const existing = this.conn.db
      .select()
      .from(schema.transactionTypes)
      .where(eq(schema.transactionTypes.workspaceId, this.workspaceId))
      .all();

    this.conn.db
      .insert(schema.transactionTypes)
      .values({
        id: type.id,
        workspaceId: this.workspaceId,
        name: type.name,
        direction: type.direction,
        color: type.color,
        icon: type.icon,
        systemTag: type.system ?? null,
        sortOrder: existing.length,
      })
      .run();

    this.logger?.info('Created transaction type', { id: type.id, name: type.name, direction: type.direction });
    return Promise.resolve();
  }

  updateTransactionType(id: string, changes: Partial<Omit<TransactionTypeConfig, 'id'>>): Promise<void> {
    const current = this.conn.db
      .select()
      .from(schema.transactionTypes)
      .where(and(eq(schema.transactionTypes.workspaceId, this.workspaceId), eq(schema.transactionTypes.id, id)))
      .get();

    if (!current) {
      this.logger?.warn(`Cannot update transaction type "${id}": not found`);
      return Promise.resolve();
    }

    this.conn.db
      .update(schema.transactionTypes)
      .set({
        name: changes.name ?? current.name,
        color: changes.color ?? current.color,
        icon: changes.icon ?? current.icon,
        direction: current.systemTag ? current.direction : (changes.direction ?? current.direction),
      })
      .where(and(eq(schema.transactionTypes.workspaceId, this.workspaceId), eq(schema.transactionTypes.id, id)))
      .run();

    this.logger?.info('Updated transaction type', { id, changedFields: Object.keys(changes) });
    return Promise.resolve();
  }

  reorderTransactionTypes(_direction: 'income' | 'expense', orderedIds: string[]): Promise<void> {
    this.runInTransaction(`reorderTransactionTypes (${_direction})`, () => {
      orderedIds.forEach((id, idx) => {
        this.conn.db
          .update(schema.transactionTypes)
          .set({ sortOrder: idx })
          .where(and(eq(schema.transactionTypes.workspaceId, this.workspaceId), eq(schema.transactionTypes.id, id)))
          .run();
      });
    });

    this.logger?.info('Reordered transaction types', { direction: _direction, count: orderedIds.length });
    return Promise.resolve();
  }

  reassignAndDeleteTransactionType(fromTypeId: string, toTypeId?: string): Promise<void> {
    const target = this.conn.db
      .select()
      .from(schema.transactionTypes)
      .where(and(eq(schema.transactionTypes.workspaceId, this.workspaceId), eq(schema.transactionTypes.id, fromTypeId)))
      .get();

    if (!target || target.systemTag === 'transfer' || target.id === TRANSFER_TYPE_ID) {
      this.logger?.warn(`Cannot delete system transaction type "${fromTypeId}"`);
      return Promise.reject(new Error('Cannot delete system transaction type'));
    }

    this.runInTransaction(`reassignAndDeleteTransactionType (${fromTypeId} -> ${toTypeId ?? 'none'})`, () => {
      if (toTypeId) {
        this.conn.db
          .update(schema.transactions)
          .set({ typeId: toTypeId })
          .where(and(eq(schema.transactions.workspaceId, this.workspaceId), eq(schema.transactions.typeId, fromTypeId)))
          .run();

        this.conn.db
          .update(schema.recurringRules)
          .set({ typeId: toTypeId })
          .where(
            and(eq(schema.recurringRules.workspaceId, this.workspaceId), eq(schema.recurringRules.typeId, fromTypeId)),
          )
          .run();
      }

      this.conn.db
        .delete(schema.goalTypeMappings)
        .where(
          and(
            eq(schema.goalTypeMappings.workspaceId, this.workspaceId),
            eq(schema.goalTypeMappings.transactionTypeId, fromTypeId),
          ),
        )
        .run();

      this.conn.db
        .delete(schema.transactionTypes)
        .where(
          and(eq(schema.transactionTypes.workspaceId, this.workspaceId), eq(schema.transactionTypes.id, fromTypeId)),
        )
        .run();
    });

    this.logger?.info('Reassigned and deleted transaction type', { fromTypeId, toTypeId });
    return Promise.resolve();
  }

  createPaymentMethod(method: PaymentMethodConfig): Promise<void> {
    const existing = this.conn.db
      .select()
      .from(schema.paymentMethods)
      .where(eq(schema.paymentMethods.workspaceId, this.workspaceId))
      .all();

    const systemTag = method.behavior === 'credit-card' ? 'credit-card' : method.id === 'cash' ? 'cash' : null;

    this.conn.db
      .insert(schema.paymentMethods)
      .values({
        id: method.id,
        workspaceId: this.workspaceId,
        name: method.name,
        icon: method.icon,
        systemTag,
        sortOrder: existing.length,
      })
      .run();

    this.logger?.info('Created payment method', { id: method.id, name: method.name, behavior: method.behavior });
    return Promise.resolve();
  }

  updatePaymentMethod(id: string, changes: Partial<Omit<PaymentMethodConfig, 'id'>>): Promise<void> {
    const current = this.conn.db
      .select()
      .from(schema.paymentMethods)
      .where(and(eq(schema.paymentMethods.workspaceId, this.workspaceId), eq(schema.paymentMethods.id, id)))
      .get();

    if (!current) {
      this.logger?.warn(`Cannot update payment method "${id}": not found`);
      return Promise.resolve();
    }

    this.conn.db
      .update(schema.paymentMethods)
      .set({
        name: changes.name ?? current.name,
        icon: changes.icon ?? current.icon,
      })
      .where(and(eq(schema.paymentMethods.workspaceId, this.workspaceId), eq(schema.paymentMethods.id, id)))
      .run();

    this.logger?.info('Updated payment method', { id, changedFields: Object.keys(changes) });
    return Promise.resolve();
  }

  reorderPaymentMethods(orderedIds: string[]): Promise<void> {
    this.runInTransaction('reorderPaymentMethods', () => {
      orderedIds.forEach((id, idx) => {
        this.conn.db
          .update(schema.paymentMethods)
          .set({ sortOrder: idx })
          .where(and(eq(schema.paymentMethods.workspaceId, this.workspaceId), eq(schema.paymentMethods.id, id)))
          .run();
      });
    });

    this.logger?.info('Reordered payment methods', { count: orderedIds.length });
    return Promise.resolve();
  }

  reassignAndDeletePaymentMethod(fromMethodId: string, toMethodId?: string): Promise<void> {
    const target = this.conn.db
      .select()
      .from(schema.paymentMethods)
      .where(and(eq(schema.paymentMethods.workspaceId, this.workspaceId), eq(schema.paymentMethods.id, fromMethodId)))
      .get();

    if (!target || target.systemTag !== null || target.id === 'cash' || target.id === CREDIT_CARD_METHOD_ID) {
      this.logger?.warn(`Cannot delete system payment method "${fromMethodId}"`);
      return Promise.reject(new Error('Cannot delete system payment method'));
    }

    this.runInTransaction(`reassignAndDeletePaymentMethod (${fromMethodId} -> ${toMethodId ?? 'none'})`, () => {
      if (toMethodId) {
        this.conn.db
          .update(schema.transactions)
          .set({ paymentMethodId: toMethodId })
          .where(
            and(
              eq(schema.transactions.workspaceId, this.workspaceId),
              eq(schema.transactions.paymentMethodId, fromMethodId),
            ),
          )
          .run();

        this.conn.db
          .update(schema.recurringRules)
          .set({ paymentMethodId: toMethodId })
          .where(
            and(
              eq(schema.recurringRules.workspaceId, this.workspaceId),
              eq(schema.recurringRules.paymentMethodId, fromMethodId),
            ),
          )
          .run();
      }

      this.conn.db
        .delete(schema.accountPaymentMethods)
        .where(eq(schema.accountPaymentMethods.paymentMethodId, fromMethodId))
        .run();

      this.conn.db
        .delete(schema.paymentMethods)
        .where(and(eq(schema.paymentMethods.workspaceId, this.workspaceId), eq(schema.paymentMethods.id, fromMethodId)))
        .run();
    });

    this.logger?.info('Reassigned and deleted payment method', { fromMethodId, toMethodId });
    return Promise.resolve();
  }

  updateReferenceIncome(incomeCents: number): Promise<void> {
    this.conn.db
      .update(schema.workspaces)
      .set({
        goalsReferenceIncomeCents: incomeCents,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.workspaces.id, this.workspaceId))
      .run();

    this.logger?.info('Updated reference monthly income', { incomeCents });
    return Promise.resolve();
  }

  updateGoalsMode(mode: 'percentage' | 'currency'): Promise<void> {
    this.conn.db
      .update(schema.workspaces)
      .set({
        goalsMode: mode,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.workspaces.id, this.workspaceId))
      .run();

    this.logger?.info('Updated goals mode', { mode });
    return Promise.resolve();
  }

  saveGoalCategories(categories: GoalCategory[], typeMappings: Record<string, string>): Promise<void> {
    this.runInTransaction(`saveGoalCategories (${categories.length} categories)`, () => {
      this.conn.db
        .delete(schema.goalTypeMappings)
        .where(eq(schema.goalTypeMappings.workspaceId, this.workspaceId))
        .run();

      this.conn.db.delete(schema.goalCategories).where(eq(schema.goalCategories.workspaceId, this.workspaceId)).run();

      categories.forEach((cat, idx) => {
        this.conn.db
          .insert(schema.goalCategories)
          .values({
            id: cat.id,
            workspaceId: this.workspaceId,
            name: cat.name,
            percentage: cat.percentage,
            color: cat.color,
            icon: cat.icon,
            description: cat.description ?? null,
            sortOrder: idx,
          })
          .run();
      });

      const validCategoryIds = new Set(categories.map(c => c.id));
      for (const [typeId, goalCatId] of Object.entries(typeMappings)) {
        if (validCategoryIds.has(goalCatId)) {
          this.conn.db
            .insert(schema.goalTypeMappings)
            .values({
              workspaceId: this.workspaceId,
              transactionTypeId: typeId,
              goalCategoryId: goalCatId,
            })
            .run();
        }
      }
    });

    this.logger?.info('Saved goal categories', {
      categoriesCount: categories.length,
      typeMappingsCount: Object.keys(typeMappings).length,
    });
    return Promise.resolve();
  }

  updatePreferences(changes: {
    language?: SupportedLocale;
    currency?: SupportedCurrency;
    exchangeRate?: Partial<Settings['exchangeRate']>;
  }): Promise<void> {
    const current = this.conn.db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, this.workspaceId))
      .get();

    if (!current) {
      this.logger?.warn(`Cannot update preferences for workspace "${this.workspaceId}": not found`);
      return Promise.resolve();
    }

    this.conn.db
      .update(schema.workspaces)
      .set({
        language: changes.language ?? current.language,
        defaultCurrency: changes.currency ?? current.defaultCurrency,
        exchangeRate:
          changes.exchangeRate && 'rate' in changes.exchangeRate
            ? (changes.exchangeRate.rate ?? null)
            : current.exchangeRate,
        exchangeRateUpdatedAt:
          changes.exchangeRate && 'lastUpdated' in changes.exchangeRate
            ? (changes.exchangeRate.lastUpdated ?? null)
            : current.exchangeRateUpdatedAt,
        exchangeRateSource: changes.exchangeRate?.source ?? current.exchangeRateSource,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.workspaces.id, this.workspaceId))
      .run();

    this.logger?.info('Updated workspace preferences', {
      language: changes.language,
      currency: changes.currency,
      hasExchangeRateUpdate: Boolean(changes.exchangeRate),
    });
    return Promise.resolve();
  }

  resetSettings(seedMode: 'production' | 'development' = this.seedMode): Promise<WorkspaceSnapshot> {
    this.logger?.warn(`resetSettings requested with seedMode "${seedMode}" for workspace "${this.workspaceId}"`);
    resetAndSeedWorkspace(this.conn, seedMode, this.workspaceId, this.logger);
    return this.loadWorkspace(90);
  }
}
