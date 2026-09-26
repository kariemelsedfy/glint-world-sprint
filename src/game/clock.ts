/**
 * Run clock and visibility handling. Owner: A1.
 * Wall time is accumulated and flushed to the store in ~10 Hz chunks; the store refuses
 * ticks outside active globe/city phases, so the clock never decides what is scored.
 * The accumulated delta is never capped: hiding the tab pauses (practice) instead.
 */
import { useEffect } from 'react';
import { useRunStore } from '@/state/store';

export const TICK_MS = 100;

export interface ClockAccumulator {
  /** Feeds a wall-clock timestamp; returns the chunk to score, or 0 when under TICK_MS. */
  advance(now: number): number;
  /** Returns whatever is pending (even under TICK_MS) and clears it. */
  flush(): number;
  /** Forgets the previous timestamp so a gap (hidden tab, resume) is not charged. */
  rebase(now: number): void;
}

export function createClockAccumulator(start: number): ClockAccumulator {
  let last = start;
  let carried = 0;
  return {
    advance(now) {
      const elapsed = Math.max(0, now - last);
      last = now;
      carried += elapsed;
      if (carried < TICK_MS) return 0;
      const chunk = carried;
      carried = 0;
      return chunk;
    },
    flush() {
      const chunk = carried;
      carried = 0;
      return chunk;
    },
    rebase(now) {
      last = now;
      carried = 0;
    },
  };
}

let liveAccumulator: ClockAccumulator | null = null;

/** Scores any pending sub-tick time now, e.g. right before the final pickup freezes the result. */
export function flushRunClock(): void {
  if (liveAccumulator) tick(liveAccumulator.flush());
}

function tick(chunk: number): void {
  if (chunk <= 0) return;
  useRunStore.getState().dispatch({ type: 'TICK_ACTIVE', elapsedMs: chunk });
}

/**
 * Drives TICK_ACTIVE from requestAnimationFrame and flushes pending time before a
 * pause so the last partial chunk is never lost or double counted.
 */
export function useRunClock(): void {
  useEffect(() => {
    const accumulator = createClockAccumulator(performance.now());
    liveAccumulator = accumulator;
    let frame = 0;

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      tick(accumulator.advance(now));
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        tick(accumulator.flush());
      } else {
        accumulator.rebase(performance.now());
      }
    };
    const onBlur = () => tick(accumulator.flush());
    const onFocus = () => accumulator.rebase(performance.now());

    // Flush before the pause hooks below mark the run paused (listeners run in registration order).
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    frame = requestAnimationFrame(step);
    return () => {
      if (liveAccumulator === accumulator) liveAccumulator = null;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
}

/**
 * Hidden tab or lost window focus pauses the run, which the store marks as practice.
 * Register after useRunClock so the pending chunk is flushed first.
 */
export function usePauseOnHidden(): void {
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        useRunStore.getState().dispatch({ type: 'PAUSE', reason: 'hidden' });
      }
    };
    const onBlur = () => useRunStore.getState().dispatch({ type: 'PAUSE', reason: 'blur' });

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
