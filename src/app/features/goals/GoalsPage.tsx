import { useState } from 'react';
import { useSettings } from '@/state/SettingsContext';
import { useFinance } from '@/state/FinanceContext';
import { type Transaction } from '@/data/transactions';
import { type GoalCategory } from '@/data/goals';
import { BudgetOverview } from './BudgetOverview';
import { GoalsConfigPanel } from './GoalsConfigPanel';

type GoalsPageProps = {
  transactions?: Transaction[];
  onTransactionsChange?: (txs: Transaction[]) => void;
};

export function GoalsPage({ transactions: propTransactions }: GoalsPageProps) {
  const finance = useFinance();
  const transactions = propTransactions ?? finance.transactions;
  const { settings, dispatch } = useSettings();
  const [view, setView] = useState<'overview' | 'config'>('overview');

  function handleUpdateReferenceIncome(income: number) {
    return dispatch({ type: 'goals/updateReferenceIncome', payload: { income } });
  }

  function handleUpdateMode(mode: 'percentage' | 'currency') {
    return dispatch({ type: 'goals/updateMode', payload: { mode } });
  }

  function handleUpdateAllocations(categories: GoalCategory[]) {
    return dispatch({ type: 'goals/updateAllocations', payload: { categories } });
  }

  function handleAddCategory(category: GoalCategory) {
    return dispatch({ type: 'goals/addCategory', payload: { category } });
  }

  function handleUpdateCategory(id: string, changes: Partial<Omit<GoalCategory, 'id'>>) {
    return dispatch({ type: 'goals/updateCategory', payload: { id, changes } });
  }

  function handleDeleteCategory(id: string) {
    return dispatch({ type: 'goals/deleteCategory', payload: { id } });
  }

  function handleResetDefaults() {
    return dispatch({ type: 'goals/resetAllocations' });
  }

  function handleUpdateTypeMappings(mappings: Record<string, string>) {
    return dispatch({ type: 'goals/updateTypeMappings', payload: { mappings } });
  }

  function handleRestoreGoals(snapshot: { categories: GoalCategory[]; typeMappings: Record<string, string> }) {
    return dispatch({ type: 'goals/restore', payload: snapshot });
  }

  return (
    <div>
      {view === 'overview' ? (
        <BudgetOverview
          transactions={transactions}
          goalsConfig={settings.goals}
          onAdjustGoals={() => setView('config')}
        />
      ) : (
        <GoalsConfigPanel
          goalsConfig={settings.goals}
          onUpdateReferenceIncome={handleUpdateReferenceIncome}
          onUpdateMode={handleUpdateMode}
          onUpdateAllocations={handleUpdateAllocations}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onResetDefaults={handleResetDefaults}
          onUpdateTypeMappings={handleUpdateTypeMappings}
          onRestoreGoals={handleRestoreGoals}
          onBackToBudget={() => setView('overview')}
        />
      )}
    </div>
  );
}
