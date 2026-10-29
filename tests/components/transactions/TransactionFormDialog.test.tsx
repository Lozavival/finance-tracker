import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionFormDialog } from '@/components/shared/transaction-dialogs/TransactionFormDialog';
import { renderWithProviders } from '../../helpers/render-with-providers';
import { parseLocalDate } from '@/data/dates';
import { createTestSettings } from '../../fixtures/test-workspace';

describe('TransactionFormDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultDate = parseLocalDate('2026-03-15');
  const initialSettings = createTestSettings();

  it('renders modal in add mode with default fields', () => {
    renderWithProviders(
      <TransactionFormDialog
        open={true}
        editing={null}
        defaultDate={defaultDate}
        defaultAccount="test-checking"
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
      { initialSettings },
    );

    expect(screen.getByRole('heading', { name: /add transaction/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('validates required fields before submitting', () => {
    const onSave = vi.fn();

    renderWithProviders(
      <TransactionFormDialog
        open={true}
        editing={null}
        defaultDate={defaultDate}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
      { initialSettings },
    );

    // Try submitting without description or amount
    const submitBtn = screen.getByRole('button', { name: /^add transaction$/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('fills fields and submits single transaction draft', async () => {
    const onSave = vi.fn();

    renderWithProviders(
      <TransactionFormDialog
        open={true}
        editing={null}
        defaultDate={defaultDate}
        defaultAccount="test-checking"
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
      { initialSettings },
    );

    // Give asynchronous workspace hydrate 150ms to settle
    await new Promise(resolve => setTimeout(resolve, 150));

    const descInput = document.getElementById('transaction-description') as HTMLInputElement;
    fireEvent.change(descInput, { target: { value: 'Coffee and Pastry' } });

    const valueInput = document.getElementById('transaction-value') as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: '12.50' } });

    const submitBtn = screen.getByRole('button', { name: /^add transaction$/i });
    const form = submitBtn.closest('form')!;
    expect(form).toBeInTheDocument();
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledTimes(1);
    const draft = onSave.mock.calls[0][0];
    expect(draft.kind).toBe('single');
    expect(draft.transaction.description).toBe('Coffee and Pastry');
    expect(draft.transaction.value).toBe(1250);
  });
});
