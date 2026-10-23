import { z } from 'zod';
import { SEARCH_MIN_LENGTH } from '../app/data/search';

export const transactionSearchQuerySchema = z.object({
  q: z.string().trim().min(SEARCH_MIN_LENGTH).max(100),
  limit: z.coerce.number().int().min(1).max(2000).default(500),
});

export const localDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD')
  .refine(val => {
    const [y, m, d] = val.split('-').map(Number);
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    return (
      !Number.isNaN(date.getTime()) && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    );
  }, 'Date is not a valid calendar date');

export const directionSchema = z.enum(['income', 'expense']);
export const supportedCurrencySchema = z.enum(['USD', 'BRL']);
export const supportedLocaleSchema = z.enum(['en-US', 'pt-BR']);

export const serializedTransactionSchema = z.object({
  id: z.string().min(1),
  date: localDateStringSchema,
  direction: directionSchema,
  value: z.number().int(),
  currency: supportedCurrencySchema,
  description: z.string(),
  accountId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  typeId: z.string().min(1),
  transferId: z.string().optional(),
  installment: z
    .object({
      current: z.number().int().positive(),
      total: z.number().int().positive(),
      groupId: z.string().min(1),
    })
    .optional(),
  recurring: z
    .object({
      ruleId: z.string().min(1),
      iteration: z.number().int().positive(),
    })
    .optional(),
});

export const serializedTransactionDraftSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('single'),
    transaction: serializedTransactionSchema.omit({ id: true }),
  }),
  z.object({
    kind: z.literal('transfer'),
    date: localDateStringSchema,
    value: z.number().int().positive(),
    toValue: z.number().int().positive().optional(),
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    description: z.string(),
    fromCurrency: supportedCurrencySchema.optional(),
    toCurrency: supportedCurrencySchema.optional(),
  }),
  z.object({
    kind: z.literal('installments'),
    transaction: serializedTransactionSchema.omit({ id: true, installment: true }),
    count: z.number().int().positive(),
    totalValue: z.number().int().positive(),
    firstDate: localDateStringSchema,
  }),
  z.object({
    kind: z.literal('recurring'),
    transaction: serializedTransactionSchema.omit({ id: true, recurring: true }),
    value: z.number().int().positive(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    startDate: localDateStringSchema,
    limit: z.number().int().positive().optional(),
  }),
]);

export const serializedEditingTargetSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('single'),
      transaction: serializedTransactionSchema,
    }),
    z.object({
      kind: z.literal('transfer'),
      outgoing: serializedTransactionSchema,
      incoming: serializedTransactionSchema,
    }),
    z.object({
      kind: z.literal('installments'),
      series: z.array(serializedTransactionSchema),
    }),
    z.object({
      kind: z.literal('recurring'),
      ruleId: z.string().min(1),
      series: z.array(serializedTransactionSchema),
    }),
  ])
  .nullable()
  .optional();

export const serializedAccountConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['Checking', 'Savings', 'Cash']),
  currencies: z.array(supportedCurrencySchema),
  openingBalances: z.record(supportedCurrencySchema, z.number().int()).optional(),
  openingDate: localDateStringSchema,
  initials: z.string().min(1),
  color: z.string().min(1),
  card: z
    .object({
      name: z.string().min(1),
      closingDay: z.number().int().min(1).max(31),
      dueDay: z.number().int().min(1).max(31),
      limit: z.number().int().nonnegative(),
    })
    .optional(),
  allowedPaymentMethods: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
});

export const transactionTypeConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  direction: directionSchema,
  color: z.string().min(1),
  icon: z.string().min(1),
  system: z.literal('transfer').optional(),
});

export const paymentMethodConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  behavior: z.enum(['standard', 'credit-card']),
});

export const goalCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  percentage: z.number().min(0).max(100),
  color: z.string().min(1),
  icon: z.string().min(1),
  description: z.string().optional(),
});

export const rpcRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('saveTransactionDraft'),
    payload: z.object({
      draft: serializedTransactionDraftSchema,
      editingTarget: serializedEditingTargetSchema,
    }),
  }),
  z.object({
    action: z.literal('deleteTransactionTarget'),
    payload: z.object({
      target: serializedTransactionSchema,
      scope: z.enum(['only-this', 'this-and-future', 'all']).optional(),
    }),
  }),
  z.object({
    action: z.literal('cancelRecurringRule'),
    payload: z.object({
      ruleId: z.string().min(1),
      effectiveDate: localDateStringSchema,
    }),
  }),
  z.object({
    action: z.literal('deleteRecurringRule'),
    payload: z.object({
      ruleId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('createAccount'),
    payload: z.object({
      account: serializedAccountConfigSchema,
    }),
  }),
  z.object({
    action: z.literal('updateAccount'),
    payload: z.object({
      id: z.string().min(1),
      changes: serializedAccountConfigSchema.omit({ id: true }).partial(),
    }),
  }),
  z.object({
    action: z.literal('archiveAccount'),
    payload: z.object({
      id: z.string().min(1),
      cancelRecurrences: z.boolean().optional(),
      effectiveDate: localDateStringSchema.optional(),
    }),
  }),
  z.object({
    action: z.literal('restoreAccount'),
    payload: z.object({
      id: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('deleteAccount'),
    payload: z.object({
      id: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('createTransactionType'),
    payload: z.object({
      type: transactionTypeConfigSchema,
    }),
  }),
  z.object({
    action: z.literal('updateTransactionType'),
    payload: z.object({
      id: z.string().min(1),
      changes: transactionTypeConfigSchema.omit({ id: true }).partial(),
    }),
  }),
  z.object({
    action: z.literal('reorderTransactionTypes'),
    payload: z.object({
      direction: directionSchema,
      orderedIds: z.array(z.string().min(1)),
    }),
  }),
  z.object({
    action: z.literal('reassignAndDeleteTransactionType'),
    payload: z.object({
      fromTypeId: z.string().min(1),
      toTypeId: z.string().min(1).optional(),
    }),
  }),
  z.object({
    action: z.literal('createPaymentMethod'),
    payload: z.object({
      method: paymentMethodConfigSchema,
    }),
  }),
  z.object({
    action: z.literal('updatePaymentMethod'),
    payload: z.object({
      id: z.string().min(1),
      changes: paymentMethodConfigSchema.omit({ id: true }).partial(),
    }),
  }),
  z.object({
    action: z.literal('reorderPaymentMethods'),
    payload: z.object({
      orderedIds: z.array(z.string().min(1)),
    }),
  }),
  z.object({
    action: z.literal('reassignAndDeletePaymentMethod'),
    payload: z.object({
      fromMethodId: z.string().min(1),
      toMethodId: z.string().min(1).optional(),
    }),
  }),
  z.object({
    action: z.literal('updateReferenceIncome'),
    payload: z.object({
      incomeCents: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    action: z.literal('updateGoalsMode'),
    payload: z.object({
      mode: z.enum(['percentage', 'currency']),
    }),
  }),
  z.object({
    action: z.literal('saveGoalCategories'),
    payload: z.object({
      categories: z.array(goalCategorySchema),
      typeMappings: z.record(z.string(), z.string()),
    }),
  }),
  z.object({
    action: z.literal('updatePreferences'),
    payload: z.object({
      changes: z.object({
        language: supportedLocaleSchema.optional(),
        currency: supportedCurrencySchema.optional(),
        exchangeRate: z
          .object({
            rate: z.number().nullable().optional(),
            lastUpdated: z.string().nullable().optional(),
            source: z.enum(['api', 'manual', 'none']).optional(),
            isLoading: z.boolean().optional(),
            error: z.string().nullable().optional(),
          })
          .optional(),
      }),
    }),
  }),
  z.object({
    action: z.literal('resetSettings'),
    payload: z
      .object({
        seedMode: z.enum(['production', 'development']).optional(),
      })
      .optional()
      .default({}),
  }),
]);

export type RpcRequest = z.infer<typeof rpcRequestSchema>;
