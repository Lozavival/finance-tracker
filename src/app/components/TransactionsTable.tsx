import { Card } from "./ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

const transactions = [
  {
    id: 1,
    date: "Nov 5, 2025",
    description: "Amazon Purchase",
    type: "Shopping",
    amount: "-$124.99",
    account: "Bank of America",
  },
  {
    id: 2,
    date: "Nov 4, 2025",
    description: "Salary Deposit",
    type: "Income",
    amount: "+$5,200.00",
    account: "Bank of America",
  },
  {
    id: 3,
    date: "Nov 3, 2025",
    description: "Netflix Subscription",
    type: "Entertainment",
    amount: "-$15.99",
    account: "Citigroup",
  },
  {
    id: 4,
    date: "Nov 2, 2025",
    description: "Uber Ride",
    type: "Transportation",
    amount: "-$28.50",
    account: "Bank of America",
  },
  {
    id: 5,
    date: "Nov 1, 2025",
    description: "Refund - Returns",
    type: "Refund",
    amount: "+$89.99",
    account: "Bank of America",
  },
  {
    id: 6,
    date: "Oct 31, 2025",
    description: "International Transfer",
    type: "Transfer",
    amount: "-$1,500.00",
    account: "Goldman Sachs",
  },
  {
    id: 7,
    date: "Oct 30, 2025",
    description: "Starbucks Coffee",
    type: "Food & Dining",
    amount: "-$6.75",
    account: "Bank of America",
  },
  {
    id: 8,
    date: "Oct 29, 2025",
    description: "Electric Bill",
    type: "Bills",
    amount: "-$132.00",
    account: "Citigroup",
  },
]

export function TransactionsTable() {
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
              <TableHead className="text-muted-foreground text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="border-b border-border/50 hover:bg-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 group"
              >
                <TableCell className="text-foreground">
                  {transaction.date}
                </TableCell>
                <TableCell className="text-foreground group-hover:text-cyan-300 transition-colors">
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
                    transaction.amount.startsWith("+")
                      ? "text-theme-green"
                      : "text-theme-red"
                  }`}
                >
                  {transaction.amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
