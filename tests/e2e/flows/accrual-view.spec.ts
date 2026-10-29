import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 13: Accrual vs Cash Basis Transaction Table Toggle', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('verifies accrual-basis aggregation on transactions page vs cash-basis individual portions on account view', async ({
    page,
  }) => {
    // 1. Navigate to Transactions page and record a 6-month installment purchase
    await navigateTo(page, '/transactions');
    await page.getByRole('button', { name: /add transaction/i }).click();

    const txDialog = page.getByRole('dialog');
    await expect(txDialog).toBeVisible();

    await txDialog.getByRole('textbox', { name: /description/i }).fill('Designer Standing Desk');
    await txDialog.getByRole('spinbutton', { name: /value/i }).fill('600.00');

    // Fill installments input (default account Bank of America supports installments)
    const installmentsInput = txDialog.getByLabel(/installments/i);
    await installmentsInput.fill('6');

    // Submit transaction
    await txDialog.getByRole('button', { name: /add transaction|save/i }).click();
    await expect(txDialog).not.toBeVisible();

    // 2. Verify Accrual Basis Grouping on Transactions Page:
    // All 6 installments are collapsed into a single row with total $600.00 and '6 Installments' badge
    const accrualRow = page.getByRole('row', { name: /designer standing desk/i });
    await expect(accrualRow).toBeVisible();
    await expect(accrualRow).toContainText('6 Installments');
    await expect(accrualRow).toContainText('600.00');

    // 3. Navigate to Bank of America Account Detail view (Cash Basis)
    await navigateTo(page, '/accounts/boa');
    await expect(page.getByRole('heading', { name: /bank of america/i }).first()).toBeVisible();

    // 4. Verify Cash Basis view shows individual installment portion (1/6 and $100.00)
    const cashRow = page.getByRole('row', { name: /designer standing desk/i }).first();
    await expect(cashRow).toBeVisible();
    await expect(cashRow).toContainText('1/6');
    await expect(cashRow).toContainText('100.00');
  });
});
