import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const transactions = [
  {
    id: 1,
    date: "Nov 5, 2025",
    description: "Amazon Purchase",
    type: "Shopping",
    amount: "-$124.99",
    status: "success",
  },
  {
    id: 2,
    date: "Nov 4, 2025",
    description: "Salary Deposit",
    type: "Income",
    amount: "+$5,200.00",
    status: "success",
  },
  {
    id: 3,
    date: "Nov 3, 2025",
    description: "Netflix Subscription",
    type: "Entertainment",
    amount: "-$15.99",
    status: "pending",
  },
  {
    id: 4,
    date: "Nov 2, 2025",
    description: "Uber Ride",
    type: "Transportation",
    amount: "-$28.50",
    status: "success",
  },
  {
    id: 5,
    date: "Nov 1, 2025",
    description: "Refund - Returns",
    type: "Refund",
    amount: "+$89.99",
    status: "success",
  },
  {
    id: 6,
    date: "Oct 31, 2025",
    description: "International Transfer",
    type: "Transfer",
    amount: "-$1,500.00",
    status: "failed",
  },
  {
    id: 7,
    date: "Oct 30, 2025",
    description: "Starbucks Coffee",
    type: "Food & Dining",
    amount: "-$6.75",
    status: "success",
  },
  {
    id: 8,
    date: "Oct 29, 2025",
    description: "Electric Bill",
    type: "Bills",
    amount: "-$132.00",
    status: "pending",
  },
];

export function TransactionsTable() {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      success: {
        variant: "default" as const,
        className: "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]",
        text: "Success",
      },
      pending: {
        variant: "default" as const,
        className: "bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
        text: "Pending",
      },
      failed: {
        variant: "default" as const,
        className: "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]",
        text: "Failed",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  return (
    <Card className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 hover:shadow-[0_0_25px_rgba(34,211,238,0.1)] transition-all duration-300">
      <h3 className="text-white text-lg mb-4">Recent Transactions</h3>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Description</TableHead>
              <TableHead className="text-gray-400">Type</TableHead>
              <TableHead className="text-gray-400 text-right">Amount</TableHead>
              <TableHead className="text-gray-400 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="border-b border-white/5 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all duration-300 group"
              >
                <TableCell className="text-gray-300">{transaction.date}</TableCell>
                <TableCell className="text-white group-hover:text-cyan-300 transition-colors">
                  {transaction.description}
                </TableCell>
                <TableCell className="text-gray-400">{transaction.type}</TableCell>
                <TableCell
                  className={`text-right ${
                    transaction.amount.startsWith("+") ? "text-green-400" : "text-gray-300"
                  }`}
                >
                  {transaction.amount}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(transaction.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
