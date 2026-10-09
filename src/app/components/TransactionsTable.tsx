import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { formatSignedValue, type Transaction } from '../data/transactions';
import { formatInstallmentLabel } from '../data/installments';
import { formatFull, getToday } from '../data/dates';

type TransactionsTableProps = {
  transactions: Transaction[];
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const today = getToday();

  const recentTransactions = [...transactions]
    .filter(t => t.date.getTime() <= today.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.id.localeCompare(a.id))
    .slice(0, 8);

  return (
    <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
      <div role="heading" aria-level={2} className="text-foreground text-lg mb-4">
        Recent Transactions
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">Description</TableHead>
              <TableHead className="text-muted-foreground">Type</TableHead>
              <TableHead className="text-muted-foreground">Account</TableHead>
              <TableHead className="text-muted-foreground text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.map(transaction => (
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
                <TableCell className="text-muted-foreground">{transaction.type}</TableCell>
                <TableCell className="text-muted-foreground">{transaction.account}</TableCell>
                <TableCell
                  className={`text-right ${transaction.direction === 'income' ? 'text-theme-green' : 'text-theme-red'}`}
                >
                  {formatSignedValue(transaction)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
