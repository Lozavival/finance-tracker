import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { GoalCategory } from '@/data/goals';
import type { Settings } from '@/data/settings';
import { COLOR_CONFIG } from '@/data/settings';
import { useI18n } from '@/i18n';

interface GoalCategoryAllocationSlidersProps {
  categories: GoalCategory[];
  settings: Settings;
  typeMappings: Record<string, string>;
  isCurrencyMode: boolean;
  currencySymbol: string;
  numericReferenceIncome: number;
  onCategoryPercentChange: (id: string, percentage: number) => void;
  onCategoryPercentInputChange: (id: string, valueStr: string) => void;
  onCategoryDollarChange: (id: string, dollarVal: number) => void;
  onCategoryDollarInputChange: (id: string, valueStr: string) => void;
  onEditCategory: (category: GoalCategory) => void;
  onDeleteCategory: (category: GoalCategory) => void;
  onAddCategoryClick: () => void;
}

export function GoalCategoryAllocationSliders({
  categories,
  settings,
  typeMappings,
  isCurrencyMode,
  currencySymbol,
  numericReferenceIncome,
  onCategoryPercentChange,
  onCategoryPercentInputChange,
  onCategoryDollarChange,
  onCategoryDollarInputChange,
  onEditCategory,
  onDeleteCategory,
  onAddCategoryClick,
}: GoalCategoryAllocationSlidersProps) {
  const { t, formatCurrency } = useI18n();

  return (
    <>
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <h3 className="text-base font-semibold text-foreground">{t('goals.budgetControls')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t('goals.budgetControlsDesc')}</p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onAddCategoryClick}
          className="bg-theme-cyan/10 border border-theme-cyan/30 hover:bg-theme-cyan/20 text-theme-cyan text-xs gap-1.5 h-9 rounded-lg transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('goals.addCategory')}</span>
        </Button>
      </div>

      {/* Sliders List */}
      <div className="space-y-6">
        {categories.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-border/60 rounded-xl bg-foreground/[0.02]">
            <p className="text-sm text-muted-foreground mb-3">{t('goals.noCategoriesYet')}</p>
            <Button
              type="button"
              size="sm"
              onClick={onAddCategoryClick}
              className="bg-theme-cyan/10 border border-theme-cyan/30 hover:bg-theme-cyan/20 text-theme-cyan text-xs gap-1.5 h-8 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('goals.addCategory')}</span>
            </Button>
          </div>
        ) : (
          categories.map(cat => {
            const c = COLOR_CONFIG[cat.color];
            const monthlyEquivalent = (numericReferenceIncome * (cat.percentage || 0)) / 100;

            const linkedTypes = settings.transactionTypes.filter(
              trType => trType.direction === 'expense' && !trType.system && typeMappings[trType.id] === cat.id,
            );

            const sliderColor = c?.dotColor ?? 'var(--accent-cyan-dot)';
            const maxCurrency = Math.max(numericReferenceIncome, 1);
            const currentCurrency = Math.round(monthlyEquivalent);
            const fillPercent = isCurrencyMode
              ? Math.min(Math.max((currentCurrency / maxCurrency) * 100, 0), 100)
              : Math.min(Math.max(cat.percentage || 0, 0), 100);

            const sliderBackground = `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${fillPercent}%, color-mix(in oklab, var(--foreground) 10%, transparent) ${fillPercent}%, color-mix(in oklab, var(--foreground) 10%, transparent) 100%)`;

            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  {/* Category Name & Actions */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c?.dotColor ?? 'var(--accent-blue-dot)' }}
                    />
                    <span className="font-semibold text-sm text-foreground truncate min-w-0">{cat.name}</span>

                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditCategory(cat)}
                        className="p-1 hover:text-theme-cyan text-muted-foreground rounded transition-colors"
                        title="Edit category"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat)}
                        className="p-1 hover:text-destructive text-muted-foreground rounded transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Input Box: Percentage vs Currency Mode */}
                  {isCurrencyMode ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                      <Input
                        type="number"
                        min={0}
                        max={numericReferenceIncome}
                        step={100}
                        value={currentCurrency}
                        onChange={e => onCategoryDollarInputChange(cat.id, e.target.value)}
                        className="w-24 h-8 text-right text-sm font-semibold border-border bg-foreground/5 text-foreground rounded-lg p-1.5 outline-none focus:border-theme-cyan"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={cat.percentage}
                        onChange={e => onCategoryPercentInputChange(cat.id, e.target.value)}
                        className="w-16 h-8 text-center text-sm font-semibold border-border bg-foreground/5 text-foreground rounded-lg p-1 outline-none focus:border-theme-cyan"
                      />
                      <span className="text-xs text-muted-foreground font-medium">%</span>
                    </div>
                  )}
                </div>

                {/* Custom Slider: Percentage vs Dollar Mode */}
                <div className="py-1">
                  {isCurrencyMode ? (
                    <input
                      type="range"
                      min={0}
                      max={maxCurrency}
                      step={Math.max(50, Math.round(numericReferenceIncome / 200))}
                      value={currentCurrency}
                      onChange={e => onCategoryDollarChange(cat.id, Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--slider-color)]"
                      style={{
                        background: sliderBackground,
                        accentColor: sliderColor,
                        ...({ '--slider-color': sliderColor } as React.CSSProperties),
                      }}
                      aria-label={cat.name}
                    />
                  ) : (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.5}
                      value={cat.percentage}
                      onChange={e => onCategoryPercentChange(cat.id, Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--slider-color)]"
                      style={{
                        background: sliderBackground,
                        accentColor: sliderColor,
                        ...({ '--slider-color': sliderColor } as React.CSSProperties),
                      }}
                      aria-label={cat.name}
                    />
                  )}
                </div>

                {/* Contributing Types & Monthly Equivalent */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-[11px] text-muted-foreground/80 font-medium mr-0.5">{t('goals.types')}</span>
                    {linkedTypes.length > 0 ? (
                      linkedTypes.map(lt => <CategoryChip key={lt.id} typeConfig={lt} size="sm" />)
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60 italic">{t('goals.noneLinked')}</span>
                    )}
                  </div>

                  <div className="text-muted-foreground flex-shrink-0 text-right">
                    {isCurrencyMode ? (
                      <span>{t('goals.approxPercentOfIncome', { percent: cat.percentage.toFixed(1) })}</span>
                    ) : (
                      <span>{t('goals.approxPerMonth', { amount: formatCurrency(monthlyEquivalent) })}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
