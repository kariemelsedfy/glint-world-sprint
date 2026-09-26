import { describe, expect, it } from 'vitest';
import { CITY_HALF_EXTENT, PICKUP_RADIUS, PLAYER_RADIUS, PLAYER_SPEED } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';
import { getCity } from '@/cities';
import { buildCollisionWorld, moveCircle } from '@/game/collision';
import { TICK_MS, createClockAccumulator } from '@/game/clock';
import { absorbBlockedVelocity, createMotion, speedOf, stepMotion } from '@/game/movement';
import { MAX_FRAME_DT, SUBSTEP_DT, clampFrameDt, simulatePlayer } from '@/game/simulate';
import type { SimulationResult } from '@/game/simulate';
import { getMoveAxis, resetInput, setTouchAxis } from '@/game/input';
import { TARGETS } from '@/content/targets';
import { getTargetImage } from '@/assets/targetImages';

const HALF = CITY_HALF_EXTENT;
const R = PLAYER_RADIUS;

function cityWith(blockers: CityDefinition['blockers']): CityDefinition {
  return {
    ...getCity('paris'),
    blockers,
  };
}

describe('collision sliding', () => {
  const world = buildCollisionWorld(
    cityWith([
      { id: 'a', minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
      { id: 'b', minX: 20, maxX: 30, minZ: -10, maxZ: 10 },
    ]),
  );

  it('slides along a face when approaching a corner diagonally', () => {
    const [x, z] = moveCircle(world, -20, -20 + 4, 30, 0);
    expect(x).toBeCloseTo(10, 5);
    expect(z).toBeCloseTo(-16, 5);

    // Dead-on corner approach: one axis is stopped at the face, the other keeps sliding.
    const [cx, cz] = moveCircle(world, -14, -14, 6, 6);
    const stoppedX = cx <= -10 - R + 1e-6;
    const stoppedZ = cz <= -10 - R + 1e-6;
    expect(stoppedX || stoppedZ).toBe(true);
    expect(stoppedX ? cz : cx).toBeCloseTo(-8, 5);
  });

  it('passes through a gap wider than the player and blocks a narrower one', () => {
    const [x] = moveCircle(world, 15, -20, 0, 40);
    expect(x).toBe(15);
    const narrow = buildCollisionWorld(
      cityWith([
        { id: 'a', minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
        { id: 'b', minX: 10 + R * 1.5, maxX: 30, minZ: -10, maxZ: 10 },
      ]),
    );
    const [, nz] = moveCircle(narrow, 10 + R * 0.75, -20, 0, 40);
    expect(nz).toBeLessThanOrEqual(-10 - R + 1e-6);
  });

  it('keeps the player inside bounds inset by its radius on a max-speed diagonal', () => {
    const step = (PLAYER_SPEED / Math.SQRT2) * (1 / 60);
    let x = HALF - 3;
    let z = -(HALF - 3);
    for (let i = 0; i < 600; i += 1) {
      [x, z] = moveCircle(world, x, z, step, -step);
    }
    expect(x).toBe(HALF - R);
    expect(z).toBe(-(HALF - R));
  });

  it('never tunnels through a thin wall on a long fast diagonal', () => {
    const thin = buildCollisionWorld(cityWith([{ id: 'wall', minX: 0, maxX: 0.2, minZ: -40, maxZ: 40 }]));
    const [x] = moveCircle(thin, -5, -5, 60, 30);
    expect(x).toBeLessThanOrEqual(-R + 1e-6);
  });

  it('pushes a player that starts inside a solid back out', () => {
    const [x, z] = moveCircle(world, 9.5, 0, 0, 0);
    expect(x).toBeCloseTo(10 + R, 5);
    expect(z).toBe(0);
  });
});

describe('movement feel', () => {
  it('accelerates to top speed and decays to rest without overshoot', () => {
    const motion = createMotion();
    const dt = 1 / 60;
    let frames = 0;
    while (speedOf(motion) < PLAYER_SPEED * 0.95) {
      stepMotion(motion, 0, -1, dt);
      frames += 1;
      expect(speedOf(motion)).toBeLessThanOrEqual(PLAYER_SPEED + 1e-9);
    }
    expect(frames).toBeGreaterThan(3);
    expect(frames).toBeLessThan(40);

    for (let i = 0; i < 60; i += 1) stepMotion(motion, 0, 0, dt);
    expect(speedOf(motion)).toBe(0);
    expect(Math.abs(motion.headingRad)).toBeCloseTo(Math.PI, 1);
  });

  it('caps diagonal speed at PLAYER_SPEED and turns along the shortest arc', () => {
    const motion = createMotion();
    for (let i = 0; i < 120; i += 1) stepMotion(motion, Math.SQRT1_2, Math.SQRT1_2, 1 / 60);
    expect(speedOf(motion)).toBeCloseTo(PLAYER_SPEED, 3);

    const turning = createMotion(Math.PI * 0.9);
    stepMotion(turning, -0.01, -1, 1 / 60);
    expect(turning.headingRad).toBeGreaterThan(Math.PI * 0.9);
  });

  it('drops the velocity component a wall absorbed so the player rests against it', () => {
    const motion = createMotion();
    motion.vx = PLAYER_SPEED;
    motion.vz = 2;
    absorbBlockedVelocity(motion, PLAYER_SPEED / 60, 2 / 60, 0, 2 / 60);
    expect(motion.vx).toBe(0);
    expect(motion.vz).toBe(2);
  });
});

describe('input aggregation', () => {
  it('clamps, dead-zones and rescales the touch axis and never exceeds unit length', () => {
    resetInput();
    setTouchAxis(0.05, -0.05);
    expect(getMoveAxis()).toEqual([0, 0]);

    setTouchAxis(4, 4);
    const [x, z] = getMoveAxis();
    expect(Math.hypot(x, z)).toBeCloseTo(1, 6);

    setTouchAxis(Number.NaN, 0.5);
    const [nx, nz] = getMoveAxis();
    expect(nx).toBe(0);
    expect(nz).toBeGreaterThan(0.3);
    expect(nz).toBeLessThan(0.5);

    resetInput();
    expect(getMoveAxis()).toEqual([0, 0]);
  });
});

describe('run clock accumulator', () => {
  it('emits ~10 Hz chunks without capping the elapsed delta and flushes the remainder', () => {
    const clock = createClockAccumulator(0);
    expect(clock.advance(16)).toBe(0);
    expect(clock.advance(32)).toBe(0);
    expect(clock.advance(TICK_MS + 5)).toBe(TICK_MS + 5);
    expect(clock.advance(TICK_MS + 5 + 3000)).toBe(3000);
    expect(clock.advance(TICK_MS + 5 + 3040)).toBe(0);
    expect(clock.flush()).toBe(40);
    expect(clock.flush()).toBe(0);
  });

  it('rebases after a hidden gap so resumed play is not charged for it', () => {
    const clock = createClockAccumulator(0);
    clock.advance(50);
    clock.rebase(10_000);
    expect(clock.advance(10_050)).toBe(0);
    expect(clock.advance(10_100)).toBe(100);
  });
});

describe('target image registry', () => {
  it('has a distinct local picture and alt text for every target', () => {
    const seen = new Set<string>();
    for (const target of TARGETS) {
      const image = getTargetImage(target.id);
      expect(image.url, target.id).toMatch(/^data:image\/svg\+xml|\.svg$/);
      expect(image.alt.trim().length, target.id).toBeGreaterThan(8);
      expect(seen.has(image.url), `${target.id} shares artwork`).toBe(false);
      seen.add(image.url);
    }
  });
});

describe('frame-rate independent simulation', () => {
  const emptyWorld = buildCollisionWorld(cityWith([]));
  const fresh = (): SimulationResult => ({ pickup: -1, intendedDx: 0, intendedDz: 0, actualDx: 0, actualDz: 0 });

  function run(frameDt: number, seconds: number, pickups: Array<{ position: [number, number, number] }> = []) {
    const motion = createMotion();
    const pos = { x: 0, z: 0 };
    const out = fresh();
    let elapsed = 0;
    let frames = 0;
    while (elapsed < seconds - 1e-9) {
      const dt = Math.min(frameDt, seconds - elapsed);
      simulatePlayer(emptyWorld, motion, pos, 0, 1, dt, pickups, out);
      elapsed += dt;
      frames += 1;
      if (out.pickup >= 0) break;
    }
    return { pos, out, frames };
  }

  it('covers the same ground at 1.7 fps as at 60 fps', () => {
    const smooth = run(1 / 60, 3);
    const choppy = run(0.588, 3);
    expect(choppy.pos.z).toBeCloseTo(smooth.pos.z, 3);
    expect(smooth.pos.z).toBeGreaterThan(PLAYER_SPEED * 2.5);
  });

  it('clamps absurd deltas instead of teleporting', () => {
    expect(clampFrameDt(Number.NaN)).toBe(0);
    expect(clampFrameDt(-1)).toBe(0);
    expect(clampFrameDt(30)).toBe(MAX_FRAME_DT);
    expect(SUBSTEP_DT * PLAYER_SPEED).toBeLessThan(PICKUP_RADIUS);
  });

  it('collects a pickup lying inside a single long frame instead of stepping over it', () => {
    // At 11 u/s, a 1 s frame spans 11 units: far more than the 4-unit pickup diameter.
    const pickups = [{ position: [0, 0, 3] as [number, number, number] }];
    const motion = createMotion();
    motion.vz = PLAYER_SPEED;
    const pos = { x: 0, z: 0 };
    const out = simulatePlayer(emptyWorld, motion, pos, 0, 1, MAX_FRAME_DT, pickups, fresh());
    expect(out.pickup).toBe(0);
    expect(Math.hypot(pos.x, pos.z - 3)).toBeLessThanOrEqual(PICKUP_RADIUS);
    expect(pos.z).toBeLessThan(3 + PICKUP_RADIUS);
  });

  it('stops before a wall at 1.7 fps', () => {
    const world = buildCollisionWorld(cityWith([{ id: 'slab', minX: -5, maxX: 5, minZ: 6, maxZ: 8 }]));
    const motion = createMotion();
    const pos = { x: 0, z: 0 };
    const out = fresh();
    for (let i = 0; i < 6; i += 1) simulatePlayer(world, motion, pos, 0, 1, 0.588, [], out);
    expect(pos.z).toBeLessThanOrEqual(6 - R + 1e-6);
    expect(pos.z).toBeGreaterThan(4);
  });
});
