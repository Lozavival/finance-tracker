import { type Page, type APIRequestContext, expect } from '@playwright/test';

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
  // Wait for sidebar navigation to be visible
  await expect(page.locator('nav')).toBeVisible();
}

