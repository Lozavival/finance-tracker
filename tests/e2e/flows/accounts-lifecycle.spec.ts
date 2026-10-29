import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 6: Account Management Lifecycle', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('creates new account, archives it, restores it, blocks deleting account with transactions, and deletes empty account', async ({
    page,
  }) => {
    await navigateTo(page, '/accounts');

    // 1. Click Add account button
    await page.getByRole('button', { name: /add account/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 2. Fill Account Form: Name = "Travel Fund"
    await dialog.getByLabel(/name/i).first().fill('Travel Fund');
    await dialog.getByPlaceholder('0.00').first().fill('500.00');

    // Submit dialog
    await dialog.getByRole('button', { name: /add account/i }).click();
    await expect(dialog).not.toBeVisible();

    // 3. Verify Travel Fund Card appears
    const travelCard = page.locator('.p-6').filter({ hasText: 'Travel Fund' }).first();
    await expect(travelCard).toBeVisible();

    // 4. Open Menu on Travel Fund and Archive
    await travelCard.locator('button').click();
    await page.getByRole('menuitem', { name: /archive/i }).click();

    // Confirm in Archive AlertDialog
    const archiveDialog = page.getByRole('alertdialog');
    await expect(archiveDialog).toBeVisible();
    await archiveDialog.getByRole('button', { name: /archive account/i }).click();
    await expect(archiveDialog).not.toBeVisible();

    // 5. Expand Archived section and click Restore
    const showArchivedBtn = page.getByRole('button', { name: /show archived/i });
    await expect(showArchivedBtn).toBeVisible();
    await showArchivedBtn.click();

    const restoreBtn = page.getByRole('button', { name: /restore account/i }).first();
    await expect(restoreBtn).toBeVisible();
    await restoreBtn.click();

    // Confirm in Restore AlertDialog
    const restoreDialog = page.getByRole('alertdialog');
    await expect(restoreDialog).toBeVisible();
    await restoreDialog.getByRole('button', { name: /restore account/i }).click();
    await expect(restoreDialog).not.toBeVisible();

    // Verify Travel Fund is active again
    const activeTravelCard = page.locator('.p-6').filter({ hasText: 'Travel Fund' }).first();
    await expect(activeTravelCard).toBeVisible();

    // 6. Test Protection: Try to delete Bank of America (has transactions)
    const boaCard = page.locator('.p-6').filter({ hasText: 'Bank of America' }).first();
    await boaCard.locator('button').click();
    await page.getByRole('menuitem', { name: /delete/i }).click();

    // Verify Delete dialog blocks deletion with "Archive account instead"
    const deleteDialog = page.getByRole('alertdialog');
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByRole('button', { name: /archive account instead/i })).toBeVisible();

    // Cancel out
    await deleteDialog.getByRole('button', { name: /cancel/i }).click();
    await expect(deleteDialog).not.toBeVisible();

    // 7. Delete Empty Account: Travel Fund
    await activeTravelCard.locator('button').click();
    await page.getByRole('menuitem', { name: /delete/i }).click();

    // Confirm deletion of empty account
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: /delete permanently/i }).click();
    await expect(deleteDialog).not.toBeVisible();

    // Verify Travel Fund is permanently removed
    await expect(page.locator('.p-6').filter({ hasText: 'Travel Fund' })).toHaveCount(0);
  });
});
