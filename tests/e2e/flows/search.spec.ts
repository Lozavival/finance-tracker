import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 9: Full-Text Search & Keyboard Navigation', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('searches transactions via global search shortcut, navigates results, and opens transaction for editing', async ({
    page,
  }) => {
    await navigateTo(page, '/');

    // 1. Press '/' to trigger global search focus
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeFocused();

    // 2. Type "mario" (trigram FTS matches "Dinner at Mario's")
    await searchInput.fill('mario');

    // 3. Verify popover dropdown populates with debounced matching transaction
    const popover = page.getByRole('dialog');
    await expect(popover.getByText("Dinner at Mario's")).toBeVisible();
    await expect(popover.getByText('Food & Dining')).toBeVisible();

    // 4. Press Enter to navigate to full transaction search view
    await searchInput.press('Enter');
    await expect(page).toHaveURL(/\/transactions\?q=mario/);

    // 5. Verify Transactions page displays the filtered result
    const txRow = page.getByRole('row', { name: /dinner at mario's/i });
    await expect(txRow).toBeVisible();
    await expect(txRow).toContainText('−$85.00');

    // 6. Open row actions and click Edit
    await txRow.getByRole('button', { name: /actions for dinner at mario's/i }).click();
    await page.getByRole('menuitem', { name: /edit/i }).click();

    // 7. Verify Transaction dialog opens preloaded with transaction details
    const txDialog = page.getByRole('dialog');
    await expect(txDialog).toBeVisible();
    await expect(txDialog.getByRole('textbox', { name: /description/i })).toHaveValue("Dinner at Mario's");
    await expect(txDialog.getByRole('spinbutton', { name: /value/i })).toHaveValue('85');
  });
});

