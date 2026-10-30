import { test, expect } from '@playwright/test';
import { resetTestDatabase, navigateTo, expectNoHorizontalOverflow } from '../helpers/e2e-helper';

const TEST_VIEWPORTS = [
  { name: 'phone-compact', width: 360, height: 740 },
  { name: 'phone-standard', width: 414, height: 896 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop-compact', width: 1024, height: 768 },
  { name: 'desktop-hd', width: 1280, height: 720 },
  { name: 'desktop-wide', width: 1536, height: 864 },
];

const ROUTES = ['/dashboard', '/transactions', '/accounts', '/goals', '/settings'];

test.describe('Flow 15: Responsive Layout & Multi-Viewport Verification', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestDatabase(request, 'development');
  });

  for (const vp of TEST_VIEWPORTS) {
    test(`renders all primary views without horizontal overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of ROUTES) {
        await navigateTo(page, route);
        await expectNoHorizontalOverflow(page);
      }
    });
  }

  test('responsive shell navigation transitions seamlessly between drawer and sidebar', async ({ page }) => {
    // 1. Mobile viewport (360px): Drawer navigation
    await page.setViewportSize({ width: 360, height: 740 });
    await navigateTo(page, '/dashboard');

    // Desktop sidebar should not be in the DOM
    await expect(page.locator('aside nav')).toHaveCount(0);

    // Hamburger button should be visible
    const hamburger = page.getByRole('button', { name: /open menu|abrir menu/i });
    await expect(hamburger).toBeVisible();

    // Click hamburger to open mobile nav drawer
    await hamburger.click();
    const drawerNav = page.locator('[data-slot="sheet-content"] nav');
    await expect(drawerNav).toBeVisible();

    // Navigate to /transactions via drawer
    const transactionsBtn = drawerNav.getByRole('button', { name: /transactions|transações/i });
    await transactionsBtn.click();
    await expect(page).toHaveURL(/\/transactions/);

    // Drawer should auto-close upon navigation
    await expect(page.locator('[data-slot="sheet-content"]')).toHaveCount(0);

    // 2. Desktop viewport (1280px): Persistent sidebar
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('aside nav')).toBeVisible();
    await expect(page.getByRole('button', { name: /open menu|abrir menu/i })).toHaveCount(0);
  });

  test('dialogs and overlays stay within bounds on 360px mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await navigateTo(page, '/dashboard');

    // 1. Notification Center Popover
    const bellBtn = page.getByRole('button', { name: /notifications|notificações/i });
    await bellBtn.click();
    const notifPopover = page.locator('[data-slot="popover-content"][data-state="open"]');
    await expect(notifPopover).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(notifPopover).toHaveCount(0);

    // 2. Global Search Expand and Results
    const searchTrigger = page.getByRole('button', { name: /open search|abrir busca/i });
    await searchTrigger.click();
    const searchInput = page.getByPlaceholder(/search transactions|buscar transações/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Market');
    const searchPopover = page.locator('[data-slot="popover-content"][data-state="open"]');
    await expect(searchPopover).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(searchPopover).toHaveCount(0);

    // 3. Transaction Form Dialog
    await navigateTo(page, '/transactions');
    const addTxBtn = page.getByRole('button', { name: /add transaction|nova transação/i });
    await addTxBtn.click();
    await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');

    // 4. Account Form Dialog
    await navigateTo(page, '/accounts');
    const addAccBtn = page.getByRole('button', { name: /add account|nova conta/i });
    await addAccBtn.click();
    await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
