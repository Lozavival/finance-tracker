import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { formatSignedValue, type Transaction } from '../data/transactions';
import { formatInstallmentLabel } from '../data/installments';
import { getToday } from '../data/dates';
import { useSettings } from '../state/SettingsContext';
import { CategoryChip } from './shared/CategoryChip';
import { useI18n } from '../i18n';

type TransactionsTableProps = {
  transactions: Transaction[];
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const { findType, findAccount } = useSettings();
  const { t, formatFull, currency, locale } = useI18n();
  const today = getToday();

  const recentTransactions = [...transactions]
    .filter(t => t.date.getTime() <= today.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.id.localeCompare(a.id))
    .slice(0, 8);

  return (
    <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
      <div role="heading" aria-level={2} className="text-foreground text-lg mb-4">
        {t('dashboard.recentTransactions')}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">{t('transactions.tableDate')}</TableHead>
              <TableHead className="text-muted-foreground">{t('transactions.tableDescription')}</TableHead>
              <TableHead className="text-muted-foreground">{t('transactions.tableCategory')}</TableHead>
              <TableHead className="text-muted-foreground">{t('transactions.tableAccount')}</TableHead>
              <TableHead className="text-muted-foreground text-right">{t('common.value')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.map(transaction => {
              const typeConfig = findType(transaction.typeId);
              const accountConfig = findAccount(transaction.accountId);

              return (
                <TableRow
                  key={transaction.id}
                  className="border-b border-border/50 hover:bg-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 group"
                >
                  <TableCell className="text-foreground">{formatFull(transaction.date)}</TableCell>
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
                  <TableCell className="text-muted-foreground">
                    <CategoryChip typeConfig={typeConfig} label={transaction.typeId} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {accountConfig?.name ?? transaction.accountId}
                  </TableCell>
                  <TableCell
                    className={`text-right ${transaction.direction === 'income' ? 'text-theme-green' : 'text-theme-red'}`}
                  >
                    {formatSignedValue(transaction, currency, locale)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
