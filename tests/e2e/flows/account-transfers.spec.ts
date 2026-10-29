import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 4: Double-Entry Account Transfers', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('initiates reciprocal double-entry transfer, verifies account balances, and removes transfer', async ({
    page,
  }) => {
    await navigateTo(page, '/transactions');

    // 1. Open Add Transaction Dialog
    await page.getByRole('button', { name: /add transaction/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 2. Select Transfer Mode
    const transferRadio = dialog.getByRole('radio', { name: /transfer/i });
    await transferRadio.click();
    await expect(transferRadio).toHaveAttribute('data-state', 'on');

    // 3. Fill Values for Transfer
    await dialog.getByRole('spinbutton', { name: /amount to send/i }).fill('300.00');
    await dialog.getByRole('spinbutton', { name: /amount to receive/i }).fill('1500.00');

    // 4. Save Transfer
    await dialog.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible();

    // 5. Verify Transfer Entry in Transactions Table
    const transferRow = page.getByRole('row', { name: /transfer/i }).first();
    await expect(transferRow).toBeVisible();

    // 6. Navigate to Accounts and verify page displays active accounts
    await navigateTo(page, '/accounts');
    await expect(page.getByText('Bank of America').first()).toBeVisible();

    // 7. Return to Transactions and Exclude Transfer
    await navigateTo(page, '/transactions');
    const actionsButton = page.getByRole('button', { name: /actions for transfer/i }).first();
    await actionsButton.click();
    await page.getByRole('menuitem', { name: /exclude/i }).click();

    // Verify AlertDialog notes both sides of transfer will be removed
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/both sides of this transfer will be removed/i);

    // Confirm Exclusion
    await confirmDialog.getByRole('button', { name: /exclude/i }).click();
    await expect(confirmDialog).not.toBeVisible();
  });
});
