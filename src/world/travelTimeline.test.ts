import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  ENTER_DURATIONS,
  EXIT_DURATIONS,
  REDUCED_DURATIONS,
  TRAVEL_TIMEOUT_MS,
  durationsFor,
  evaluateTimeline,
  flightReadout,
  shouldStartReveal,
} from '@/world/travelTimeline';
import { facingRotation, latLonToVec3, markerFacing } from '@/world/GlobeScene';

const base = { destinationReady: true, coveredFired: false, revealStartMs: null };

describe('travel timeline', () => {
  it('ramps the cover to fully opaque before requesting the swap', () => {
    const mid = evaluateTimeline({ ...base, elapsedMs: ENTER_DURATIONS.coverMs / 2 }, ENTER_DURATIONS);
    expect(mid.stage).toBe('enter');
    expect(mid.event).toBe('none');
    expect(mid.cover).toBeGreaterThan(0.3);
    expect(mid.cover).toBeLessThan(0.7);

    const covered = evaluateTimeline({ ...base, elapsedMs: ENTER_DURATIONS.coverMs }, ENTER_DURATIONS);
    expect(covered.cover).toBe(1);
    expect(covered.event).toBe('covered');
  });

  it('holds the cover while the destination is not ready and never completes', () => {
    const holding = evaluateTimeline(
      { elapsedMs: 3000, destinationReady: false, coveredFired: true, revealStartMs: null },
      ENTER_DURATIONS,
    );
    expect(holding.stage).toBe('hold');
    expect(holding.cover).toBe(1);
    expect(holding.event).toBe('none');
    expect(
      shouldStartReveal({ elapsedMs: 3000, destinationReady: false, coveredFired: true, revealStartMs: null }, ENTER_DURATIONS),
    ).toBe(false);
  });

  it('fails after the 8s timeout only once covered and still holding', () => {
    const failed = evaluateTimeline(
      { elapsedMs: TRAVEL_TIMEOUT_MS, destinationReady: false, coveredFired: true, revealStartMs: null },
      ENTER_DURATIONS,
    );
    expect(failed.event).toBe('failure');
    const revealing = evaluateTimeline(
      { elapsedMs: TRAVEL_TIMEOUT_MS + 10, destinationReady: true, coveredFired: true, revealStartMs: TRAVEL_TIMEOUT_MS - 100 },
      ENTER_DURATIONS,
    );
    expect(revealing.event).toBe('none');
    expect(revealing.stage).toBe('reveal');
  });

  it('reveals then completes once the hold has elapsed and the destination is ready', () => {
    const holdEnd = ENTER_DURATIONS.coverMs + ENTER_DURATIONS.holdMs;
    const input = { elapsedMs: holdEnd, destinationReady: true, coveredFired: true, revealStartMs: null };
    expect(shouldStartReveal(input, ENTER_DURATIONS)).toBe(true);

    const halfway = evaluateTimeline({ ...input, elapsedMs: holdEnd + ENTER_DURATIONS.revealMs / 2, revealStartMs: holdEnd }, ENTER_DURATIONS);
    expect(halfway.stage).toBe('reveal');
    expect(halfway.cover).toBeLessThan(1);
    expect(halfway.event).toBe('none');

    const done = evaluateTimeline({ ...input, elapsedMs: holdEnd + ENTER_DURATIONS.revealMs, revealStartMs: holdEnd }, ENTER_DURATIONS);
    expect(done.cover).toBe(0);
    expect(done.event).toBe('complete');
  });

  it('cuts instantly under reduced motion and keeps the exit shorter than the entry', () => {
    expect(durationsFor('paris', true)).toBe(REDUCED_DURATIONS);
    expect(durationsFor('globe', false)).toBe(EXIT_DURATIONS);
    const instant = evaluateTimeline({ ...base, elapsedMs: 0 }, REDUCED_DURATIONS);
    expect(instant.cover).toBe(1);
    expect(instant.event).toBe('covered');
    const exitTotal = EXIT_DURATIONS.coverMs + EXIT_DURATIONS.holdMs + EXIT_DURATIONS.revealMs;
    const enterTotal = ENTER_DURATIONS.coverMs + ENTER_DURATIONS.holdMs + ENTER_DURATIONS.revealMs;
    expect(exitTotal).toBeLessThan(enterTotal);
    expect(enterTotal).toBeLessThan(2000);
  });
});

describe('globe math', () => {
  it('turns a city to face the camera direction', () => {
    const elevation = Math.atan2(8, 30);
    const paris = { lat: 48.86, lon: 2.35 };
    const { tilt, spin } = facingRotation(paris.lat, paris.lon, elevation);
    const anchor = new Vector3(...latLonToVec3(paris.lat, paris.lon, 10));
    anchor.applyAxisAngle(new Vector3(0, 1, 0), spin).applyAxisAngle(new Vector3(1, 0, 0), tilt);
    expect(markerFacing(anchor, new Vector3(0, 8, 30))).toBeCloseTo(1, 4);
  });

  it('hides markers on the far hemisphere', () => {
    const camera = new Vector3(0, 8, 30);
    expect(markerFacing(new Vector3(0, 0, 10), camera)).toBeGreaterThan(0.9);
    expect(markerFacing(new Vector3(0, 0, -10), camera)).toBeLessThan(0);
  });
});

describe('flight readout', () => {
  it('advances monotonically through takeoff, cruise and landing', () => {
    const takeoff = flightReadout({ stage: 'enter', progress: 0.5, cover: 0.5, event: 'none' }, true);
    const cruise = flightReadout({ stage: 'hold', progress: 0.5, cover: 1, event: 'none' }, true);
    const landing = flightReadout({ stage: 'reveal', progress: 0.5, cover: 0.5, event: 'none' }, true);
    expect(takeoff.beat).toBe('takeoff');
    expect(cruise.beat).toBe('cruise');
    expect(landing.beat).toBe('landing');
    expect(takeoff.progress).toBeLessThan(cruise.progress);
    expect(cruise.progress).toBeLessThan(landing.progress);
    expect(flightReadout({ stage: 'reveal', progress: 1, cover: 0, event: 'complete' }, true).progress).toBe(1);
  });

  it('parks honestly while the destination is not ready instead of inventing progress', () => {
    const waiting = flightReadout({ stage: 'hold', progress: 1, cover: 1, event: 'none' }, false);
    expect(waiting.beat).toBe('waiting');
    expect(waiting.progress).toBe(0.6);
    expect(flightReadout({ stage: 'hold', progress: 1, cover: 1, event: 'none' }, true).progress).toBe(0.6);
  });
});
