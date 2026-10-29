import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 8: Budget Goals & Smart Insights Alerts', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('configures budget, triggers 85% warning alert and upgrades to critical limit exceeded', async ({ page }) => {
    // 1. Create a custom category "Online Courses" linked to "Knowledge" goal category
    await navigateTo(page, '/settings');
    await page.getByRole('tab', { name: /transaction types|types|categories/i }).click();

    await page.getByRole('button', { name: /add expense type/i }).click();
    const typeDialog = page.getByRole('dialog');
    await expect(typeDialog).toBeVisible();

    await typeDialog.getByLabel(/type name|name/i).fill('Online Courses');

    // Link to "Knowledge" goal category
    await typeDialog.getByRole('combobox').click();
    await page.getByRole('option', { name: /knowledge/i }).click();

    await typeDialog.getByRole('button', { name: /add type|save|create/i }).click();
    await expect(typeDialog).not.toBeVisible();

    // 2. Navigate to Goals page and set reference income to $1,000.00
    // "Knowledge" has 5% allocation -> exactly $50.00 monthly budget
    await navigateTo(page, '/goals');
    await page.getByRole('button', { name: /adjust goals/i }).click();

    const incomeInput = page.getByRole('spinbutton').first();
    await incomeInput.fill('1000');
    await page.getByRole('button', { name: /save income/i }).click();

    // Return to Budget Overview
    await page.getByRole('button', { name: /back to budget/i }).click();
    await expect(page.getByText('Knowledge')).toBeVisible();

    // 3. Navigate to Transactions and record an expense of $43.00 in "Online Courses"
    // 43 / 50 = 86% (>= 85% warning threshold, < 100%)
    await navigateTo(page, '/transactions');
    await page.getByRole('button', { name: /add transaction/i }).click();
    const txDialog = page.getByRole('dialog');
    await expect(txDialog).toBeVisible();

    await txDialog.getByRole('textbox', { name: /description/i }).fill('TypeScript Masterclass');
    const valueInput = txDialog.getByRole('spinbutton', { name: /value/i });
    await valueInput.fill('43.00');

    // Select category "Online Courses"
    await txDialog.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /online courses/i }).click();

    // Select account "Nubank" (BRL account matching budget currency)
    await txDialog.getByRole('combobox', { name: /account/i }).click();
    await page.getByRole('option', { name: /nubank/i }).click();

    await txDialog.getByRole('button', { name: /add transaction|save/i }).click();
    await expect(txDialog).not.toBeVisible();

    // 4. Check Top Navigation Bell indicator
    const bellBtn = page.getByRole('button', { name: /notifications/i });
    await expect(bellBtn).toBeVisible();
    await expect(bellBtn.locator('span')).toBeVisible();

    // Open Notification Center and verify Budget Warning for Knowledge
    await bellBtn.click();
    const notifPopover = page.getByRole('dialog');
    await expect(notifPopover.getByText(/budget warning/i).first()).toBeVisible();
    await expect(notifPopover.getByText(/knowledge/i).first()).toBeVisible();

    // Close notification popover
    await page.keyboard.press('Escape');

    // 5. Navigate to Dashboard and verify Smart Insights card displays warning
    await navigateTo(page, '/');
    const signalsCard = page.getByRole('button', { name: /smart insights/i });
    await expect(signalsCard).toBeVisible();
    await signalsCard.click();

    const smartInsightsPopover = page.getByRole('dialog');
    await expect(smartInsightsPopover.getByText(/budget warning/i).first()).toBeVisible();
    await expect(smartInsightsPopover.getByText(/knowledge/i).first()).toBeVisible();
    await page.keyboard.press('Escape');

    // 6. Navigate to Transactions and log an additional $10.00 expense in "Online Courses"
    // Total spent = $53.00 / $50.00 = 106% (>= 100% critical threshold)
    await navigateTo(page, '/transactions');
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(txDialog).toBeVisible();

    await txDialog.getByRole('textbox', { name: /description/i }).fill('Design Patterns Book');
    const valInput2 = txDialog.getByRole('spinbutton', { name: /value/i });
    await valInput2.fill('10.00');

    await txDialog.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /online courses/i }).click();

    // Select account "Nubank" (BRL account matching budget currency)
    await txDialog.getByRole('combobox', { name: /account/i }).click();
    await page.getByRole('option', { name: /nubank/i }).click();

    await txDialog.getByRole('button', { name: /add transaction|save/i }).click();
    await expect(txDialog).not.toBeVisible();

    // 7. Verify Notification upgrades to Budget Limit Exceeded (Critical) for Knowledge
    await bellBtn.click();
    await expect(notifPopover.getByText(/budget limit exceeded/i).first()).toBeVisible();
    await expect(notifPopover.getByText(/knowledge/i).first()).toBeVisible();
  });
});
