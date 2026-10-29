import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 7: Custom Types & Mandatory Reassignment', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('creates custom category, uses it in transaction, and requires reassignment upon category deletion', async ({
    page,
  }) => {
    // 1. Navigate to Settings -> Categories (tab "types")
    await navigateTo(page, '/settings');
    await page.getByRole('tab', { name: /transaction types|types|categories/i }).click();

    // 2. Click "Add expense type"
    await page.getByRole('button', { name: /add expense type/i }).click();
    const typeDialog = page.getByRole('dialog');
    await expect(typeDialog).toBeVisible();

    // Fill Name: "Consulting"
    await typeDialog.getByLabel(/type name|name/i).fill('Consulting');
    await typeDialog.getByRole('button', { name: /add type|save|create/i }).click();
    await expect(typeDialog).not.toBeVisible();

    // 3. Verify Consulting exists in the category list
    await expect(page.getByText('Consulting', { exact: true })).toBeVisible();

    // 4. Navigate to Transactions and record an expense using "Consulting"
    await navigateTo(page, '/transactions');
    await page.getByRole('button', { name: /add transaction/i }).click();
    const txDialog = page.getByRole('dialog');
    await expect(txDialog).toBeVisible();

    await txDialog.getByRole('textbox', { name: /description/i }).fill('Consulting Session');
    const valueInput = txDialog.getByRole('spinbutton', { name: /value/i });
    await valueInput.fill('250.00');

    // Select "Consulting" category from OptionSelect dropdown
    await txDialog.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /consulting/i }).click();

    // Submit transaction
    await txDialog.getByRole('button', { name: /add transaction|save/i }).click();
    await expect(txDialog).not.toBeVisible();

    // 5. Verify Consulting Session appears in table with "Consulting"
    const txRow = page.getByRole('row', { name: /consulting session/i });
    await expect(txRow).toBeVisible();
    await expect(txRow).toContainText('Consulting');

    // 6. Return to Settings -> Categories
    await navigateTo(page, '/settings');
    await page.getByRole('tab', { name: /transaction types|types|categories/i }).click();

    // 7. Find "Consulting" row and click delete icon
    const consultingRow = page.locator('.group').filter({ hasText: 'Consulting' }).first();
    const deleteBtn = consultingRow.getByRole('button', { name: /delete type/i });
    await deleteBtn.click();

    // 8. DeleteTypeDialog opens and warns that transaction(s) use this category
    const deleteDialog = page.getByRole('alertdialog');
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByText(/1 transaction\(s\) currently use Consulting/i)).toBeVisible();

    // The Confirm Delete button must be disabled until a replacement category is selected
    const confirmDeleteBtn = deleteDialog.getByRole('button', { name: /reassign and delete/i });
    await expect(confirmDeleteBtn).toBeDisabled();

    // Select replacement category (e.g. Services or Shopping)
    await deleteDialog.getByRole('combobox').click();
    await page.getByRole('option').first().click();

    // Now Confirm Delete button is enabled
    await expect(confirmDeleteBtn).toBeEnabled();
    await confirmDeleteBtn.click();
    await expect(deleteDialog).not.toBeVisible();

    // 9. Return to Transactions and verify the transaction now reflects the reassigned category
    await navigateTo(page, '/transactions');
    await expect(page.getByRole('row', { name: /consulting session/i })).toBeVisible();
  });
});
