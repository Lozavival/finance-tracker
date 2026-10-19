import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/primitives/dialog';
import { Button } from '@/components/primitives/button';
import { type Transaction } from '@/data/transactions';
import { type GoalCategory } from '@/data/goals';
import { formatRowDate } from '@/data/dates';
import { COLOR_CONFIG } from '@/data/settings';
import { getIcon } from '@/data/icons';
import { ArrowUpRight } from 'lucide-react';
import { useI18n } from '@/i18n';

type CategoryTransactionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: GoalCategory | null;
  transactions: Transaction[];
  monthLabel: string;
};

export function CategoryTransactionsDialog({
  open,
  onOpenChange,
  category,
  transactions,
  monthLabel,
}: CategoryTransactionsDialogProps) {
  const { t, formatCents, locale } = useI18n();
  if (!category) return null;

  const colorConfig = COLOR_CONFIG[category.color] ?? COLOR_CONFIG.blue;
  const CategoryIcon = getIcon(category.icon);
  const totalSpent = transactions.reduce((acc, tr) => acc + tr.value, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 bg-popover border-border">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ backgroundColor: colorConfig.badgeBg, color: colorConfig.textColor }}
            >
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl text-foreground flex items-center gap-2">
                <span>{category.name}</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-foreground/10 text-muted-foreground">
                  {transactions.length === 1
                    ? t('common.singleTransaction')
                    : t('common.transactionsCount', { count: String(transactions.length) })}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t('goals.transactionsForMonth', { month: monthLabel, amount: formatCents(totalSpent) })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {t('goals.noTransactionsRecorded', { month: monthLabel })}
            </div>
          ) : (
            transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-foreground/5 hover:bg-foreground/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                    <ArrowUpRight className="w-4 h-4 text-theme-red" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{tx.description}</div>
                    <div className="text-xs text-muted-foreground">{formatRowDate(tx.date, locale)}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground flex-shrink-0 ml-4">
                  {formatCents(tx.value, tx.currency)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
