/**
 * Travel director. Owner: A2.
 * Owns the full-screen cloud cover and the travel timeline. It reports only
 * token-carrying callbacks and never touches the store or the camera; the globe
 * reads `travelSignal` each frame to turn and dive toward the destination.
 */
import { useEffect, useRef } from 'react';
import type { LocationId, TravelSpec } from '@/shared/contracts';
import { getCity } from '@/cities';
import { travelSignal, resetTravelSignal } from '@/world/travelSignal';
import {
  durationsFor,
  evaluateTimeline,
  flightReadout,
  shouldStartReveal,
  TRAVEL_TIMEOUT_MS,
} from '@/world/travelTimeline';
import type { FlightBeat } from '@/world/travelTimeline';

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

const INK = '#211333';
const CREAM = '#fff5e9';
const LAVENDER = '#b6a1e8';
const PURPLE = '#7146c5';
const YELLOW = '#ffd963';
const CYAN = '#22c4ea';

// Cream cloud puffs over a lavender→purple sky; the cover is opaque at the end of takeoff.
const CLOUD_LAYERS = [
  'radial-gradient(circle at 18% 28%, rgba(255,245,233,0.98) 0 14%, rgba(255,245,233,0) 32%)',
  'radial-gradient(circle at 62% 18%, rgba(255,245,233,0.94) 0 18%, rgba(255,245,233,0) 38%)',
  'radial-gradient(circle at 84% 62%, rgba(255,245,233,0.96) 0 16%, rgba(255,245,233,0) 34%)',
  'radial-gradient(circle at 36% 78%, rgba(255,245,233,0.94) 0 20%, rgba(255,245,233,0) 40%)',
  `linear-gradient(180deg, ${LAVENDER} 0%, ${PURPLE} 100%)`,
].join(',');

const BEAT_LABEL: Record<FlightBeat, string> = {
  takeoff: 'Takeoff',
  cruise: 'In flight',
  waiting: 'Preparing landing…',
  landing: 'Landing',
};

function destinationName(to: LocationId): string {
  return to === 'globe' ? 'Orbit' : getCity(to).label;
}

function destinationAccent(to: LocationId): string {
  return to === 'globe' ? CYAN : getCity(to).accentColor;
}

// Arc geometry for the flight path (SVG viewBox 0 0 200 80).
const ARC_START: readonly [number, number] = [14, 66];
const ARC_CONTROL: readonly [number, number] = [100, -30];
const ARC_END: readonly [number, number] = [186, 66];
const ARC_PATH = `M ${ARC_START[0]} ${ARC_START[1]} Q ${ARC_CONTROL[0]} ${ARC_CONTROL[1]} ${ARC_END[0]} ${ARC_END[1]}`;

function arcPoint(t: number): [number, number] {
  const u = 1 - t;
  return [
    u * u * ARC_START[0] + 2 * u * t * ARC_CONTROL[0] + t * t * ARC_END[0],
    u * u * ARC_START[1] + 2 * u * t * ARC_CONTROL[1] + t * t * ARC_END[1],
  ];
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
  const cover = useRef<HTMLDivElement>(null);
  const clouds = useRef<HTMLDivElement>(null);
  const ticket = useRef<HTMLDivElement>(null);
  const beatEl = useRef<HTMLDivElement>(null);
  const nameEl = useRef<HTMLDivElement>(null);
  const routeEl = useRef<HTMLDivElement>(null);
  const barEl = useRef<HTMLDivElement>(null);
  const planeEl = useRef<SVGGElement>(null);
  const lastBeat = useRef<FlightBeat | null>(null);
  const timeline = useRef<TimelineState | null>(null);
  const latest = useRef({ destinationReady, paused, reducedMotion, onCovered, onComplete, onFailure });
  latest.current = { destinationReady, paused, reducedMotion, onCovered, onComplete, onFailure };

  useEffect(() => {
    const coverEl = cover.current;
    const cloudEl = clouds.current;
    const ticketEl = ticket.current;
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
    if (nameEl.current) nameEl.current.textContent = destinationName(to);
    if (routeEl.current) routeEl.current.textContent = `${destinationName(from)} → ${destinationName(to)}`;
    if (ticketEl) ticketEl.style.setProperty('--accent', destinationAccent(to));
    lastBeat.current = null;

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

      const readout = flightReadout(result, ready);
      if (ticketEl) {
        // Ticket pops in once the clouds mostly cover the scene and pops out as they clear.
        // Under reduced motion the whole travel is a ~160 ms cut, so the ticket would only flash: skip it.
        const pop = reduced ? 0 : Math.min(1, Math.max(0, (result.cover - 0.55) / 0.35));
        ticketEl.style.opacity = pop.toFixed(3);
        ticketEl.style.transform = `translateY(${((1 - pop) * 14).toFixed(1)}px) scale(${(0.96 + pop * 0.04).toFixed(3)})`;
      }
      if (barEl.current) barEl.current.style.transform = `scaleX(${readout.progress.toFixed(3)})`;
      if (planeEl.current) {
        const [x, y] = arcPoint(readout.progress);
        const [ax, ay] = arcPoint(Math.min(1, readout.progress + 0.02));
        const angle = (Math.atan2(ay - y, ax - x) * 180) / Math.PI;
        planeEl.current.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
      }
      if (beatEl.current && readout.beat !== lastBeat.current) {
        lastBeat.current = readout.beat;
        beatEl.current.textContent = BEAT_LABEL[readout.beat];
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
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={ticket}
          data-testid="travel-ticket"
          style={{
            opacity: 0,
            width: 'min(420px, 92vw)',
            background: CREAM,
            color: INK,
            border: `3px solid ${INK}`,
            borderRadius: 12,
            boxShadow: `0 7px 0 ${INK}`,
            padding: '14px 18px 16px',
            font: '700 13px/1.2 system-ui, sans-serif',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            willChange: 'transform, opacity',
          }}
        >
          <div className="flex items-center justify-between">
            <div ref={beatEl} style={{ color: PURPLE }}>
              Takeoff
            </div>
            <div ref={routeEl} style={{ color: INK, opacity: 0.6, fontSize: 11 }} />
          </div>
          <div
            ref={nameEl}
            style={{
              font: '900 clamp(28px, 6vw, 40px)/1 system-ui, sans-serif',
              letterSpacing: '0.02em',
              margin: '8px 0 6px',
              textShadow: `3px 3px 0 var(--accent, ${YELLOW})`,
            }}
          />
          <svg viewBox="0 0 200 80" width="100%" aria-hidden style={{ display: 'block', height: 'auto', overflow: 'visible' }}>
            <path d={ARC_PATH} fill="none" stroke={INK} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" opacity={0.35} />
            <circle cx={ARC_START[0]} cy={ARC_START[1]} r={6} fill={LAVENDER} stroke={INK} strokeWidth={3} />
            <circle cx={ARC_END[0]} cy={ARC_END[1]} r={7} fill={`var(--accent, ${YELLOW})`} stroke={INK} strokeWidth={3} />
            <g ref={planeEl} transform={`translate(${ARC_START[0]} ${ARC_START[1]})`}>
              <path d="M -11 0 L 5 -5 L 11 0 L 5 5 Z M -4 0 L -9 7 M -4 0 L -9 -7" fill={CREAM} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            </g>
          </svg>
          <div
            role="progressbar"
            aria-label="Flight progress"
            style={{ height: 12, border: `3px solid ${INK}`, borderRadius: 6, background: CREAM, overflow: 'hidden' }}
          >
            <div
              ref={barEl}
              style={{
                height: '100%',
                background: `var(--accent, ${YELLOW})`,
                transform: 'scaleX(0)',
                transformOrigin: 'left center',
                willChange: 'transform',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
