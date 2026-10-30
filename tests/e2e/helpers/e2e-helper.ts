import { type Page, type APIRequestContext, type Locator, expect } from '@playwright/test';

/**
 * Resets the test SQLite database via RPC to a known deterministic state.
 */
export async function resetTestDatabase(
  request: APIRequestContext,
  mode: 'development' | 'production' = 'development',
): Promise<void> {
  const response = await request.post('/api/rpc', {
    data: {
      action: 'resetSettings',
      payload: { seedMode: mode },
    },
  });
  expect(response.status()).toBe(200);
}

/**
 * Navigates to an app route and waits for core hydration.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  // Wait for main content area to be rendered and visible
  await expect(page.locator('main')).toBeVisible();
}

/**
 * Opens and returns the primary navigation regardless of viewport.
 * On desktop (>=1024px) this returns the persistent sidebar nav.
 * On mobile/tablet (<1024px) this opens the Sheet drawer if needed and returns the drawer nav.
 */
export async function openPrimaryNav(page: Page): Promise<Locator> {
  const desktopNav = page.locator('aside nav');
  if (await desktopNav.isVisible()) {
    return desktopNav;
  }

  const sheetNav = page.locator('[data-slot="sheet-content"] nav');
  if (!(await sheetNav.isVisible())) {
    const menuBtn = page.getByRole('button', { name: /open menu|abrir menu/i });
    await menuBtn.click();
    await expect(sheetNav).toBeVisible();
  }
  return sheetNav;
}

/**
 * Closes the primary navigation drawer if currently open on mobile/tablet.
 */
export async function closePrimaryNav(page: Page): Promise<void> {
  const sheetContent = page.locator('[data-slot="sheet-content"]');
  if (await sheetContent.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(sheetContent).toHaveCount(0);
  }
}

/**
 * Asserts that the document and individual cards do not overflow horizontally.
 * Fails if document scrollWidth > clientWidth, detailing any culprit DOM elements.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = Math.min(docEl.clientWidth, window.innerWidth);

    if (scrollWidth > clientWidth + 1) {
      const overflowing: { tag: string; id: string; className: string; scrollWidth: number; clientWidth: number }[] = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const style = window.getComputedStyle(el);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.display === 'none') {
          continue;
        }
        if (el.scrollWidth > clientWidth + 1 && el.clientWidth <= clientWidth) {
          overflowing.push({
            tag: el.tagName.toLowerCase(),
            id: el.id,
            className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          });
        }
      }
      return {
        hasOverflow: true,
        scrollWidth,
        clientWidth,
        culprits: overflowing.slice(0, 5),
      };
    }
    return { hasOverflow: false, scrollWidth, clientWidth, culprits: [] };
  });

  expect(
    result.hasOverflow,
    `Page has horizontal overflow: scrollWidth=${result.scrollWidth}px > clientWidth=${result.clientWidth}px. Culprits: ${JSON.stringify(result.culprits, null, 2)}`,
  ).toBe(false);
}
