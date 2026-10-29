import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 12: Offline Mode & Network Sync Failure Recovery', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('handles network failure on mutation, displays offline banner, and recovers on retry', async ({ page }) => {
    await navigateTo(page, '/transactions');

    // 1. Intercept RPC endpoint to return 500 error and workspace to return 503
    await page.route('**/api/rpc', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database Disk Full' }),
      }),
    );
    await page.route('**/api/workspace**', route =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      }),
    );

    // 2. Attempt to save a transaction under network failure
    await page.getByRole('button', { name: /add transaction/i }).click();
    const txDialog = page.getByRole('dialog');
    await expect(txDialog).toBeVisible();

    await txDialog.getByRole('textbox', { name: /description/i }).fill('Network Fault Test');
    await txDialog.getByRole('spinbutton', { name: /value/i }).fill('50.00');
    await txDialog.getByRole('button', { name: /add transaction|save/i }).click();

    // Close transaction dialog if still open
    if (await txDialog.isVisible()) {
      await page.keyboard.press('Escape');
    }

    // 3. Verify OfflineBanner renders across the top
    const offlineBanner = page.getByText(/can’t reach the server|working offline/i);
    await expect(offlineBanner).toBeVisible();

    const retryBtn = page.getByRole('main').getByRole('button', { name: /retry/i });
    await expect(retryBtn).toBeVisible();

    // 4. Restore full network connectivity
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    // 5. Click "Retry" button on OfflineBanner
    await retryBtn.click();

    // 6. Verify OfflineBanner disappears upon reconnection
    await expect(offlineBanner).not.toBeVisible();

    // 7. Create a healthy transaction and verify normal operations resume
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(txDialog).toBeVisible();

    await txDialog.getByRole('textbox', { name: /description/i }).fill('Healthy Recovered Tx');
    await txDialog.getByRole('spinbutton', { name: /value/i }).fill('75.00');
    await txDialog.getByRole('button', { name: /add transaction|save/i }).click();
    await expect(txDialog).not.toBeVisible();

    // 8. Verify healthy transaction is reflected in the transactions table
    const txRow = page.getByRole('row', { name: /healthy recovered tx/i });
    await expect(txRow).toBeVisible();
    await expect(txRow).toContainText('−$75.00');
  });
});
