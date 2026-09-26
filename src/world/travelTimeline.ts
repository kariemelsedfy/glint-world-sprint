/**
 * Pure travel timeline. Given elapsed (unpaused) milliseconds it reports the cover
 * opacity, the active stage and which token-carrying callback is due. No DOM, no React,
 * so the risky ordering rules are unit-testable. Owner: A2.
 */
import type { LocationId } from '@/shared/contracts';
import type { TravelStage } from '@/world/travelSignal';

export interface TimelineDurations {
  readonly coverMs: number;
  readonly holdMs: number;
  readonly revealMs: number;
}

export const ENTER_DURATIONS: TimelineDurations = { coverMs: 950, holdMs: 180, revealMs: 620 };
export const EXIT_DURATIONS: TimelineDurations = { coverMs: 480, holdMs: 80, revealMs: 520 };
export const REDUCED_DURATIONS: TimelineDurations = { coverMs: 0, holdMs: 40, revealMs: 120 };
export const TRAVEL_TIMEOUT_MS = 8000;

export function durationsFor(to: LocationId, reducedMotion: boolean): TimelineDurations {
  if (reducedMotion) return REDUCED_DURATIONS;
  return to === 'globe' ? EXIT_DURATIONS : ENTER_DURATIONS;
}

export type TimelineEvent = 'none' | 'covered' | 'complete' | 'failure';

export interface TimelineFrame {
  readonly stage: TravelStage;
  /** 0..1 progress through the current stage. */
  readonly progress: number;
  /** 0..1 screen cover opacity. */
  readonly cover: number;
  readonly event: TimelineEvent;
}

export interface TimelineInput {
  readonly elapsedMs: number;
  readonly destinationReady: boolean;
  readonly coveredFired: boolean;
  /** Unpaused ms at which the reveal started, or null while still holding. */
  readonly revealStartMs: number | null;
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function evaluateTimeline(input: TimelineInput, durations: TimelineDurations): TimelineFrame {
  const { elapsedMs, destinationReady, coveredFired, revealStartMs } = input;

  if (revealStartMs !== null) {
    const t = durations.revealMs <= 0 ? 1 : (elapsedMs - revealStartMs) / durations.revealMs;
    if (t >= 1) return { stage: 'reveal', progress: 1, cover: 0, event: 'complete' };
    return { stage: 'reveal', progress: t, cover: 1 - easeInOutCubic(t), event: 'none' };
  }

  if (!coveredFired) {
    const t = durations.coverMs <= 0 ? 1 : elapsedMs / durations.coverMs;
    if (t >= 1) return { stage: 'hold', progress: 0, cover: 1, event: 'covered' };
    return { stage: 'enter', progress: t, cover: easeInOutCubic(t), event: 'none' };
  }

  if (elapsedMs >= TRAVEL_TIMEOUT_MS) {
    return { stage: 'hold', progress: 1, cover: 1, event: 'failure' };
  }

  const holdEnd = durations.coverMs + durations.holdMs;
  const holdT = durations.holdMs <= 0 ? 1 : Math.min(1, (elapsedMs - durations.coverMs) / durations.holdMs);
  if (destinationReady && elapsedMs >= holdEnd) {
    return { stage: 'reveal', progress: 0, cover: 1, event: 'none' };
  }
  return { stage: 'hold', progress: holdT, cover: 1, event: 'none' };
}

/** True when the hold can end and the reveal should begin this frame. */
export function shouldStartReveal(input: TimelineInput, durations: TimelineDurations): boolean {
  return (
    input.coveredFired &&
    input.revealStartMs === null &&
    input.destinationReady &&
    input.elapsedMs >= durations.coverMs + durations.holdMs &&
    input.elapsedMs < TRAVEL_TIMEOUT_MS
  );
}
