/**
 * STUB content created by A0 for bootstrap. Owner after CONTRACT_READY: A6.
 * Seeds, medals and pairings from docs/CONTENT_AND_LEVELS.md.
 */
import type { LevelDefinition, LevelId } from '@/shared/contracts';

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: 'icons',
    title: 'Icons',
    version: 1,
    seed: 2026092601,
    targetIds: ['paris-smile', 'giza-crown'],
    medalSeconds: { gold: 90, silver: 135, bronze: 210 },
  },
  {
    id: 'sky-sun',
    title: 'Sky & Sun',
    version: 1,
    seed: 2026092602,
    targetIds: ['paris-iron', 'giza-guardian'],
    medalSeconds: { gold: 90, silver: 135, bronze: 210 },
  },
  {
    id: 'small-wonders',
    title: 'Small Wonders',
    version: 1,
    seed: 2026092603,
    targetIds: ['paris-crescent', 'giza-beetle'],
    medalSeconds: { gold: 90, silver: 135, bronze: 210 },
  },
  {
    id: 'twin-capitals',
    title: 'Twin Capitals',
    version: 1,
    seed: 2026092604,
    targetIds: ['rome-arena', 'berlin-gate'],
    medalSeconds: { gold: 90, silver: 135, bronze: 210 },
  },
  {
    id: 'bay-and-forum',
    title: 'Bay & Forum',
    version: 1,
    seed: 2026092605,
    targetIds: ['sf-bridge', 'rome-laurel'],
    medalSeconds: { gold: 90, silver: 135, bronze: 210 },
  },
  {
    id: 'wall-and-bay',
    title: 'Wall & Bay',
    version: 1,
    seed: 2026092606,
    targetIds: ['berlin-tower', 'sf-cable-car'],
    medalSeconds: { gold: 90, silver: 135, bronze: 210 },
  },
];

export const DEFAULT_LEVEL_ID: LevelId = 'icons';

export function getLevel(id: LevelId): LevelDefinition {
  const level = LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(`Unknown level ${id}`);
  return level;
}
