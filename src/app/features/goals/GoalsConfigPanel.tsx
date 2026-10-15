import { useState, useMemo } from 'react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { ArrowLeft, Info, Percent, DollarSign } from 'lucide-react';
import { type GoalsConfig, type GoalCategory, DEFAULT_GOAL_CATEGORIES } from '@/data/goals';
import { GoalCategoryDialog } from './GoalCategoryDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { GoalAllocationsDonut } from './GoalAllocationsDonut';
import { GoalCategoryAllocationSliders } from './GoalCategoryAllocationSliders';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useSettings } from '@/state/SettingsContext';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

type GoalsConfigPanelProps = {
  goalsConfig: GoalsConfig;
  onUpdateReferenceIncome: (income: number) => void;
  onUpdateMode: (mode: 'percentage' | 'currency') => void;
  onUpdateAllocations: (categories: GoalCategory[]) => void;
  onAddCategory: (category: GoalCategory) => void;
  onUpdateCategory: (id: string, changes: Partial<Omit<GoalCategory, 'id'>>) => void;
  onDeleteCategory: (id: string) => void;
  onResetDefaults?: () => void;
  onUpdateTypeMappings: (mappings: Record<string, string>) => void;
  onBackToBudget: () => void;
};

export function GoalsConfigPanel({
  goalsConfig,
  onUpdateReferenceIncome,
  onUpdateMode,
  onUpdateAllocations,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onResetDefaults: _onResetDefaults,
  onUpdateTypeMappings,
  onBackToBudget,
}: GoalsConfigPanelProps) {
  const { settings, expenseTypes } = useSettings();
  const { t, formatCurrency, currency, supportedCurrencies } = useI18n();
  const currencySymbol = supportedCurrencies.find(c => c.code === currency)?.symbol || '$';
  const [referenceIncomeInput, setReferenceIncomeInput] = useState<string>(() =>
    String(goalsConfig.referenceMonthlyIncome),
  );

  // Local state for allocations so user can drag sliders and then click "Save Goals"
  const [localCategories, setLocalCategories] = useState<GoalCategory[]>(goalsConfig.categories);

  // Memoize stable expense types list
  const availableExpenseTypes = useMemo(() => {
    return expenseTypes.filter(t => !t.system);
  }, [expenseTypes]);

  // Dialog state for adding/editing categories
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    category: GoalCategory | null;
  }>({
    open: false,
    category: null,
  });

  // Delete category confirmation dialog
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    category: GoalCategory | null;
  }>({
    open: false,
    category: null,
  });

  const numericReferenceIncome = useMemo(() => {
    const parsed = parseFloat(referenceIncomeInput);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [referenceIncomeInput]);

  // Total allocated percentage
  const totalAllocated = useMemo(() => {
    return localCategories.reduce((sum, c) => sum + (c.percentage || 0), 0);
  }, [localCategories]);

  const isCurrencyMode = goalsConfig.mode === 'currency';

  const totalAllocatedDollars = useMemo(() => {
    return (numericReferenceIncome * totalAllocated) / 100;
  }, [numericReferenceIncome, totalAllocated]);

  const isExactly100 = Math.abs(totalAllocated - 100) < 0.05;

  function handleSaveIncome() {
    onUpdateReferenceIncome(numericReferenceIncome);
    toast.success(t('goals.toasts.incomeUpdated'));
  }

  function handleCategorySliderChange(categoryId: string, newPercentage: number) {
    setLocalCategories(prev => prev.map(c => (c.id === categoryId ? { ...c, percentage: newPercentage } : c)));
  }

  function handleCategoryInputChange(categoryId: string, valueStr: string) {
    const val = valueStr === '' ? 0 : parseFloat(valueStr) || 0;
    const clamped = Math.max(0, Math.min(100, val));
    setLocalCategories(prev => prev.map(c => (c.id === categoryId ? { ...c, percentage: clamped } : c)));
  }

  function handleCategoryDollarSliderChange(categoryId: string, dollarVal: number) {
    const computedPct = numericReferenceIncome > 0 ? (dollarVal / numericReferenceIncome) * 100 : 0;
    const clamped = Math.max(0, Math.min(100, Number(computedPct.toFixed(2))));
    setLocalCategories(prev => prev.map(c => (c.id === categoryId ? { ...c, percentage: clamped } : c)));
  }

  function handleCategoryDollarInputChange(categoryId: string, valueStr: string) {
    const val = valueStr === '' ? 0 : parseFloat(valueStr) || 0;
    const computedPct = numericReferenceIncome > 0 ? (val / numericReferenceIncome) * 100 : 0;
    const clamped = Math.max(0, Math.min(100, Number(computedPct.toFixed(2))));
    setLocalCategories(prev => prev.map(c => (c.id === categoryId ? { ...c, percentage: clamped } : c)));
  }

  function handleSaveAllGoals() {
    if (!isExactly100) {
      toast.error(
        t('goals.toasts.allocationMustEqual100', {
          current: totalAllocated.toFixed(1),
        }),
      );
      return;
    }
    onUpdateAllocations(localCategories);
    toast.success(t('goals.toasts.goalsSaved'));
  }

  function handleResetAllocations() {
    setLocalCategories(DEFAULT_GOAL_CATEGORIES);
    toast.info(t('goals.toasts.allocationsReset'));
  }

  return (
    <div className="space-y-8">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={onBackToBudget}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{t('goals.backToBudget')}</span>
          </button>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">{t('goals.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('goals.subtitle')}</p>
        </div>
      </div>

      {/* GOALS TAB CONTENT */}
      <div className="mt-6 space-y-6 focus-visible:outline-none">
        {/* REFERENCE MONTHLY INCOME CARD */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/30 transition-all rounded-2xl shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  {t('goals.referenceIncome')}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-theme-cyan cursor-pointer transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">{t('goals.referenceIncomeTooltip')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-full max-w-sm">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-foreground">
                    {currencySymbol}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={referenceIncomeInput}
                    onChange={e => setReferenceIncomeInput(e.target.value)}
                    placeholder="1000000"
                    className={`h-12 ${currencySymbol.length > 1 ? 'pl-12' : 'pl-8'} text-xl font-bold border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground rounded-xl outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_var(--shadow-glow-cyan)] transition-all`}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">{t('goals.incomeRecalculatedNotice')}</div>
            </div>

            <div className="lg:max-w-md text-xs text-muted-foreground leading-relaxed">
              {t('goals.incomeBaselineNotice')}
            </div>

            <div className="flex-shrink-0">
              <Button
                type="button"
                variant="cyan"
                onClick={handleSaveIncome}
                className="font-semibold px-6 h-11 rounded-xl transition-all"
              >
                {t('goals.saveIncome')}
              </Button>
            </div>
          </div>
        </Card>

        {/* MODE TOGGLE: % Percentage vs $ Value */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-foreground/5 p-1">
            <button
              type="button"
              onClick={() => onUpdateMode('percentage')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                goalsConfig.mode === 'percentage'
                  ? 'bg-cyan-500/20 border border-cyan-400/40 text-theme-cyan shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>{t('goals.modePercentage')}</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateMode('currency')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                goalsConfig.mode === 'currency'
                  ? 'bg-cyan-500/20 border border-cyan-400/40 text-theme-cyan shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{t('goals.modeCurrency', { symbol: currencySymbol })}</span>
            </button>
          </div>
        </div>

        {/* TWO-COLUMN GRID: Allocation Overview vs Budget Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Donut Chart & Reset Defaults */}
          <GoalAllocationsDonut
            categories={localCategories}
            totalAllocated={totalAllocated}
            onResetDefaults={handleResetAllocations}
          />

          {/* RIGHT COLUMN: Controle de Orçamento (Sliders & Inputs) */}
          <Card className="lg:col-span-7 p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/30 transition-all rounded-2xl shadow-sm space-y-6">
            <GoalCategoryAllocationSliders
              categories={localCategories}
              settings={settings}
              typeMappings={goalsConfig.typeMappings}
              isCurrencyMode={isCurrencyMode}
              currencySymbol={currencySymbol}
              numericReferenceIncome={numericReferenceIncome}
              onCategoryPercentChange={handleCategorySliderChange}
              onCategoryPercentInputChange={handleCategoryInputChange}
              onCategoryDollarChange={handleCategoryDollarSliderChange}
              onCategoryDollarInputChange={handleCategoryDollarInputChange}
              onEditCategory={cat => setCategoryModal({ open: true, category: cat })}
              onDeleteCategory={cat => setDeleteModal({ open: true, category: cat })}
              onAddCategoryClick={() => setCategoryModal({ open: true, category: null })}
            />

            {/* Bottom Allocation Status */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {isCurrencyMode ? t('goals.totalAllocated') : t('goals.allocated')}
              </span>
              <div className="text-sm font-bold flex items-center gap-2">
                <span
                  className={
                    isExactly100 ? 'text-theme-green' : totalAllocated < 100 ? 'text-amber-500' : 'text-destructive'
                  }
                >
                  {isCurrencyMode
                    ? `${formatCurrency(totalAllocatedDollars)} / ${formatCurrency(numericReferenceIncome)} (${totalAllocated.toFixed(1)}%)`
                    : `${totalAllocated.toFixed(1)}% / 100%`}
                </span>
                {!isExactly100 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    (
                    {totalAllocated < 100
                      ? isCurrencyMode
                        ? `${formatCurrency(numericReferenceIncome - totalAllocatedDollars)} ${t('goals.unallocated')}`
                        : `${(100 - totalAllocated).toFixed(1)}% ${t('goals.unallocated')}`
                      : isCurrencyMode
                        ? `${formatCurrency(totalAllocatedDollars - numericReferenceIncome)} ${t('goals.over')}`
                        : `${(totalAllocated - 100).toFixed(1)}% ${t('goals.over')}`}
                    )
                  </span>
                )}
              </div>
            </div>

            {/* Allocation Alert Banner if not exactly 100% */}
            {!isExactly100 && (
              <InlineAlert variant="destructive">
                {t('goals.allocationWarning', {
                  current: totalAllocated.toFixed(1),
                  diff:
                    totalAllocated < 100
                      ? `${(100 - totalAllocated).toFixed(1)}% ${t('goals.unallocated')}`
                      : `${(totalAllocated - 100).toFixed(1)}% ${t('goals.over')}`,
                })}
              </InlineAlert>
            )}

            {/* Save Goals Button */}
            <Button
              type="button"
              variant={isExactly100 ? 'cyan' : 'secondary'}
              disabled={!isExactly100}
              onClick={handleSaveAllGoals}
              className={`w-full font-bold h-12 rounded-xl transition-all text-sm ${
                isExactly100 ? 'cursor-pointer' : 'border border-border cursor-not-allowed opacity-50'
              }`}
            >
              {t('goals.saveGoals')}
            </Button>
          </Card>
        </div>
      </div>

      {/* Add / Edit Category Dialog */}
      <GoalCategoryDialog
        open={categoryModal.open}
        onOpenChange={open => setCategoryModal(prev => ({ ...prev, open }))}
        category={categoryModal.category}
        availableTypes={availableExpenseTypes}
        typeMappings={goalsConfig.typeMappings}
        allCategories={goalsConfig.categories}
        onSave={(saved, mappedTypeIds) => {
          if (categoryModal.category) {
            onUpdateCategory(saved.id, {
              name: saved.name,
              percentage: saved.percentage,
              color: saved.color,
              icon: saved.icon,
              description: saved.description,
            });
            // Also update localCategories immediately
            setLocalCategories(prev => prev.map(c => (c.id === saved.id ? saved : c)));
            toast.success(t('goals.toasts.categoryUpdated', { name: saved.name }));
          } else {
            onAddCategory(saved);
            setLocalCategories(prev => [...prev, saved]);
            toast.success(t('goals.toasts.categoryAdded', { name: saved.name }));
          }

          // Update type mappings
          const nextMappings = { ...goalsConfig.typeMappings };
          // Remove any types previously mapped to this category that were unselected
          for (const [tId, cId] of Object.entries(nextMappings)) {
            if (cId === saved.id && !mappedTypeIds.includes(tId)) {
              delete nextMappings[tId];
            }
          }
          // Assign newly selected types to this category
          for (const tId of mappedTypeIds) {
            nextMappings[tId] = saved.id;
          }
          onUpdateTypeMappings(nextMappings);
        }}
      />

      {/* Delete Category Confirmation Dialog */}
      <DeleteCategoryDialog
        open={deleteModal.open}
        onOpenChange={open => setDeleteModal(prev => ({ ...prev, open }))}
        category={deleteModal.category}
        onConfirm={catId => {
          onDeleteCategory(catId);
          setLocalCategories(prev => prev.filter(c => c.id !== catId));
          toast.info(t('goals.toasts.categoryDeleted'));
        }}
      />
    </div>
  );
}
