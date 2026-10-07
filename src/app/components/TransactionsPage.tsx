import { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { TransactionDialog } from "./TransactionDialog";
import { TransactionsMonthTable } from "./transactions/TransactionsMonthTable";
import { PeriodFilter } from "./transactions/PeriodFilter";
import { TypeFilter } from "./transactions/TypeFilter";
import { DirectionFilter } from "./transactions/DirectionFilter";
import {
  createTransactionId,
  formatTransactionDate,
  resolvePeriodRange,
  sortTransactionsDescending,
  type PeriodFilter as PeriodFilterType,
  type Transaction,
  type TransactionDirection,
  type TransactionType,
} from "../data/transactions";

type TransactionsPageProps = {
  transactions: Transaction[];
  defaultMonth: { from: Date; to: Date };
  onTransactionsChange: (transactions: Transaction[]) => void;
};

export function TransactionsPage({
  transactions,
  defaultMonth,
  onTransactionsChange,
}: TransactionsPageProps) {
  const [period, setPeriod] = useState<PeriodFilterType>({ kind: "all" });
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [direction, setDirection] = useState<"all" | TransactionDirection>("all");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const visibleTransactions = useMemo(() => {
    const periodRange = resolvePeriodRange(period);
    
    const filtered = transactions.filter((transaction) => {
      if (periodRange) {
        if (transaction.date < periodRange.from || transaction.date > periodRange.to) {
          return false;
        }
      }
      if (selectedTypes.length > 0 && !selectedTypes.includes(transaction.type)) {
        return false;
      }
      if (direction !== "all" && transaction.direction !== direction) {
        return false;
      }
      return true;
    });
    
    return sortTransactionsDescending(filtered);
  }, [period, selectedTypes, direction, transactions]);

  const filtersActive = period.kind !== "all" || selectedTypes.length > 0 || direction !== "all";

  function resetFilters() {
    setPeriod({ kind: "all" });
    setSelectedTypes([]);
    setDirection("all");
  }

  function openAddDialog() {
    setEditingTransaction(null);
    setDialogOpen(true);
  }

  function openEditDialog(transaction: Transaction) {
    setEditingTransaction(transaction);
    setDialogOpen(true);
  }

  function saveTransaction(input: Omit<Transaction, "id">) {
    if (editingTransaction) {
      onTransactionsChange(
        transactions.map((transaction) =>
          transaction.id === editingTransaction.id
            ? { ...input, id: editingTransaction.id }
            : transaction,
        ),
      );
    } else {
      onTransactionsChange([
        ...transactions,
        { ...input, id: createTransactionId() },
      ]);
    }
    setDialogOpen(false);
    setEditingTransaction(null);
  }

  function deleteTransaction() {
    if (!deleteTarget) return;
    onTransactionsChange(
      transactions.filter(
        (transaction) => transaction.id !== deleteTarget.id,
      ),
    );
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
            Transaction History
          </div>
          <div className="text-muted-foreground">
            Review, filter, and manage your financial activity.
          </div>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover shadow-lg shadow-cyan-500/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add transaction
        </Button>
      </div>

      <Card className="gap-0 backdrop-blur-xl overflow-hidden">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
            <TypeFilter value={selectedTypes} onChange={setSelectedTypes} />
            <DirectionFilter value={direction} onChange={setDirection} />
            
            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-theme-cyan hover:bg-cyan-500/10 hover:text-theme-cyan"
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Clear filters
              </Button>
            )}

            <div className="text-muted-foreground text-sm mt-1">
              {visibleTransactions.length}{" "}
              {visibleTransactions.length === 1 ? "transaction" : "transactions"}
            </div>
          </div>
        </div>
        
        <TransactionsMonthTable 
          transactions={visibleTransactions} 
          onEdit={openEditDialog}
          onDelete={setDeleteTarget}
        />

        {visibleTransactions.length === 0 && (
          <div className="min-h-64 border-t border-border/50 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-foreground mb-1">No transactions found</div>
            <div className="text-muted-foreground text-sm mb-5">
              Try a different period or transaction type.
            </div>
            {filtersActive && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        )}
      </Card>

      <TransactionDialog
        open={dialogOpen}
        transaction={editingTransaction}
        defaultDate={defaultMonth.to}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        onSave={saveTransaction}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="bg-popover border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Exclude transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteTarget
                ? `${deleteTarget.description} from ${formatTransactionDate(deleteTarget.date)} will be removed.`
                : "This transaction will be removed for this session."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTransaction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Exclude transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
