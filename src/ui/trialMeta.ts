/**
 * UI-only presentation metadata for trials (ticket art, difficulty copy). Owner: A5.
 * Deliberately says nothing about which cities a trial visits — the player must identify them.
 * Object counts come from the content registry; bests come from the view model when present.
 */
import type { LevelId } from '@/shared/contracts';
import { LEVELS } from '@/content';

export type TicketArt = 'sun' | 'moon' | 'stars' | 'flags' | 'waves' | 'bricks';

export interface TrialMeta {
  readonly difficulty: 'Easy' | 'Medium' | 'Hard';
  readonly duration: string;
  readonly art: TicketArt;
  readonly accent: string;
}

const META: Readonly<Record<LevelId, TrialMeta>> = {
  icons: { difficulty: 'Easy', duration: '~2 min', art: 'sun', accent: '#ffd963' },
  'sky-sun': { difficulty: 'Easy', duration: '~2 min', art: 'moon', accent: '#22c4ea' },
  'small-wonders': { difficulty: 'Medium', duration: '~2 min', art: 'stars', accent: '#f43fab' },
  'twin-capitals': { difficulty: 'Medium', duration: '~3 min', art: 'flags', accent: '#b6a1e8' },
  'bay-and-forum': { difficulty: 'Hard', duration: '~3 min', art: 'waves', accent: '#22c4ea' },
  'wall-and-bay': { difficulty: 'Hard', duration: '~3 min', art: 'bricks', accent: '#7146c5' },
};

export function trialMeta(id: LevelId): TrialMeta {
  return META[id];
}

export function trialObjectCount(id: LevelId): number {
  return LEVELS.find((level) => level.id === id)?.targetIds.length ?? 0;
}

/** Optional per-level best the model may carry in future; read structurally so the UI compiles either way. */
export interface LevelBest {
  readonly bestMs: number | null;
  readonly medal: 'gold' | 'silver' | 'bronze' | 'complete' | null;
}

export function readLevelBest(level: unknown): LevelBest {
  if (typeof level !== 'object' || level === null) return { bestMs: null, medal: null };
  const record = level as { bestMs?: unknown; medal?: unknown };
  const bestMs = typeof record.bestMs === 'number' ? record.bestMs : null;
  const medal =
    record.medal === 'gold' || record.medal === 'silver' || record.medal === 'bronze' || record.medal === 'complete'
      ? record.medal
      : null;
  return { bestMs, medal };
}
