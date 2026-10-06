import { Card } from "./ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import {
  formatSignedValue,
  formatTransactionDate,
  type Transaction,
} from "../data/transactions"

type TransactionsTableProps = {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 8)

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
            {recentTransactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="border-b border-border/50 hover:bg-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 group"
              >
                <TableCell className="text-foreground">
                  {formatTransactionDate(transaction.date)}
                </TableCell>
                <TableCell className="text-foreground group-hover:text-theme-cyan transition-colors">
                  {transaction.description}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {transaction.type}
                </TableCell>
                 <TableCell className="text-muted-foreground">
                  {transaction.account}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    transaction.direction === "income"
                      ? "text-theme-green"
                      : "text-theme-red"
                  }`}
                >
                  {formatSignedValue(transaction)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
