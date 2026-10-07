import React from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { MAX_INSTALLMENTS, splitInstallmentValues } from "../../data/installments";
import { formatCurrency } from "../../data/transactions";

type InstallmentsFieldProps = {
  value: number | "";
  onChange: (value: number | "") => void;
  totalValue: number;
  error?: string;
};

export function InstallmentsField({
  value,
  onChange,
  totalValue,
  error,
}: InstallmentsFieldProps) {
  const numericValue = typeof value === "number" ? value : 1;
  const parts = splitInstallmentValues(totalValue || 0, numericValue);
  const first = parts[0] || 0;
  const rest = parts[1] || 0;

  const preview =
    numericValue <= 1
      ? null
      : first === rest
      ? `${numericValue} × ${formatCurrency(first)}`
      : `1 × ${formatCurrency(first)} + ${numericValue - 1} × ${formatCurrency(rest)}`;

  return (
    <div className="space-y-2">
      <Label htmlFor="transaction-installments" className="text-foreground">
        Installments
      </Label>
      <Input
        id="transaction-installments"
        type="number"
        min={1}
        max={MAX_INSTALLMENTS}
        step={1}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange("");
            return;
          }
          const val = parseInt(raw, 10);
          if (!isNaN(val)) onChange(val);
        }}
        aria-invalid={Boolean(error)}
        className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
      />
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {preview && !error && (
        <div className="text-muted-foreground text-sm">{preview}</div>
      )}
    </div>
  );
}

