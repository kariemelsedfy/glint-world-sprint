/**
 * Frame-rate independent player integration. Owner: A1.
 * A rendered frame may be long (slow GPU, hitch); the elapsed time is integrated in fixed
 * substeps so speed in wall-clock terms stays constant and nothing steps through a wall
 * or a pickup sphere. Pure: no React, no Three.js, no store access.
 */
import { PICKUP_RADIUS } from '@/shared/contracts';
import type { CollisionWorld } from '@/game/collision';
import { moveCircle } from '@/game/collision';
import type { Motion } from '@/game/movement';
import { stepMotion } from '@/game/movement';

/** Longest frame simulated in full (covers ~1 fps); longer gaps are a hidden tab, which the clock/pause handle. */
export const MAX_FRAME_DT = 1;
/** Fixed integration step (60 Hz). Per-substep travel is far below PICKUP_RADIUS. */
export const SUBSTEP_DT = 1 / 60;
const PICKUP_RADIUS_SQ = PICKUP_RADIUS * PICKUP_RADIUS;

export interface PlayerPosition {
  x: number;
  z: number;
}

export interface PickupPoint {
  readonly position: readonly [number, number, number];
}

export interface SimulationResult {
  /** Index into `pickups` of the first sphere entered along the path, or -1. */
  pickup: number;
  /** Set when a substep was blocked by a solid (velocity was absorbed). */
  intendedDx: number;
  intendedDz: number;
  actualDx: number;
  actualDz: number;
}

export function clampFrameDt(rawDelta: number): number {
  if (!Number.isFinite(rawDelta)) return 0;
  return Math.min(Math.max(rawDelta, 0), MAX_FRAME_DT);
}

function pickupAt(pickups: readonly PickupPoint[], x: number, z: number): number {
  for (let i = 0; i < pickups.length; i += 1) {
    const dx = pickups[i]!.position[0] - x;
    const dz = pickups[i]!.position[2] - z;
    if (dx * dx + dz * dz <= PICKUP_RADIUS_SQ) return i;
  }
  return -1;
}

/**
 * Advances `motion` and `pos` by `dt` seconds of input, sliding against `world`.
 * Stops at the first substep that lands inside a pickup so collection happens at the
 * same spot regardless of frame length.
 */
export function simulatePlayer(
  world: CollisionWorld,
  motion: Motion,
  pos: PlayerPosition,
  axisX: number,
  axisZ: number,
  dt: number,
  pickups: readonly PickupPoint[],
  out: SimulationResult,
): SimulationResult {
  out.pickup = -1;
  out.intendedDx = out.intendedDz = out.actualDx = out.actualDz = 0;

  let remaining = clampFrameDt(dt);
  const startX = pos.x;
  const startZ = pos.z;
  while (remaining > 0) {
    const step = Math.min(remaining, SUBSTEP_DT);
    remaining -= step;
    stepMotion(motion, axisX, axisZ, step);
    if (motion.vx !== 0 || motion.vz !== 0) {
      const dx = motion.vx * step;
      const dz = motion.vz * step;
      const [x, z] = moveCircle(world, pos.x, pos.z, dx, dz);
      out.intendedDx += dx;
      out.intendedDz += dz;
      pos.x = x;
      pos.z = z;
    }
    const hit = pickupAt(pickups, pos.x, pos.z);
    if (hit >= 0) {
      out.pickup = hit;
      break;
    }
  }
  out.actualDx = pos.x - startX;
  out.actualDz = pos.z - startZ;
  return out;
}
