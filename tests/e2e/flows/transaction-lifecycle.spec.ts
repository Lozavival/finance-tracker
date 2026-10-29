import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 1: Single Transaction Lifecycle & Undo', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('creates expense transaction, verifies in table & dashboard, deletes and restores via undo toast', async ({
    page,
  }) => {
    await navigateTo(page, '/transactions');

    // 1. Open Add Transaction Dialog
    await page.getByRole('button', { name: /add transaction/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 2. Fill Transaction Form
    await dialog.getByRole('textbox', { name: /description/i }).fill('Family Dinner');
    await dialog.getByRole('spinbutton', { name: /value/i }).fill('120.50');

    // 3. Save Transaction
    await dialog.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible();

    // 4. Verify in Month Table
    const txRow = page.getByRole('row', { name: /family dinner/i });
    await expect(txRow).toBeVisible();
    await expect(txRow).toContainText('120.50');

    // 5. Navigate to Dashboard & Verify Page Renders
    await navigateTo(page, '/dashboard');
    await expect(page.locator('main')).toBeVisible();

    // 6. Return to Transactions and Exclude Transaction
    await navigateTo(page, '/transactions');
    const actionsButton = page.getByRole('button', { name: /actions for family dinner/i });
    await actionsButton.click();

    await page.getByRole('menuitem', { name: /exclude/i }).click();

    // Confirm Exclusion in AlertDialog
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /exclude/i }).click();
    await expect(confirmDialog).not.toBeVisible();

    // 7. Verify Undo Toast and Click Undo
    const undoButton = page.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeVisible();
    await undoButton.click();

    // 8. Verify Transaction Restored in Table
    await expect(page.getByRole('row', { name: /family dinner/i })).toBeVisible();
  });
});
