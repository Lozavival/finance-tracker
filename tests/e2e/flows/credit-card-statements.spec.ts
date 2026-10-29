import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 3: Credit Card Statements & Billing Cycles', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('views credit card account statements, verifying billing cycle closing & due dates', async ({ page }) => {
    // 1. Navigate to Accounts
    await navigateTo(page, '/accounts');

    // 2. Select Bank of America which has a configured credit card
    const boaCard = page.locator('div').filter({ hasText: /^Bank of America/ }).first();
    await boaCard.click();

    // 3. Verify Account Detail Page loaded
    await expect(page).toHaveURL(/.*\/accounts\/boa/);

    // 4. Verify Credit Card Bills Panel is visible
    const billsPanel = page.locator('text=Credit card bills').first();
    await expect(billsPanel).toBeVisible();

    // 5. Verify statement summary contains Closes and Due Date indicators
    await expect(page.getByText(/closes/i).first()).toBeVisible();
    await expect(page.getByText(/due/i).first()).toBeVisible();
    await expect(page.getByText(/limit usage/i).first()).toBeVisible();
  });
});
