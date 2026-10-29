import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { GoalCategoryDialog } from '@/features/goals/GoalCategoryDialog';
import { renderWithProviders } from '../../helpers/render-with-providers';
import type { GoalCategory } from '@/data/goals';
import type { TransactionTypeConfig } from '@/data/settings';

describe('GoalCategoryDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const availableTypes: TransactionTypeConfig[] = [
    {
      id: 'food-dining',
      name: 'Food & Dining',
      direction: 'expense',
      color: 'blue',
      icon: 'Utensils',
    },
    {
      id: 'shopping',
      name: 'Shopping',
      direction: 'expense',
      color: 'cyan',
      icon: 'ShoppingBag',
    },
  ];

  const testCategory: GoalCategory = {
    id: 'cat-essentials',
    name: 'Essentials',
    percentage: 50,
    color: 'emerald',
    icon: 'Shield',
    description: 'Basic living expenses',
  };

  it('renders modal in edit mode with pre-filled category values', () => {
    renderWithProviders(
      <GoalCategoryDialog
        open={true}
        onOpenChange={vi.fn()}
        category={testCategory}
        availableTypes={availableTypes}
        typeMappings={{ 'food-dining': 'cat-essentials' }}
        allCategories={[testCategory]}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Essentials')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('validates that category name is required before submission', () => {
    const onSave = vi.fn();

    renderWithProviders(
      <GoalCategoryDialog
        open={true}
        onOpenChange={vi.fn()}
        category={null} // Add mode
        availableTypes={availableTypes}
        typeMappings={{}}
        allCategories={[]}
        onSave={onSave}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /save|create|add/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits updated category and mapped types', () => {
    const onSave = vi.fn();

    renderWithProviders(
      <GoalCategoryDialog
        open={true}
        onOpenChange={vi.fn()}
        category={testCategory}
        availableTypes={availableTypes}
        typeMappings={{ 'food-dining': 'cat-essentials' }}
        allCategories={[testCategory]}
        onSave={onSave}
      />,
    );

    const nameInput = screen.getByDisplayValue('Essentials');
    fireEvent.change(nameInput, { target: { value: 'Fixed Essentials' } });

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledTimes(1);
    const [savedCategory, mappedTypes] = onSave.mock.calls[0];
    expect(savedCategory.name).toBe('Fixed Essentials');
    expect(mappedTypes).toContain('food-dining');
  });
});

