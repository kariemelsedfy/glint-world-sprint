import { expect, test } from '@playwright/test';
import { TRAVEL_TIMEOUT_MS } from './support/game';

test.describe.configure({ timeout: 120_000 });

/** Bootstrap smoke coverage. A7 owns the full e2e suite. */
test('boots into the menu with a sized canvas and no page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('heading', { name: 'GLINT World Sprint' })).toBeVisible();

  const sized = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 100 && rect.height > 100;
  });
  expect(sized).toBe(true);
  expect(errors).toEqual([]);
});

test('runs menu → briefing → globe → Paris', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Icons' }).click();
  await expect(page.getByRole('heading', { name: 'Briefing' })).toBeVisible();

  await page.getByRole('button', { name: 'Go' }).click();
  await page.getByRole('button', { name: /Fly to Paris/ }).click();

  await expect(page.getByRole('button', { name: 'Globe' })).toBeVisible({ timeout: TRAVEL_TIMEOUT_MS });
  await expect(page.getByText(/WASD or arrow keys/)).toBeVisible();
});
