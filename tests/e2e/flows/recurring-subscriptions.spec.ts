import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 5: Recurring Subscriptions & Cancellation Cutoff', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('views recurring rules dialog, creates a recurring subscription, and cancels active rule', async ({
    page,
  }) => {
    await navigateTo(page, '/transactions');

    // 1. Open Recurring Rules Dialog
    await page.getByRole('button', { name: /recurring rules/i }).click();
    const rulesDialog = page.getByRole('dialog').filter({ hasText: /recurring rules/i });
    await expect(rulesDialog).toBeVisible();

    // 2. Verify seeded recurring rules exist
    await expect(rulesDialog.getByText(/salary deposit/i).first()).toBeVisible();

    // 3. Click "New rule" to open Transaction Form in recurring mode
    await rulesDialog.getByRole('button', { name: /new rule/i }).click();
    await expect(rulesDialog).not.toBeVisible();

    const txDialog = page.getByRole('dialog').filter({ hasText: /add transaction/i });
    await expect(txDialog).toBeVisible();

    // 4. Fill form for Netflix Subscription and Submit via Enter
    await txDialog.getByRole('textbox', { name: /description/i }).fill('Netflix Subscription');
    const valueInput = txDialog.getByRole('spinbutton', { name: /value/i });
    await valueInput.fill('19.99');
    await valueInput.press('Enter');

    // 5. Verify Dialog Closes
    await expect(txDialog).not.toBeVisible();

    // 6. Reopen Recurring Rules Dialog and verify Netflix Subscription is active
    await page.getByRole('button', { name: /recurring rules/i }).click();
    await expect(rulesDialog).toBeVisible();
    await expect(rulesDialog.getByText(/netflix subscription/i)).toBeVisible();

    // 7. Stop Recurrence for active rule
    const stopButton = rulesDialog.getByRole('button', { name: /stop recurrence/i }).first();
    await stopButton.click();

    // Confirm stop in alert dialog
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();
    await alertDialog.getByRole('button', { name: /stop recurrence/i }).click();
    await expect(alertDialog).not.toBeVisible();
  });
});
