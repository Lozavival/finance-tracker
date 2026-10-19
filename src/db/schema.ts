import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(), // e.g., 'default'
  language: text('language', { enum: ['en-US', 'pt-BR'] })
    .notNull()
    .default('en-US'),
  defaultCurrency: text('default_currency', { enum: ['USD', 'BRL'] })
    .notNull()
    .default('USD'),
  exchangeRate: real('exchange_rate'),
  exchangeRateUpdatedAt: text('exchange_rate_updated_at'),
  exchangeRateSource: text('exchange_rate_source', { enum: ['api', 'manual', 'none'] })
    .notNull()
    .default('none'),
  goalsReferenceIncomeCents: integer('goals_reference_income_cents').notNull().default(100000000),
  goalsMode: text('goals_mode', { enum: ['percentage', 'currency'] })
    .notNull()
    .default('percentage'),
  updatedAt: text('updated_at').notNull(),
});

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['Checking', 'Savings', 'Investment', 'Cash'] }).notNull(),
    initials: text('initials').notNull(),
    color: text('color').notNull(),
    openingDate: text('opening_date').notNull(), // YYYY-MM-DD
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    system: integer('system', { mode: 'boolean' }).notNull().default(false),
    cardName: text('card_name'),
    cardLimitCents: integer('card_limit_cents'),
    cardClosingDay: integer('card_closing_day'),
    cardDueDay: integer('card_due_day'),
    createdAt: text('created_at').notNull(),
  },
  table => [index('idx_accounts_workspace').on(table.workspaceId)],
);

export const accountBalances = sqliteTable(
  'account_balances',
  {
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    currency: text('currency', { enum: ['USD', 'BRL'] }).notNull(),
    openingBalanceCents: integer('opening_balance_cents').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  table => [primaryKey({ columns: [table.accountId, table.currency] })],
);

export const paymentMethods = sqliteTable(
  'payment_methods',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    systemTag: text('system_tag', { enum: ['cash', 'credit-card'] }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  table => [index('idx_payment_methods_workspace').on(table.workspaceId)],
);

export const accountPaymentMethods = sqliteTable(
  'account_payment_methods',
  {
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    paymentMethodId: text('payment_method_id')
      .notNull()
      .references(() => paymentMethods.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.accountId, table.paymentMethodId] })],
);

export const transactionTypes = sqliteTable(
  'transaction_types',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    direction: text('direction', { enum: ['income', 'expense'] }).notNull(),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
    systemTag: text('system_tag', { enum: ['transfer'] }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  table => [index('idx_transaction_types_workspace').on(table.workspaceId, table.direction, table.sortOrder)],
);

export const goalCategories = sqliteTable(
  'goal_categories',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    percentage: real('percentage').notNull(),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  table => [index('idx_goal_categories_workspace').on(table.workspaceId, table.sortOrder)],
);

export const goalTypeMappings = sqliteTable(
  'goal_type_mappings',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    transactionTypeId: text('transaction_type_id')
      .notNull()
      .references(() => transactionTypes.id, { onDelete: 'cascade' }),
    goalCategoryId: text('goal_category_id')
      .notNull()
      .references(() => goalCategories.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.workspaceId, table.transactionTypeId] })],
);

export const recurringRules = sqliteTable(
  'recurring_rules',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency', { enum: ['USD', 'BRL'] }).notNull(),
    direction: text('direction', { enum: ['income', 'expense'] }).notNull(),
    typeId: text('type_id')
      .notNull()
      .references(() => transactionTypes.id, { onDelete: 'restrict' }),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    paymentMethodId: text('payment_method_id').references(() => paymentMethods.id, { onDelete: 'restrict' }),
    startDate: text('start_date').notNull(), // YYYY-MM-DD
    frequency: text('frequency', { enum: ['monthly'] })
      .notNull()
      .default('monthly'),
    limitKind: text('limit_kind', { enum: ['infinite', 'count'] }).notNull(),
    limitCount: integer('limit_count'),
    status: text('status', { enum: ['active', 'canceled'] }).notNull(),
    createdAt: text('created_at').notNull(), // YYYY-MM-DD
    canceledAt: text('canceled_at'), // YYYY-MM-DD
  },
  table => [index('idx_recurring_rules_workspace').on(table.workspaceId, table.accountId)],
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    description: text('description').notNull(),
    typeId: text('type_id')
      .notNull()
      .references(() => transactionTypes.id, { onDelete: 'restrict' }),
    direction: text('direction', { enum: ['income', 'expense'] }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency', { enum: ['USD', 'BRL'] }).notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    paymentMethodId: text('payment_method_id').references(() => paymentMethods.id, { onDelete: 'restrict' }),
    transferId: text('transfer_id'),
    installmentGroupId: text('installment_group_id'),
    installmentNumber: integer('installment_number'),
    installmentTotal: integer('installment_total'),
    recurringRuleId: text('recurring_rule_id').references(() => recurringRules.id, { onDelete: 'set null' }),
    recurringIndex: integer('recurring_index'),
    recurringTotal: integer('recurring_total'),
    createdAt: text('created_at').notNull(),
  },
  table => [
    index('idx_tx_workspace_date').on(table.workspaceId, table.date),
    index('idx_tx_account_date').on(table.accountId, table.date),
    index('idx_tx_type').on(table.typeId),
    index('idx_tx_payment_method').on(table.paymentMethodId),
    index('idx_tx_transfer_group').on(table.transferId),
    index('idx_tx_installment_group').on(table.installmentGroupId),
    index('idx_tx_recurring_rule').on(table.recurringRuleId),
  ],
);
