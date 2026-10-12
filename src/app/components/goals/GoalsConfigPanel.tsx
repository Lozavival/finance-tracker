import { useState, useMemo, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Info, RotateCcw, Plus, Pencil, Trash2, Percent, DollarSign, AlertTriangle } from 'lucide-react';
import { type GoalsConfig, type GoalCategory, DEFAULT_GOAL_CATEGORIES } from '../../data/goals';
import { COLOR_CONFIG } from '../../data/settings';
import { formatCurrency } from '../../data/transactions';
import { GoalCategoryDialog } from './GoalCategoryDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { CategoryChip } from '../shared/CategoryChip';
import { useSettings } from '../../state/SettingsContext';
import { toast } from 'sonner';

type GoalsConfigPanelProps = {
  goalsConfig: GoalsConfig;
  onUpdateReferenceIncome: (income: number) => void;
  onUpdateMode: (mode: 'percentage' | 'currency') => void;
  onUpdateAllocations: (categories: GoalCategory[]) => void;
  onAddCategory: (category: GoalCategory) => void;
  onUpdateCategory: (id: string, changes: Partial<Omit<GoalCategory, 'id'>>) => void;
  onDeleteCategory: (id: string) => void;
  onResetDefaults: () => void;
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
  onResetDefaults,
  onUpdateTypeMappings,
  onBackToBudget,
}: GoalsConfigPanelProps) {
  const { settings, expenseTypes } = useSettings();
  const [referenceIncomeInput, setReferenceIncomeInput] = useState<string>(() =>
    String(goalsConfig.referenceMonthlyIncome),
  );

  // Local state for allocations so user can drag sliders and then click "Save Goals"
  const [localCategories, setLocalCategories] = useState<GoalCategory[]>(goalsConfig.categories);

  // Sync if external categories change
  useEffect(() => {
    setLocalCategories(goalsConfig.categories);
  }, [goalsConfig.categories]);

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

  // Donut chart data
  const pieData = useMemo(() => {
    return localCategories.map(c => ({
      name: c.name,
      value: c.percentage,
      color: COLOR_CONFIG[c.color]?.rawHex || '#3b82f6',
    }));
  }, [localCategories]);

  function handleSaveIncome() {
    onUpdateReferenceIncome(numericReferenceIncome);
    toast.success('Monthly reference income updated successfully');
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
      toast.error(`Total allocation must equal 100% to save changes (currently ${totalAllocated.toFixed(1)}%).`);
      return;
    }
    onUpdateAllocations(localCategories);
    toast.success('Financial goals and budget distribution saved');
  }

  function handleResetAllocations() {
    setLocalCategories(DEFAULT_GOAL_CATEGORIES);
    onResetDefaults();
    toast.info('Goal allocations reset to default 6-bucket distribution');
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
            <span>Back to Budget</span>
          </button>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">Allocate your budget across your goals.</p>
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
                  Monthly Reference Income
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-theme-cyan cursor-pointer transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      This baseline amount serves as the reference benchmark to calculate monthly goal targets.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-full max-w-sm">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={referenceIncomeInput}
                    onChange={e => setReferenceIncomeInput(e.target.value)}
                    placeholder="1000000"
                    className="h-12 pl-8 text-xl font-bold border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground rounded-xl outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_var(--shadow-glow-cyan)] transition-all"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                When saved, budget target dollar amounts are recalculated.
              </div>
            </div>

            <div className="lg:max-w-md text-xs text-muted-foreground leading-relaxed">
              Use this value as a baseline to plan and distribute your financial goals. It does not represent real
              incoming transactions and does not generate ledger entries.
            </div>

            <div className="flex-shrink-0">
              <Button
                type="button"
                onClick={handleSaveIncome}
                className="bg-theme-cyan-btn hover:bg-theme-cyan-btn-hover text-white dark:text-gray-950 font-semibold shadow-lg shadow-cyan-500/20 px-6 h-11 rounded-xl transition-all"
              >
                Save Income
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
              <span>Percentage</span>
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
              <span>Value ($)</span>
            </button>
          </div>
        </div>

        {/* TWO-COLUMN GRID: Allocation Overview vs Budget Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Visualização de uso (Donut Chart) */}
          <Card className="lg:col-span-5 p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/30 transition-all rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Allocation Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visual distribution of your budget across active categories
              </p>

              {/* Donut Chart */}
              <div className="relative h-64 w-full my-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={600}
                    >
                      {localCategories.map(cat => {
                        const c = COLOR_CONFIG[cat.color];
                        return <Cell key={cat.id} fill={c?.dotColor || '#3b82f6'} />;
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Centered Total Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-foreground tracking-tight">
                    {totalAllocated.toFixed(0)}%
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Total</span>
                </div>
              </div>

              {/* 2-Column Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-4 border-t border-border/60">
                {localCategories.map(cat => {
                  const c = COLOR_CONFIG[cat.color];
                  return (
                    <div key={cat.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 mr-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c?.dotColor || '#3b82f6' }}
                        />
                        <span className="text-muted-foreground truncate">{cat.name}</span>
                      </div>
                      <span className="font-semibold text-foreground flex-shrink-0">{cat.percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reset Defaults Button */}
            <div className="pt-6 mt-6 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetAllocations}
                className="w-full justify-center gap-2 h-11 border-border bg-foreground/[0.02] text-foreground hover:border-cyan-400/50 hover:text-theme-cyan hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] rounded-xl transition-all"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                <span>Reset Defaults</span>
              </Button>
            </div>
          </Card>

          {/* RIGHT COLUMN: Controle de Orçamento (Sliders & Inputs) */}
          <Card className="lg:col-span-7 p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/30 transition-all rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <h3 className="text-base font-semibold text-foreground">Budget Controls</h3>
                <p className="text-xs text-muted-foreground mt-0.5">% of reference income — value is recalculated</p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => setCategoryModal({ open: true, category: null })}
                className="bg-cyan-500/10 border border-cyan-400/30 hover:bg-cyan-500/20 text-theme-cyan text-xs gap-1.5 h-9 rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </Button>
            </div>

            {/* Sliders List */}
            <div className="space-y-6">
              {localCategories.map(cat => {
                const c = COLOR_CONFIG[cat.color];
                const monthlyEquivalent = (numericReferenceIncome * (cat.percentage || 0)) / 100;

                const linkedTypes = settings.transactionTypes.filter(
                  t => t.direction === 'expense' && !t.system && goalsConfig.typeMappings[t.id] === cat.id,
                );

                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      {/* Category Name & Actions */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c?.dotColor || '#3b82f6' }}
                        />
                        <span className="font-semibold text-sm text-foreground truncate">{cat.name}</span>

                        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setCategoryModal({ open: true, category: cat })}
                            className="p-1 hover:text-theme-cyan text-muted-foreground rounded transition-colors"
                            title="Edit category"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModal({ open: true, category: cat })}
                            className="p-1 hover:text-destructive text-muted-foreground rounded transition-colors"
                            title="Delete category"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Input Box: Percentage vs Currency Mode */}
                      {isCurrencyMode ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground font-semibold">$</span>
                          <Input
                            type="number"
                            min={0}
                            max={numericReferenceIncome}
                            step={100}
                            value={Math.round(monthlyEquivalent)}
                            onChange={e => handleCategoryDollarInputChange(cat.id, e.target.value)}
                            className="w-24 h-8 text-right text-sm font-semibold border-border bg-foreground/5 text-foreground rounded-lg p-1.5 outline-none focus:border-cyan-400"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={cat.percentage}
                            onChange={e => handleCategoryInputChange(cat.id, e.target.value)}
                            className="w-16 h-8 text-center text-sm font-semibold border-border bg-foreground/5 text-foreground rounded-lg p-1 outline-none focus:border-cyan-400"
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
                          max={Math.max(numericReferenceIncome, 1)}
                          step={Math.max(50, Math.round(numericReferenceIncome / 200))}
                          value={Math.round(monthlyEquivalent)}
                          onChange={e => handleCategoryDollarSliderChange(cat.id, Number(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-foreground/10"
                          style={{
                            accentColor: c?.dotColor || '#06b6d4',
                          }}
                        />
                      ) : (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={cat.percentage}
                          onChange={e => handleCategorySliderChange(cat.id, Number(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-foreground/10"
                          style={{
                            accentColor: c?.dotColor || '#06b6d4',
                          }}
                        />
                      )}
                    </div>

                    {/* Contributing Types & Monthly Equivalent */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="text-[11px] text-muted-foreground/80 font-medium mr-0.5">Types:</span>
                        {linkedTypes.length > 0 ? (
                          linkedTypes.map(lt => <CategoryChip key={lt.id} typeConfig={lt} size="sm" />)
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic">None linked</span>
                        )}
                      </div>

                      <div className="text-muted-foreground flex-shrink-0 text-right">
                        {isCurrencyMode ? (
                          <span>≈ {cat.percentage.toFixed(1)}% of income</span>
                        ) : (
                          <span>≈ {formatCurrency(monthlyEquivalent)} / mo</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Allocation Status */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {isCurrencyMode ? 'Total Allocated' : 'Allocated'}
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
                        ? `${formatCurrency(numericReferenceIncome - totalAllocatedDollars)} unallocated`
                        : `${(100 - totalAllocated).toFixed(1)}% unallocated`
                      : isCurrencyMode
                        ? `${formatCurrency(totalAllocatedDollars - numericReferenceIncome)} over`
                        : `${(totalAllocated - 100).toFixed(1)}% over`}
                    )
                  </span>
                )}
              </div>
            </div>

            {/* Allocation Alert Banner if not exactly 100% */}
            {!isExactly100 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Total allocation must equal 100% before saving. Currently at {totalAllocated.toFixed(1)}% (
                  {totalAllocated < 100
                    ? `${(100 - totalAllocated).toFixed(1)}% unallocated`
                    : `${(totalAllocated - 100).toFixed(1)}% over`}
                  ).
                </span>
              </div>
            )}

            {/* Save Goals Button */}
            <Button
              type="button"
              disabled={!isExactly100}
              onClick={handleSaveAllGoals}
              className={`w-full font-bold h-12 rounded-xl transition-all text-sm ${
                isExactly100
                  ? 'bg-theme-cyan-btn hover:bg-theme-cyan-btn-hover text-white dark:text-gray-950 shadow-lg shadow-cyan-500/20 cursor-pointer'
                  : 'bg-foreground/10 text-muted-foreground border border-border cursor-not-allowed opacity-50'
              }`}
            >
              Save Goals
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
            toast.success(`Category "${saved.name}" updated`);
          } else {
            onAddCategory(saved);
            setLocalCategories(prev => [...prev, saved]);
            toast.success(`Category "${saved.name}" added`);
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
          toast.info('Category deleted');
        }}
      />
    </div>
  );
}
