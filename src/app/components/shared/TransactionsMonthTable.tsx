import React from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { formatSignedValue, groupTransactionsByMonth, Transaction } from '@/data/transactions';
import { formatInstallmentLabel } from '@/data/installments';
import { formatRowDate, getToday } from '@/data/dates';
import { useSettings } from '@/state/SettingsContext';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { useI18n } from '@/i18n';

export type TransactionsMonthTableProps = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  showAccount?: boolean;
};

export function TransactionsMonthTable({
  transactions,
  onEdit,
  onDelete,
  showAccount = true,
}: TransactionsMonthTableProps) {
  const { findType, findAccount, findMethod } = useSettings();
  const { t, currency, locale } = useI18n();
  const groups = groupTransactionsByMonth(transactions, locale);

  if (transactions.length === 0) {
    return null;
  }

  const today = getToday();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">{t('transactions.tableDate')}</TableHead>
            <TableHead className="text-muted-foreground">{t('transactions.tableDescription')}</TableHead>
            <TableHead className="text-muted-foreground">{t('transactions.tableCategory')}</TableHead>
            {showAccount && <TableHead className="text-muted-foreground">{t('transactions.tableAccount')}</TableHead>}
            <TableHead className="text-muted-foreground">{t('transactions.tablePayment')}</TableHead>
            <TableHead className="text-muted-foreground text-right">{t('transactions.tableAmount')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('common.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(group => (
            <React.Fragment key={group.key}>
              <TableRow className="bg-foreground/5 hover:bg-foreground/5">
                <TableCell
                  colSpan={showAccount ? 7 : 6}
                  className="text-xs uppercase tracking-wider text-muted-foreground font-medium"
                >
                  {group.label}
                </TableCell>
              </TableRow>
              {group.transactions.map(transaction => {
                const isFuture = transaction.date.getTime() > today.getTime();
                const typeConfig = findType(transaction.typeId);
                const accountConfig = findAccount(transaction.accountId);
                const methodConfig = findMethod(transaction.paymentMethodId);

                return (
                  <TableRow
                    key={transaction.id}
                    className={`border-border/50 hover:bg-cyan-500/10 transition-colors group ${
                      isFuture ? 'opacity-60' : ''
                    }`}
                    title={isFuture ? t('transactions.scheduled') : undefined}
                  >
                    <TableCell className="text-foreground whitespace-nowrap">
                      {formatRowDate(transaction.date, locale)}
                    </TableCell>
                    <TableCell className="text-foreground group-hover:text-theme-cyan transition-colors align-middle">
                      <div className="inline-flex items-center gap-2">
                        {transaction.description}
                        {transaction.installment && (
                          <span className="text-xs rounded-md bg-foreground/10 px-1.5 py-0.5 text-muted-foreground">
                            {formatInstallmentLabel(transaction.installment)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      <CategoryChip typeConfig={typeConfig} label={transaction.typeId} />
                    </TableCell>
                    {showAccount && (
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {accountConfig?.name ?? transaction.accountId}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {methodConfig?.name ?? '—'}
                    </TableCell>
                    <TableCell
                      className={`text-right whitespace-nowrap ${
                        transaction.direction === 'income' ? 'text-theme-green' : 'text-theme-red'
                      }`}
                    >
                      {formatSignedValue(transaction, currency, locale)}
                    </TableCell>
                    <TableCell className="w-12 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${transaction.description}`}
                            className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                          >
                            <MoreVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border text-foreground">
                          <DropdownMenuItem
                            onSelect={() => onEdit(transaction)}
                            className="focus:bg-cyan-500/20 focus:text-theme-cyan cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => onDelete(transaction)}
                            className="cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('common.exclude')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
