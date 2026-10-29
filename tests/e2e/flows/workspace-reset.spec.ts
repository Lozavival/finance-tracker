import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 14: Workspace Data Reset & Factory Restoration', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('resets workspace to clean production factory defaults, then restores development fixtures without page reload', async ({
    page,
  }) => {
    // 1. Navigate to Settings -> Preferences
    await navigateTo(page, '/settings');
    await page.getByRole('tab', { name: /preferences/i }).click();

    // 2. Click "Reset to Factory Defaults"
    const resetProdBtn = page.getByRole('button', { name: /reset to factory defaults/i });
    await expect(resetProdBtn).toBeVisible();
    await resetProdBtn.click();

    // 3. Confirm in AlertDialog
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();
    await expect(alertDialog.getByText(/reset workspace data\?/i)).toBeVisible();

    const confirmBtn = alertDialog.getByRole('button', { name: /reset workspace/i });
    await confirmBtn.click();
    await expect(alertDialog).not.toBeVisible();

    // 4. Verify clean factory defaults state on Accounts page
    await navigateTo(page, '/accounts');
    await expect(page.getByRole('button', { name: /add account/i })).toBeVisible();
    await expect(page.getByText('Bank of America')).not.toBeVisible();

    // 5. Navigate to Goals page: clean factory defaults has empty goals
    await navigateTo(page, '/goals');
    await expect(page.getByRole('button', { name: /configure goals/i })).toBeVisible();

    // 6. Return to Settings -> Preferences to restore Development Fixtures
    await navigateTo(page, '/settings');
    await page.getByRole('tab', { name: /preferences/i }).click();

    const resetDevBtn = page.getByRole('button', { name: /reset to dev fixtures/i });
    await expect(resetDevBtn).toBeVisible();
    await resetDevBtn.click();

    await expect(alertDialog).toBeVisible();
    await alertDialog.getByRole('button', { name: /reset workspace/i }).click();
    await expect(alertDialog).not.toBeVisible();

    // 7. Verify Development Fixtures restored immediately without page reload
    await navigateTo(page, '/accounts');
    await expect(page.getByText('Bank of America').first()).toBeVisible();
    await expect(page.getByText('Citigroup').first()).toBeVisible();
    await expect(page.getByText('Nubank').first()).toBeVisible();
  });
});
