/**
 * BOOTSTRAP run clock created by A0. Owner after CONTRACT_READY: A1.
 * Monotonic wall time accumulated only during active globe/city phases.
 */
import { useEffect } from 'react';
import { useRunStore } from '@/state/store';

const TICK_MS = 100;

export function useRunClock(): void {
  useEffect(() => {
    let last = performance.now();
    let carried = 0;
    let frame = 0;

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const elapsed = now - last;
      last = now;
      // Ignore a long background gap; the store also refuses inactive phases.
      carried += Math.min(elapsed, 250);
      if (carried < TICK_MS) return;
      const chunk = carried;
      carried = 0;
      useRunStore.getState().dispatch({ type: 'TICK_ACTIVE', elapsedMs: chunk });
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);
}

export function usePauseOnHidden(): void {
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        useRunStore.getState().dispatch({ type: 'PAUSE', reason: 'hidden' });
      }
    };
    // Bootstrap pauses on hidden only; A1 decides whether plain window blur also pauses.
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, []);
}
