import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 11: Cross-Currency Transfer & Currency Scope Filter', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('creates cross-currency transfer with exchange rate notice and switches currency scope', async ({ page }) => {
    // 1. Navigate to Transactions page
    await navigateTo(page, '/transactions');
    await page.getByRole('button', { name: /add transaction/i }).click();

    const txDialog = page.getByRole('dialog');
    await expect(txDialog).toBeVisible();

    // 2. Select Transfer Mode (Radio toggle)
    await txDialog.getByRole('radio', { name: /transfer/i }).click();

    // 3. Fill Cross-Currency Amounts: Send $100.00 USD, Receive R$ 550.00 BRL
    await txDialog.getByRole('spinbutton', { name: /amount to send/i }).fill('100.00');
    await txDialog.getByRole('spinbutton', { name: /amount to receive/i }).fill('550.00');

    // Verify effective rate indicator
    await expect(txDialog.getByText(/1 USD = R\$ 5.50/i)).toBeVisible();

    // 4. Submit Transfer
    await txDialog.getByRole('button', { name: /add transaction|transfer/i }).click();
    await expect(txDialog).not.toBeVisible();

    // 5. Verify outgoing transfer row includes formatted exchange rate notice
    const outgoingRow = page.getByRole('row', { name: /transfer to nubank \(550\.00 BRL @ 0\.18 USD\/BRL\)/i });
    await expect(outgoingRow).toBeVisible();
    await expect(outgoingRow).toContainText('−$100.00');

    // 6. Verify reciprocal incoming transfer row
    const incomingRow = page.getByRole('row', { name: /transfer from bank of america/i }).first();
    await expect(incomingRow).toBeVisible();
    await expect(incomingRow).toContainText('+R$550.00');

    // 7. Navigate to Dashboard and verify Currency Scope filter toggling
    await navigateTo(page, '/');
    const usdToggle = page.getByRole('button', { name: /^USD \(\$\)$/i });
    const brlToggle = page.getByRole('button', { name: /^BRL \(R\$\)$/i });

    await expect(usdToggle).toBeVisible();
    await expect(brlToggle).toBeVisible();

    // Toggle to USD
    await usdToggle.click();
    await expect(page.getByText(/\$233,\d{3}/).first()).toBeVisible();

    // Toggle to BRL
    await brlToggle.click();
    await expect(page.getByText(/R\$21,\d{3}/).first()).toBeVisible();
  });
});
