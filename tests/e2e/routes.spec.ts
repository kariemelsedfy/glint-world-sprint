import { expect, test } from '@playwright/test';
import { oracle, runSupportScript } from './support/game';

interface SimulatedWalk {
  readonly levelId: string;
  readonly cityId: string;
  readonly targetId: string;
  readonly reached: boolean;
  readonly seconds: number;
  readonly end: readonly [number, number];
  readonly target: readonly [number, number];
}

test('the e2e route planner reaches every objective of every trial under the game collision model', () => {
  const walks = JSON.parse(runSupportScript('simulate-routes.ts')) as SimulatedWalk[];
  const expected = oracle().levels.reduce((sum, level) => sum + level.objectives.length, 0);
  expect(walks).toHaveLength(expected);
  expect(new Set(walks.map((walk) => walk.cityId)), 'every registered city is walked').toEqual(
    new Set(oracle().cities.map((city) => city.id)),
  );
  const stuck = walks.filter((walk) => !walk.reached);
  expect(stuck, 'objectives the walker cannot reach from spawn').toEqual([]);
});
