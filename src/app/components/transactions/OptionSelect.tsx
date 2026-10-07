import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type OptionSelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  error?: string;
};

export function OptionSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: OptionSelectProps<T>) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger
          aria-invalid={Boolean(error)}
          className="h-11 border-border bg-foreground/5 text-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border bg-popover text-foreground">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <div className="text-red-400 text-sm">{error}</div>}
    </div>
  );
}

