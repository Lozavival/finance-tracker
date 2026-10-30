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

    // 3. Transaction Form Dialog: Pinned footer and scrollable body
    await navigateTo(page, '/transactions');
    const addTxBtn = page.getByRole('button', { name: /add transaction|nova transação/i });
    await addTxBtn.click();
    const txDialog = page.locator('[data-slot="dialog-content"]');
    await expect(txDialog).toBeVisible();
    await expectNoHorizontalOverflow(page);
    // Pinned footer save button must be visible within viewport
    const saveBtn = txDialog.getByRole('button', { name: /add transaction|adicionar transação/i });
    await expect(saveBtn).toBeVisible();
    await page.keyboard.press('Escape');

    // 4. Account Form Dialog
    await navigateTo(page, '/accounts');
    const addAccBtn = page.getByRole('button', { name: /add account|nova conta/i });
    await addAccBtn.click();
    await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('account options menu opens without layout shift or page scroll reset on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await navigateTo(page, '/accounts');

    // Navigate to detail page of first account
    const firstAccount = page.locator('.cursor-pointer').filter({ hasText: /checking|corrente/i }).first();
    await firstAccount.click();
    await page.waitForURL(/\/accounts\/.+/);

    // Click options menu
    const heading = page.locator('[role="heading"][aria-level="1"]');
    const optionsBtn = heading.locator('..').locator('button').first();
    await optionsBtn.click();

    // Verify dropdown menu opens
    const menuContent = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(menuContent).toBeVisible();

    // Verify dropdown menu does not lock body scroll (modal=false)
    const isScrollLocked = await page.evaluate(() => document.body.hasAttribute('data-scroll-locked'));
    expect(isScrollLocked).toBe(false);

    // Verify menu content stays within viewport bounds
    const menuBox = await menuContent.boundingBox();
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(360 + 1);

    // Verify zero horizontal overflow
    await expectNoHorizontalOverflow(page);
  });

  test('MonthPicker with backToCurrentMonth button wraps cleanly without horizontal overflow on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await navigateTo(page, '/goals');

    // MonthPicker initial month is current month, back button is hidden
    const prevBtn = page.getByRole('button', { name: /previous month|mês anterior/i });
    await prevBtn.click();

    // Back to current month button appears
    const backBtn = page.getByRole('button', { name: /current month|mês atual/i });
    await expect(backBtn).toBeVisible();

    // Verify no horizontal overflow with back button shown
    await expectNoHorizontalOverflow(page);
  });

  test('transaction types and payment methods list items fit without overlapping buttons on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await navigateTo(page, '/settings');

    // 1. Transaction Types tab
    await page.getByRole('tab', { name: /transaction types|types|categorias/i }).click();
    await expectNoHorizontalOverflow(page);

    // 2. Payment Methods tab
    await page.getByRole('tab', { name: /payment methods|methods|métodos/i }).click();
    await expectNoHorizontalOverflow(page);

    // Verify credit card billing badge does not collide with action buttons
    const cardMethodRow = page.locator('.group').filter({ hasText: /credit card|cartão de crédito/i }).first();
    await expect(cardMethodRow).toBeVisible();
    const editBtn = cardMethodRow.getByRole('button', { name: /edit|editar/i });
    await expect(editBtn).toBeVisible();
  });
});
