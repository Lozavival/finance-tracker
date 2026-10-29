import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo } from '../helpers/e2e-helper';

test.describe('Flow 10: Bilingual Localization & Theme Persistence', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  test('switches language and theme, verifies translation and styling, and verifies persistence across reload', async ({
    page,
  }) => {
    // 1. Navigate to Settings -> Preferences
    await navigateTo(page, '/settings');
    await page.getByRole('tab', { name: /preferences/i }).click();

    // 2. Select Portuguese (pt-BR)
    const ptToggle = page.getByRole('button', { name: /portuguese/i });
    await expect(ptToggle).toBeVisible();
    await ptToggle.click();

    // 3. Verify sidebar navigation labels change to Portuguese
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('button', { name: /painel/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /transações/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /contas/i })).toBeVisible();

    // 4. Switch theme to Light via TopNavigation dropdown
    const themeBtn = page.getByRole('button', { name: /toggle theme|alternar tema/i });
    await themeBtn.click();
    await page.getByRole('menuitem', { name: /claro|light/i }).click();

    // 5. Verify <html> tag has 'light' class
    const html = page.locator('html');
    await expect(html).toHaveClass(/light/);

    // 6. Reload page
    await page.reload();

    // 7. Verify Portuguese language and Light theme persist across reload
    await expect(html).toHaveClass(/light/);
    await expect(nav.getByRole('button', { name: /painel/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /transações/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /contas/i })).toBeVisible();

    // 8. Revert back to Dark theme and English for cleanliness
    await themeBtn.click();
    await page.getByRole('menuitem', { name: /escuro|dark/i }).click();
    await expect(html).toHaveClass(/dark/);

    await navigateTo(page, '/settings');
    await page.getByRole('tab', { name: /preferências|preferences/i }).click();
    await page.getByRole('button', { name: /english/i }).click();
    await expect(nav.getByRole('button', { name: /dashboard/i })).toBeVisible();
  });
});
