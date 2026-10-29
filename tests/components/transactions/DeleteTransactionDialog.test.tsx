import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { DeleteTransactionDialog } from '@/components/shared/transaction-dialogs/DeleteTransactionDialog';
import { renderWithProviders } from '../../helpers/render-with-providers';
import type { Transaction } from '@/data/transactions';
import { parseLocalDate } from '@/data/dates';

describe('DeleteTransactionDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseTx: Transaction = {
    id: 'tx-1',
    date: parseLocalDate('2026-03-10'),
    value: 5000,
    currency: 'USD',
    accountId: 'test-checking',
    typeId: 'food-dining',
    paymentMethodId: 'debit',
    direction: 'expense',
    description: 'Groceries',
  };

  it('renders confirmation for single transaction and triggers onConfirm', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    renderWithProviders(<DeleteTransactionDialog target={baseTx} onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    expect(screen.getByText(/groceries/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /delete|exclude|confirm/i });
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('renders radio options for recurring transaction deletion', () => {
    const recurringTx: Transaction = {
      ...baseTx,
      id: 'rec-tx-1',
      recurring: {
        ruleId: 'rule-rent',
      },
    };

    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <DeleteTransactionDialog target={recurringTx} onOpenChange={onOpenChange} onConfirm={onConfirm} />,
    );

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('renders specific notice for transfer transactions', () => {
    const transferTx: Transaction = {
      ...baseTx,
      id: 'tr-tx-1',
      transferId: 'transfer-group-1',
    };

    renderWithProviders(<DeleteTransactionDialog target={transferTx} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByText(/both/i)).toBeInTheDocument();
  });
});
