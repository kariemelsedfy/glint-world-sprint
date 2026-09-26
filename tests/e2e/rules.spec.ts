import { expect, test } from '@playwright/test';
import { ENTRY_PENALTY_MS, HINT_COST_MS } from '@/shared/contracts';
import {
  city,
  closeMap,
  collectPageErrors,
  flyTo,
  hud,
  level,
  openFresh,
  openMap,
  readPlayerFromMap,
  returnToGlobe,
  searchCircles,
  setTabHidden,
  startLevel,
  TRAVEL_TIMEOUT_MS,
} from './support/game';

test.describe.configure({ timeout: 240_000 });

const HINT_LABEL = [/^Hint 1: city \(\+10s\)$/, /^Hint 2: district \(\+20s\)$/, /^Hint 3: nearby \(\+35s\)$/] as const;

test('entry penalty is charged once per arrival, never on exit, and again on a revisit', async ({ page }) => {
  const errors = collectPageErrors(page);
  const [first, second] = level('icons').objectives;
  if (!first || !second) throw new Error('icons must have two objectives');
  await openFresh(page);
  await startLevel(page, 'icons');
  const clock = hud(page);

  await flyTo(page, first.cityId);
  expect(await clock.penaltyMs()).toBe(ENTRY_PENALTY_MS);
  await returnToGlobe(page);
  expect(await clock.penaltyMs()).toBe(ENTRY_PENALTY_MS);
  await flyTo(page, first.cityId);
  expect(await clock.penaltyMs()).toBe(2 * ENTRY_PENALTY_MS);
  await returnToGlobe(page);
  await flyTo(page, second.cityId);
  expect(await clock.penaltyMs()).toBe(3 * ENTRY_PENALTY_MS);
  expect(errors).toEqual([]);
});

test('hint tiers cost 10s/20s/35s incrementally, name the next price and narrow the map', async ({ page }) => {
  const errors = collectPageErrors(page);
  const [first] = level('icons').objectives;
  if (!first) throw new Error('icons must have an objective');
  await openFresh(page);
  await startLevel(page, 'icons');
  const clock = hud(page);
  const card = page.locator('li', { hasText: first.title });

  // Tier 1 bought from the globe.
  await card.getByRole('button', { name: HINT_LABEL[0] }).click();
  expect(await clock.penaltyMs()).toBe(HINT_COST_MS[0]);
  await expect(card.getByRole('button', { name: HINT_LABEL[1] })).toBeVisible();

  await flyTo(page, first.cityId);
  expect(await clock.penaltyMs()).toBe(HINT_COST_MS[0] + ENTRY_PENALTY_MS);
  const cityCard = page.locator('li', { hasText: first.title });

  // Free map: broad district region, no proper landmark names.
  let svg = await openMap(page, first.cityId);
  await expect(searchCircles(svg)).toHaveCount(1);
  await expect(searchCircles(svg)).toHaveAttribute('r', String(first.broadRadius));
  if (first.landmarkLabel) await expect(svg.getByText(first.landmarkLabel)).toHaveCount(0);

  // Map time is scored time.
  const before = await clock.adjustedMs();
  const playerBefore = await readPlayerFromMap(svg);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1_500);
  await page.keyboard.up('ArrowRight');
  expect(await clock.adjustedMs(), 'active clock keeps running while the map is open').toBeGreaterThanOrEqual(
    before + 1_000,
  );
  expect(await readPlayerFromMap(svg), 'movement is held while the map is open').toEqual(playerBefore);
  await closeMap(page, first.cityId);

  // Tier 2: district narrows and the landmark gets its proper name.
  await cityCard.getByRole('button', { name: HINT_LABEL[1] }).click();
  expect(await clock.penaltyMs()).toBe(HINT_COST_MS[0] + HINT_COST_MS[1] + ENTRY_PENALTY_MS);
  svg = await openMap(page, first.cityId);
  await expect(searchCircles(svg)).toHaveAttribute('r', String(first.narrowedRadius));
  if (first.landmarkLabel) await expect(svg.getByText(first.landmarkLabel)).toBeVisible();
  await closeMap(page, first.cityId);

  // Tier 3: fine patch; no further tier is offered.
  await cityCard.getByRole('button', { name: HINT_LABEL[2] }).click();
  const allHints = HINT_COST_MS[0] + HINT_COST_MS[1] + HINT_COST_MS[2];
  expect(await clock.penaltyMs()).toBe(allHints + ENTRY_PENALTY_MS);
  await expect(cityCard.getByRole('button', { name: /^Hint / })).toHaveCount(0);
  svg = await openMap(page, first.cityId);
  await expect(searchCircles(svg)).toHaveAttribute('r', String(first.fineRadius));
  await closeMap(page, first.cityId);
  expect(errors).toEqual([]);
});

test('a hint double-click buys exactly one tier', async ({ page }) => {
  const [, second] = level('icons').objectives;
  if (!second) throw new Error('icons must have two objectives');
  await openFresh(page);
  await startLevel(page, 'icons');
  const clock = hud(page);
  const card = page.locator('li', { hasText: second.title });

  await card.getByRole('button', { name: HINT_LABEL[0] }).dblclick();
  expect(await clock.penaltyMs()).toBe(HINT_COST_MS[0]);
  await expect(card.getByRole('button', { name: HINT_LABEL[1] })).toBeVisible();
});

test('pause marks practice; hiding the tab mid-travel pauses travel and marks practice', async ({ page }) => {
  const errors = collectPageErrors(page);
  const [first] = level('icons').objectives;
  if (!first) throw new Error('icons must have an objective');
  await openFresh(page);
  await startLevel(page, 'icons');
  const clock = hud(page);
  await expect(clock.practice).toBeHidden();

  await page.getByRole('button', { name: `Fly to ${city(first.cityId).label}` }).click();
  await expect(page.getByText('Travelling…')).toBeVisible();
  await setTabHidden(page, true);
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();

  // While paused mid-travel the flight holds; it neither lands nor fails.
  await page.waitForTimeout(3_000);
  await expect(page.getByText('Travelling…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Globe', exact: true })).toBeHidden();

  await setTabHidden(page, false);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Globe', exact: true })).toBeVisible({ timeout: TRAVEL_TIMEOUT_MS });
  await expect(clock.practice).toBeVisible();
  expect(await clock.penaltyMs(), 'the resumed arrival is charged exactly once').toBe(ENTRY_PENALTY_MS);

  // A paused clock does not advance.
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const frozen = await clock.adjustedMs();
  await page.waitForTimeout(1_500);
  expect(await clock.adjustedMs()).toBe(frozen);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(clock.practice).toBeVisible();
  expect(errors).toEqual([]);
});
