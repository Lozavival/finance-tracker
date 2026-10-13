import { formatFull } from '../../data/dates';
import { type CardStatement, getCardUsage } from '../../data/cardStatements';
import { CreditCard } from 'lucide-react';
import { useSettings } from '../../state/SettingsContext';
import { type AccountConfig } from '../../data/settings';
import { useI18n } from '../../i18n';

type CardBillSummaryProps = {
  accountId: string;
  account?: AccountConfig;
  statements: CardStatement[];
};

export function CardBillSummary({ accountId, account: propAccount, statements }: CardBillSummaryProps) {
  const { settings, findAccount } = useSettings();
  const { t, formatCurrency, locale } = useI18n();
  const account = propAccount ?? findAccount(accountId);
  if (!account?.card) return null; // No card

  const usage = getCardUsage(statements, accountId, settings);
  const stmt =
    statements.find(s => s.accountId === accountId && s.status !== 'paid') ||
    statements.filter(s => s.accountId === accountId).pop();

  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;

  if (!stmt) {
    return (
      <div className="flex items-center justify-between text-sm py-3 border-y border-border/50 mb-4 bg-foreground/5 -mx-6 px-6">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-theme-cyan" />
          <span className="text-foreground">{account.card.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-foreground font-medium">{formatCurrency(0)}</div>
            <div className="text-xs text-muted-foreground">{t('accounts.noOpenBill')}</div>
          </div>
          <div className="w-16">
            <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
              <div className="h-full bg-theme-cyan transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 text-right">
              {t('accounts.limitPct', { pct: String(pct) })}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <span className="text-[10px] px-1 bg-cyan-500/20 text-theme-cyan rounded">{t('accounts.est')}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('accounts.dueOn', { date: formatFull(stmt.dueDate, locale) })}
          </div>
        </div>
        <div className="w-16">
          <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
            <div className="h-full bg-theme-cyan transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 text-right">
            {t('accounts.limitPct', { pct: String(pct) })}
          </div>
        </div>
      </div>
    </div>
  );
}
