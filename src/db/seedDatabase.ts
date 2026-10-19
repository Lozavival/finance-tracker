import { eq } from 'drizzle-orm';
import { type DatabaseConnection } from './client';
import * as schema from './schema';
import { PRODUCTION_DEFAULT_SETTINGS } from '../app/data/defaults';
import { DEV_DEFAULT_SETTINGS, SEEDED_RECURRING_RULES, SEEDED_TRANSACTIONS } from '../app/data/fixtures';
import { getAccountCurrencies, getAccountOpeningBalance, getAllowedPaymentMethodIds } from '../app/data/settings';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../app/i18n/types';
import { toLocalDateString } from '../app/data/dates';

export type SeedMode = 'production' | 'development';

export const DEFAULT_WORKSPACE_ID = 'default';

export function resolveDefaultSeedMode(): SeedMode {
  const envSeed = process.env.SEED_MODE;
  if (envSeed === 'production' || envSeed === 'development') {
    return envSeed;
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export function seedWorkspaceIfNeeded(
  conn: DatabaseConnection,
  mode: SeedMode = resolveDefaultSeedMode(),
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): boolean {
  const existing = conn.db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).get();

  if (existing) {
    return false;
  }

  resetAndSeedWorkspace(conn, mode, workspaceId);
  return true;
}

export function resetAndSeedWorkspace(
  conn: DatabaseConnection,
  mode: SeedMode = resolveDefaultSeedMode(),
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): void {
  const baseSettings = mode === 'production' ? PRODUCTION_DEFAULT_SETTINGS : DEV_DEFAULT_SETTINGS;
  const nowIso = new Date().toISOString();

  const runSeed = conn.sqlite.transaction(() => {
    // Delete existing workspace (cascades to all child tables)
    conn.db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).run();

    // 1. Insert workspace row
    conn.db
      .insert(schema.workspaces)
      .values({
        id: workspaceId,
        language: DEFAULT_LOCALE,
        defaultCurrency: DEFAULT_CURRENCY,
        exchangeRate: baseSettings.exchangeRate.rate,
        exchangeRateUpdatedAt: baseSettings.exchangeRate.lastUpdated,
        exchangeRateSource: baseSettings.exchangeRate.source,
        goalsReferenceIncomeCents: baseSettings.goals.referenceMonthlyIncome,
        goalsMode: baseSettings.goals.mode,
        updatedAt: nowIso,
      })
      .run();

    // 2. Insert payment methods
    baseSettings.paymentMethods.forEach((method, idx) => {
      const systemTag = method.behavior === 'credit-card' ? 'credit-card' : method.id === 'cash' ? 'cash' : null;
      conn.db
        .insert(schema.paymentMethods)
        .values({
          id: method.id,
          workspaceId,
          name: method.name,
          icon: method.icon,
          systemTag,
          sortOrder: idx,
        })
        .run();
    });

    // 3. Insert transaction types
    baseSettings.transactionTypes.forEach((type, idx) => {
      conn.db
        .insert(schema.transactionTypes)
        .values({
          id: type.id,
          workspaceId,
          name: type.name,
          direction: type.direction,
          color: type.color,
          icon: type.icon,
          systemTag: type.system ?? null,
          sortOrder: idx,
        })
        .run();
    });

    // 4. Insert accounts, account_balances, and account_payment_methods
    for (const acc of baseSettings.accounts) {
      conn.db
        .insert(schema.accounts)
        .values({
          id: acc.id,
          workspaceId,
          name: acc.name,
          kind: acc.kind,
          initials: acc.initials,
          color: acc.color,
          openingDate: toLocalDateString(acc.openingDate),
          archived: Boolean(acc.archived),
          system: acc.kind === 'Cash' || acc.id === 'cash-wallet',
          cardName: acc.card?.name ?? null,
          cardLimitCents: acc.card?.limit ?? null,
          cardClosingDay: acc.card?.closingDay ?? null,
          cardDueDay: acc.card?.dueDay ?? null,
          createdAt: nowIso,
        })
        .run();

      const currencies = getAccountCurrencies(acc);
      currencies.forEach((curr, idx) => {
        conn.db
          .insert(schema.accountBalances)
          .values({
            accountId: acc.id,
            currency: curr,
            openingBalanceCents: getAccountOpeningBalance(acc, curr),
            sortOrder: idx,
          })
          .run();
      });

      const allowedMethods = getAllowedPaymentMethodIds(acc, baseSettings);
      for (const pmId of allowedMethods) {
        conn.db
          .insert(schema.accountPaymentMethods)
          .values({
            accountId: acc.id,
            paymentMethodId: pmId,
          })
          .run();
      }
    }

    // 5. Insert goal categories and type mappings
    baseSettings.goals.categories.forEach((cat, idx) => {
      conn.db
        .insert(schema.goalCategories)
        .values({
          id: cat.id,
          workspaceId,
          name: cat.name,
          percentage: cat.percentage,
          color: cat.color,
          icon: cat.icon,
          description: cat.description ?? null,
          sortOrder: idx,
        })
        .run();
    });

    for (const [typeId, goalCatId] of Object.entries(baseSettings.goals.typeMappings)) {
      conn.db
        .insert(schema.goalTypeMappings)
        .values({
          workspaceId,
          transactionTypeId: typeId,
          goalCategoryId: goalCatId,
        })
        .run();
    }

    // 6. In development mode, seed demo recurring rules and transactions
    if (mode === 'development') {
      for (const rule of SEEDED_RECURRING_RULES) {
        conn.db
          .insert(schema.recurringRules)
          .values({
            id: rule.id,
            workspaceId,
            description: rule.description,
            amountCents: rule.value,
            currency: rule.currency,
            direction: rule.direction,
            typeId: rule.typeId,
            accountId: rule.accountId,
            paymentMethodId: rule.paymentMethodId ?? null,
            startDate: toLocalDateString(rule.startDate),
            frequency: rule.frequency,
            limitKind: rule.limit.kind,
            limitCount: rule.limit.kind === 'count' ? rule.limit.count : null,
            status: rule.status,
            createdAt: toLocalDateString(rule.createdAt),
            canceledAt: rule.canceledAt ? toLocalDateString(rule.canceledAt) : null,
          })
          .run();
      }

      for (const tx of SEEDED_TRANSACTIONS) {
        conn.db
          .insert(schema.transactions)
          .values({
            id: tx.id,
            workspaceId,
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
    }
  });

  runSeed();
}
