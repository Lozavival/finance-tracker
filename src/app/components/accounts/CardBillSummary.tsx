import { formatFull } from '../../data/dates';
import { type CardStatement, getCardUsage } from '../../data/cardStatements';
import { type Account } from '../../data/transactions';
import { formatCurrency } from '../../data/transactions';
import { CreditCard } from 'lucide-react';

export function CardBillSummary({ account, statements }: { account: Account; statements: CardStatement[] }) {
  const usage = getCardUsage(statements, account);
  if (usage.limit === 0) return null; // No card

  const stmt =
    statements.find(s => s.account === account && s.status !== 'paid') ||
    statements.filter(s => s.account === account).pop();
  if (!stmt) return null;

  const pct = Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <div className="flex items-center justify-between text-sm py-3 border-y border-border/50 mb-4 bg-foreground/5 -mx-6 px-6">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-theme-cyan" />
        <span className="text-foreground">{stmt.cardName}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-foreground font-medium flex items-center gap-2">
            {formatCurrency(stmt.total / 100)}
            {stmt.status === 'open' && (
              <span className="text-[10px] px-1 bg-cyan-500/20 text-theme-cyan rounded">est.</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">due {formatFull(stmt.dueDate)}</div>
        </div>
        <div className="w-16">
          <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
            <div className="h-full bg-theme-cyan transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 text-right">{pct}% limit</div>
        </div>
      </div>
    </div>
  );
}
