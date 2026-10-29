import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { DeleteAccountDialog } from '@/features/accounts/DeleteAccountDialog';
import { renderWithProviders } from '../../helpers/render-with-providers';
import { TEST_CHECKING_ACCOUNT, TEST_SAVINGS_ACCOUNT } from '../../fixtures/test-accounts';
import { TEST_TRANSACTIONS } from '../../fixtures/test-transactions';

describe('DeleteAccountDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks deletion and shows warning alert when account has existing transactions', () => {
    const onSwitchToArchive = vi.fn();

    renderWithProviders(
      <DeleteAccountDialog
        account={TEST_CHECKING_ACCOUNT}
        open={true}
        onClose={vi.fn()}
        transactions={TEST_TRANSACTIONS}
        onSwitchToArchive={onSwitchToArchive}
      />,
    );

    // Warning alert is visible
    expect(screen.getByText(/cannot be deleted|has transactions/i)).toBeInTheDocument();

    // Delete button should either not exist or be disabled
    const deleteBtn = screen.queryByRole('button', { name: /^delete account$/i });
    expect(deleteBtn).toBeNull();

    // Archive button should be available
    const archiveBtn = screen.getByRole('button', { name: /archive account/i });
    expect(archiveBtn).toBeInTheDocument();
    fireEvent.click(archiveBtn);
    expect(onSwitchToArchive).toHaveBeenCalledWith(TEST_CHECKING_ACCOUNT);
  });

  it('allows deletion when account has zero transactions', () => {
    const onDeleted = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <DeleteAccountDialog
        account={TEST_SAVINGS_ACCOUNT}
        open={true}
        onClose={onClose}
        transactions={[]} // No transactions for this test
        onDeleted={onDeleted}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /delete permanently/i });
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).not.toBeDisabled();

    fireEvent.click(deleteBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
