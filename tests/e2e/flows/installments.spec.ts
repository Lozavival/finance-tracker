import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 2: Cent-Exact Installments Plan', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('creates 3-month installment plan, verifies cent-exact preview and deletion of entire series', async ({
    page,
  }) => {
    await navigateTo(page, '/transactions');

    // 1. Open Add Transaction Dialog
    await page.getByRole('button', { name: /add transaction/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 2. Fill Form with $100.00 and 3 Installments
    await dialog.getByRole('textbox', { name: /description/i }).fill('Electronics Purchase');
    await dialog.getByRole('spinbutton', { name: /value/i }).fill('100.00');

    const installmentsInput = dialog.getByLabel(/installments/i);
    await installmentsInput.fill('3');

    // Verify Cent-Exact Preview: 1 × $33.34 + 2 × $33.33
    await expect(dialog.getByText(/1 × \$33\.34 \+ 2 × \$33\.33/)).toBeVisible();

    // 3. Save Transaction
    await dialog.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible();

    // 4. Verify in Transactions Table (displays grouped 3 Installments on accrual basis)
    const txRow = page.getByRole('row', { name: /electronics purchase/i });
    await expect(txRow).toBeVisible();
    await expect(txRow).toContainText('3 Installments');
    await expect(txRow).toContainText('100.00');

    // 5. Exclude Installment Series
    const actionsButton = page.getByRole('button', { name: /actions for electronics purchase/i });
    await actionsButton.click();
    await page.getByRole('menuitem', { name: /exclude/i }).click();

    // Verify AlertDialog notes all 3 installments will be removed
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/all 3 installments/i);

    // Confirm Exclusion
    await confirmDialog.getByRole('button', { name: /exclude/i }).click();
    await expect(confirmDialog).not.toBeVisible();

    // Verify row is removed
    await expect(page.getByRole('row', { name: /electronics purchase/i })).not.toBeVisible();
  });
});
