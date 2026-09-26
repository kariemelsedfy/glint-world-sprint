import { expect, test } from '@playwright/test';

test('without WebGL the game shows a recoverable error screen, not a blank page', async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  try {
    const page = await browser.newPage({ baseURL });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(page.getByRole('button', { name: /reload/i })).toBeVisible();
  } finally {
    await browser.close();
  }
});
