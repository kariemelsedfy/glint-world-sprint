import { expect, test } from '@playwright/test';
import { ENTRY_PENALTY_MS } from '@/shared/contracts';
import type { LevelId } from '@/shared/contracts';
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
  searchCircles,
  startLevel,
  walkToAndCollect,
} from './support/game';

/** Trials whose first objective lands in Rome, San Francisco and Berlin: one physical pickup per new city. */
const NEW_CITY_TRIALS: readonly LevelId[] = ['twin-capitals', 'bay-and-forum', 'wall-and-bay'];

for (const levelId of NEW_CITY_TRIALS) {
  test(`${levelId}: land in the first city, spawn and map match its definition, collect the first target`, async ({
    page,
  }) => {
    test.setTimeout(600_000);
    const errors = collectPageErrors(page);
    const [first, second] = level(levelId).objectives;
    if (!first || !second) throw new Error(`${levelId} must have two objectives`);
    const destination = city(first.cityId);

    await openFresh(page);
    await startLevel(page, levelId);
    const clock = hud(page);
    await flyTo(page, first.cityId);
    expect(await clock.penaltyMs()).toBe(ENTRY_PENALTY_MS);

    const svg = await openMap(page, first.cityId);
    await expect(searchCircles(svg)).toHaveCount(1);
    await expect(searchCircles(svg)).toHaveAttribute('r', String(first.broadRadius));
    const [x, z] = await readPlayerFromMap(svg);
    expect(Math.hypot(x - destination.spawn[0], z - destination.spawn[1]), 'player starts at the city spawn').toBeLessThan(
      0.5,
    );
    await closeMap(page, first.cityId);

    await walkToAndCollect(page, first);
    const after = await openMap(page, first.cityId);
    await expect(searchCircles(after), 'the remaining objective is in another city').toHaveCount(
      second.cityId === first.cityId ? 1 : 0,
    );
    await closeMap(page, first.cityId);
    await expect(page.locator('li', { hasText: second.title })).not.toHaveClass(/line-through/);
    expect(errors).toEqual([]);
  });
}
