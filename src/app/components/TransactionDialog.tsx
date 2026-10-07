import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarIcon,
  Check,
  Plus,
} from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import {
  ACCOUNTS,
  EXPENSE_TYPES,
  INCOME_TYPES,
  formatTransactionDate,
  parseTransactionDate,
  toTransactionDate,
  type Account,
  type Transaction,
  type TransactionDirection,
  type TransactionType,
} from "../data/transactions";

type TransactionDialogProps = {
  open: boolean;
  transaction: Transaction | null;
  defaultDate: Date;
  onOpenChange: (open: boolean) => void;
  onSave: (transaction: Omit<Transaction, "id">) => void;
};

type FormErrors = Partial<
  Record<"description" | "value" | "date", string>
>;

export function TransactionDialog({
  open,
  transaction,
  defaultDate,
  onOpenChange,
  onSave,
}: TransactionDialogProps) {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [direction, setDirection] =
    useState<TransactionDirection>("expense");
  const [type, setType] = useState<TransactionType>("Shopping");
  const [account, setAccount] = useState<Account>("Bank of America");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;
    setDescription(transaction?.description ?? "");
    setValue(transaction ? String(transaction.value) : "");
    setDate(
      transaction ? parseTransactionDate(transaction.date) : defaultDate,
    );
    setDirection(transaction?.direction ?? "expense");
    setType(transaction?.type ?? "Shopping");
    setAccount(transaction?.account ?? "Bank of America");
    setErrors({});
  }, [defaultDate, open, transaction]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    const normalizedDescription = description.trim();
    const normalizedValue = Number(value);

    if (!normalizedDescription) {
      nextErrors.description = "Enter a description.";
    }
    if (!value || !Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      nextErrors.value = "Enter a value greater than zero.";
    }
    if (!date) {
      nextErrors.date = "Choose a transaction date.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !date) return;

    onSave({
      description: normalizedDescription,
      value: normalizedValue,
      date: toTransactionDate(date),
      direction,
      type,
      account,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border p-6 pr-14">
            <DialogTitle>
              {transaction ? "Edit transaction" : "Add transaction"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {transaction
                ? "Update the details for this transaction."
                : "Record income or an expense."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Transaction direction
              </Label>
              <ToggleGroup
                type="single"
                value={direction}
                onValueChange={(nextDirection) => {
                  if (nextDirection) {
                    const newDir = nextDirection as TransactionDirection;
                    setDirection(newDir);
                    if (newDir === "income" && !INCOME_TYPES.includes(type as any)) {
                      setType(INCOME_TYPES[0]);
                    } else if (newDir === "expense" && !EXPENSE_TYPES.includes(type as any)) {
                      setType(EXPENSE_TYPES[0]);
                    }
                  }
                }}
                aria-label="Transaction direction"
                className="w-full rounded-xl border border-border bg-muted/40 p-1"
              >
                <ToggleGroupItem
                  value="income"
                  aria-label="Income"
                  className="h-11 rounded-lg text-muted-foreground transition-all data-[state=on]:bg-background data-[state=on]:text-emerald-400 data-[state=on]:shadow-sm"
                >
                  <ArrowDownLeft />
                  Income
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="expense"
                  aria-label="Expense"
                  className="h-11 rounded-lg text-muted-foreground transition-all data-[state=on]:bg-background data-[state=on]:text-red-400 data-[state=on]:shadow-sm"
                >
                  <ArrowUpRight />
                  Expense
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label
                  htmlFor="transaction-description"
                  className="text-foreground"
                >
                  Description
                </Label>
                <Input
                  id="transaction-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Grocery store"
                  aria-invalid={Boolean(errors.description)}
                  className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                />
                {errors.description && (
                  <div className="text-red-400 text-sm">
                    {errors.description}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      aria-invalid={Boolean(errors.date)}
                      className="h-11 w-full justify-start border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
                    >
                      <CalendarIcon />
                      {date
                        ? formatTransactionDate(toTransactionDate(date))
                        : "Choose date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-auto border-border bg-popover p-0 text-foreground"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && (
                  <div className="text-red-400 text-sm">{errors.date}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-value" className="text-foreground">
                  Value
                </Label>
                <Input
                  id="transaction-value"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="0.00"
                  aria-invalid={Boolean(errors.value)}
                  className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                />
                {errors.value && (
                  <div className="text-red-400 text-sm">{errors.value}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Type</Label>
                <Select
                  value={type}
                  onValueChange={(nextType) =>
                    setType(nextType as TransactionType)
                  }
                >
                  <SelectTrigger className="h-11 border-border bg-foreground/5 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-foreground">
                    {(direction === "income" ? INCOME_TYPES : EXPENSE_TYPES).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Account</Label>
                <Select
                  value={account}
                  onValueChange={(nextAccount) => setAccount(nextAccount as Account)}
                >
                  <SelectTrigger className="h-11 border-border bg-foreground/5 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-foreground">
                    {ACCOUNTS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border p-6 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover shadow-lg shadow-cyan-500/20"
            >
              {transaction ? <Check /> : <Plus />}
              {transaction ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
