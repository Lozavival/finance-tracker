import React from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  formatRowDate,
  formatSignedValue,
  groupTransactionsByMonth,
  Transaction,
} from "../../data/transactions";

type TransactionsMonthTableProps = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function TransactionsMonthTable({
  transactions,
  onEdit,
  onDelete,
}: TransactionsMonthTableProps) {
  const groups = groupTransactionsByMonth(transactions);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground">Description</TableHead>
            <TableHead className="text-muted-foreground">Type</TableHead>
            <TableHead className="text-muted-foreground">Account</TableHead>
            <TableHead className="text-muted-foreground text-right">Value</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <React.Fragment key={group.key}>
              <TableRow className="bg-foreground/5 hover:bg-foreground/5">
                <TableCell
                  colSpan={6}
                  className="text-xs uppercase tracking-wider text-muted-foreground font-medium"
                >
                  {group.label}
                </TableCell>
              </TableRow>
              {group.transactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  className="border-border/50 hover:bg-cyan-500/10 transition-colors group"
                >
                  <TableCell className="text-foreground whitespace-nowrap">
                    {formatRowDate(transaction.date)}
                  </TableCell>
                  <TableCell className="text-foreground group-hover:text-theme-cyan transition-colors">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {transaction.type}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {transaction.account}
                  </TableCell>
                  <TableCell
                    className={`text-right whitespace-nowrap ${
                      transaction.direction === "income"
                        ? "text-theme-green"
                        : "text-theme-red"
                    }`}
                  >
                    {formatSignedValue(transaction)}
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
                      <DropdownMenuContent
                        align="end"
                        className="bg-popover border-border text-foreground"
                      >
                        <DropdownMenuItem
                          onSelect={() => onEdit(transaction)}
                          className="focus:bg-cyan-500/20 focus:text-theme-cyan cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => onDelete(transaction)}
                          className="cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Exclude
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

