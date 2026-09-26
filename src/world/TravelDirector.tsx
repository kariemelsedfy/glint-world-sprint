/**
 * Travel director. Owner: A2.
 * Owns the full-screen cloud cover and the travel timeline. It reports only
 * token-carrying callbacks and never touches the store or the camera; the globe
 * reads `travelSignal` each frame to turn and dive toward the destination.
 */
import { useEffect, useRef } from 'react';
import type { TravelSpec } from '@/shared/contracts';
import { travelSignal, resetTravelSignal } from '@/world/travelSignal';
import {
  durationsFor,
  evaluateTimeline,
  shouldStartReveal,
  TRAVEL_TIMEOUT_MS,
} from '@/world/travelTimeline';

export { TRAVEL_TIMEOUT_MS };

export interface TravelDirectorProps {
  readonly travel: TravelSpec | null;
  readonly destinationReady: boolean;
  readonly paused: boolean;
  readonly reducedMotion: boolean;
  onCovered(runId: string, transitionId: string): void;
  onComplete(runId: string, transitionId: string): void;
  onFailure(runId: string, transitionId: string, message: string): void;
}

export const TRAVEL_FAILURE_MESSAGE = 'That flight could not land. Choose a destination again.';

interface TimelineState {
  transitionId: string;
  runId: string;
  accumulatedMs: number;
  segmentStart: number | null;
  coveredFired: boolean;
  revealStartMs: number | null;
  finished: boolean;
}

const CLOUD_LAYERS = [
  'radial-gradient(circle at 18% 28%, rgba(255,255,255,0.95) 0 14%, rgba(255,255,255,0) 32%)',
  'radial-gradient(circle at 62% 18%, rgba(255,255,255,0.9) 0 18%, rgba(255,255,255,0) 38%)',
  'radial-gradient(circle at 84% 62%, rgba(255,255,255,0.92) 0 16%, rgba(255,255,255,0) 34%)',
  'radial-gradient(circle at 36% 78%, rgba(255,255,255,0.9) 0 20%, rgba(255,255,255,0) 40%)',
  'radial-gradient(circle at 50% 50%, rgba(240,248,255,1) 0 30%, rgba(214,235,250,1) 100%)',
].join(',');

export function TravelDirector({
  travel,
  destinationReady,
  paused,
  reducedMotion,
  onCovered,
  onComplete,
  onFailure,
}: TravelDirectorProps) {
  const cover = useRef<HTMLDivElement>(null);
  const clouds = useRef<HTMLDivElement>(null);
  const timeline = useRef<TimelineState | null>(null);
  const latest = useRef({ destinationReady, paused, reducedMotion, onCovered, onComplete, onFailure });
  latest.current = { destinationReady, paused, reducedMotion, onCovered, onComplete, onFailure };

  useEffect(() => {
    const coverEl = cover.current;
    const cloudEl = clouds.current;
    if (!travel) {
      timeline.current = null;
      resetTravelSignal();
      if (coverEl) {
        coverEl.style.opacity = '0';
        coverEl.style.visibility = 'hidden';
      }
      return;
    }

    const { id, runId, from, to } = travel;
    const state: TimelineState = {
      transitionId: id,
      runId,
      accumulatedMs: 0,
      segmentStart: latest.current.paused ? null : performance.now(),
      coveredFired: false,
      revealStartMs: null,
      finished: false,
    };
    timeline.current = state;
    travelSignal.transitionId = id;
    travelSignal.from = from;
    travelSignal.to = to;
    travelSignal.stage = 'enter';
    travelSignal.progress = 0;
    travelSignal.cover = 0;
    if (coverEl) coverEl.style.visibility = 'visible';

    let frame = 0;
    const isCurrent = () => timeline.current === state && !state.finished;

    const step = () => {
      if (!isCurrent()) return;
      frame = requestAnimationFrame(step);
      const { paused: isPaused, destinationReady: ready, reducedMotion: reduced } = latest.current;
      const now = performance.now();

      if (isPaused) {
        if (state.segmentStart !== null) {
          state.accumulatedMs += now - state.segmentStart;
          state.segmentStart = null;
        }
        return;
      }
      if (state.segmentStart === null) state.segmentStart = now;

      const elapsedMs = state.accumulatedMs + (now - state.segmentStart);
      const durations = durationsFor(to, reduced);
      const input = {
        elapsedMs,
        destinationReady: ready,
        coveredFired: state.coveredFired,
        revealStartMs: state.revealStartMs,
      };

      if (shouldStartReveal(input, durations)) {
        state.revealStartMs = elapsedMs;
      }

      const result = evaluateTimeline({ ...input, revealStartMs: state.revealStartMs }, durations);

      travelSignal.stage = result.stage;
      travelSignal.progress = result.progress;
      travelSignal.cover = result.cover;
      if (coverEl) coverEl.style.opacity = result.cover.toFixed(3);
      if (cloudEl && !reduced) {
        const drift = result.stage === 'reveal' ? 1 + result.progress : result.stage === 'enter' ? result.progress : 1;
        cloudEl.style.transform = `translate3d(0, ${(-8 * drift).toFixed(2)}%, 0) scale(${(1.08 + drift * 0.12).toFixed(3)})`;
      }

      if (!isCurrent()) return;
      if (result.event === 'covered' && !state.coveredFired) {
        state.coveredFired = true;
        latest.current.onCovered(runId, id);
      } else if (result.event === 'complete') {
        state.finished = true;
        cancelAnimationFrame(frame);
        resetTravelSignal();
        latest.current.onComplete(runId, id);
      } else if (result.event === 'failure') {
        state.finished = true;
        cancelAnimationFrame(frame);
        resetTravelSignal();
        latest.current.onFailure(runId, id, TRAVEL_FAILURE_MESSAGE);
      }
    };

    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      state.finished = true;
    };
  }, [travel]);

  return (
    <div
      ref={cover}
      aria-hidden
      data-testid="travel-cover"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: 0, visibility: 'hidden', willChange: 'opacity' }}
    >
      <div
        ref={clouds}
        className="absolute inset-[-12%]"
        style={{ backgroundImage: CLOUD_LAYERS, willChange: 'transform' }}
      />
    </div>
  );
}
