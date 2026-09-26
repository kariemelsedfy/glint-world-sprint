/**
 * BOOTSTRAP travel timeline created by A0. Owner after CONTRACT_READY: A2.
 * Renderless: it only reports token-carrying callbacks. It never touches the store.
 */
import { useEffect, useRef } from 'react';
import type { TravelSpec } from '@/shared/contracts';

export const COVER_MS = 800;
export const ARRIVE_MS = 1600;
export const REDUCED_COVER_MS = 120;
export const REDUCED_ARRIVE_MS = 200;
export const TRAVEL_TIMEOUT_MS = 8000;

export interface TravelDirectorProps {
  readonly travel: TravelSpec | null;
  readonly destinationReady: boolean;
  readonly paused: boolean;
  readonly reducedMotion: boolean;
  onCovered(runId: string, transitionId: string): void;
  onComplete(runId: string, transitionId: string): void;
  onFailure(runId: string, transitionId: string, message: string): void;
}

export function TravelDirector({
  travel,
  destinationReady,
  paused,
  reducedMotion,
  onCovered,
  onComplete,
  onFailure,
}: TravelDirectorProps) {
  const covered = useRef(false);
  const startedAt = useRef(0);

  useEffect(() => {
    covered.current = false;
    startedAt.current = performance.now();
  }, [travel?.id]);

  useEffect(() => {
    if (!travel || paused) return;
    const coverMs = reducedMotion ? REDUCED_COVER_MS : COVER_MS;
    const arriveMs = reducedMotion ? REDUCED_ARRIVE_MS : ARRIVE_MS;
    const { id, runId } = travel;
    let frame = 0;

    const step = () => {
      frame = requestAnimationFrame(step);
      const elapsed = performance.now() - startedAt.current;
      if (!covered.current && elapsed >= coverMs) {
        covered.current = true;
        onCovered(runId, id);
      }
      if (covered.current && destinationReady && elapsed >= arriveMs) {
        cancelAnimationFrame(frame);
        onComplete(runId, id);
        return;
      }
      if (elapsed >= TRAVEL_TIMEOUT_MS) {
        cancelAnimationFrame(frame);
        onFailure(runId, id, 'That flight could not land. Choose a destination again.');
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [travel, destinationReady, paused, reducedMotion, onCovered, onComplete, onFailure]);

  return null;
}
