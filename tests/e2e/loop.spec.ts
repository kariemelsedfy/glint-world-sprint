import { expect, test } from '@playwright/test';
import { ENTRY_PENALTY_MS } from '@/shared/contracts';
import {
  bestKey,
  closeMap,
  collectPageErrors,
  flyTo,
  hud,
  level,
  openFresh,
  openMap,
  readResults,
  readStoredBests,
  returnToGlobe,
  searchCircles,
  startLevel,
  walkToAndCollect,
} from './support/game';

/** Clock values are displayed in tenths, so allow one display step of rounding per term. */
const DISPLAY_TOLERANCE_MS = 300;

test.describe.configure({ mode: 'serial' });

test('full loop: menu → briefing → globe → travel → city → collect → results → retry, best survives reload', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = collectPageErrors(page);
  const icons = level('icons');
  const [first, second] = icons.objectives;
  if (!first || !second) throw new Error('icons must have two objectives');

  await openFresh(page);
  await startLevel(page, 'icons');
  const clock = hud(page);
  expect(await clock.penaltyMs()).toBe(0);

  await flyTo(page, first.cityId);
  expect(await clock.penaltyMs()).toBe(ENTRY_PENALTY_MS);

  const svg = await openMap(page, first.cityId);
  await expect(searchCircles(svg)).toHaveCount(1);
  await closeMap(page, first.cityId);

  await walkToAndCollect(page, first);
  const afterPickup = await openMap(page, first.cityId);
  await expect(searchCircles(afterPickup), 'no objective zones remain in a finished city').toHaveCount(0);
  await closeMap(page, first.cityId);

  await returnToGlobe(page);
  expect(await clock.penaltyMs(), 'exit travel adds no penalty').toBe(ENTRY_PENALTY_MS);
  await flyTo(page, second.cityId);
  expect(await clock.penaltyMs()).toBe(2 * ENTRY_PENALTY_MS);
  await walkToAndCollect(page, second);

  const result = await readResults(page);
  expect(result.practice).toBe(false);
  expect(result.hintMs).toBe(0);
  expect(result.travelMs).toBe(2 * ENTRY_PENALTY_MS);
  expect(result.activeMs).toBeGreaterThan(0);
  expect(Math.abs(result.adjustedMs - (result.activeMs + result.hintMs + result.travelMs))).toBeLessThanOrEqual(
    DISPLAY_TOLERANCE_MS,
  );

  const key = bestKey(icons);
  const stored = await readStoredBests(page);
  expect(stored[key], 'valid run stores a local best').toBeDefined();
  const best = stored[key]!;
  expect(Math.abs(best - result.adjustedMs)).toBeLessThanOrEqual(DISPLAY_TOLERANCE_MS);

  // Retry: same trial, fresh run state.
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Briefing' })).toBeVisible();
  for (const objective of icons.objectives) await expect(page.getByText(objective.title)).toBeVisible();
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  expect(await clock.penaltyMs()).toBe(0);
  expect(await clock.adjustedMs()).toBeLessThan(5_000);
  await expect(clock.practice).toBeHidden();
  for (const objective of icons.objectives) {
    await expect(page.locator('li', { hasText: objective.title })).not.toHaveClass(/line-through/);
  }

  // Reload: the stored best is read back and survives a second, practice-marked completion.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'GLINT World Sprint' })).toBeVisible();
  expect((await readStoredBests(page))[key]).toBe(best);

  await startLevel(page, 'icons');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(clock.practice).toBeVisible();

  await flyTo(page, first.cityId);
  await walkToAndCollect(page, first);
  await returnToGlobe(page);
  await flyTo(page, second.cityId);
  await walkToAndCollect(page, second);

  const practiceResult = await readResults(page);
  expect(practiceResult.practice).toBe(true);
  expect((await readStoredBests(page))[key], 'practice run never overwrites the stored best').toBe(best);

  expect(errors).toEqual([]);
});
