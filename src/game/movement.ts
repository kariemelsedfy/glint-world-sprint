/**
 * Pure explorer kinematics. Owner: A1.
 * Velocity eases toward the input direction, heading turns along the shortest arc,
 * and the walk phase drives the visual bob. No React, no Three.js, no store access.
 */
import { PLAYER_SPEED } from '@/shared/contracts';

export interface Motion {
  vx: number;
  vz: number;
  headingRad: number;
  /** Radians of walk cycle; advances with ground speed. */
  walkPhase: number;
}

/** Per-second response rates for the exponential velocity blend. */
export const ACCEL_RATE = 14;
export const DECEL_RATE = 18;
export const TURN_RATE = 16;
const REST_SPEED = 0.05;
const FACE_SPEED = 0.6;
const STRIDE_RATE = 1.25;

export function createMotion(headingRad = 0): Motion {
  return { vx: 0, vz: 0, headingRad, walkPhase: 0 };
}

export function resetMotion(motion: Motion, headingRad = motion.headingRad): void {
  motion.vx = 0;
  motion.vz = 0;
  motion.headingRad = headingRad;
  motion.walkPhase = 0;
}

export function wrapAngle(rad: number): number {
  let a = rad % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function speedOf(motion: Motion): number {
  return Math.hypot(motion.vx, motion.vz);
}

/** Eases velocity toward `axis * PLAYER_SPEED` and turns to face travel direction. */
export function stepMotion(motion: Motion, axisX: number, axisZ: number, dt: number): void {
  const moving = axisX !== 0 || axisZ !== 0;
  const blend = 1 - Math.exp(-(moving ? ACCEL_RATE : DECEL_RATE) * dt);
  motion.vx += (axisX * PLAYER_SPEED - motion.vx) * blend;
  motion.vz += (axisZ * PLAYER_SPEED - motion.vz) * blend;

  const speed = speedOf(motion);
  if (!moving && speed < REST_SPEED) {
    motion.vx = 0;
    motion.vz = 0;
  }

  if (moving || speed > FACE_SPEED) {
    const target = moving ? Math.atan2(axisX, axisZ) : Math.atan2(motion.vx, motion.vz);
    const turn = 1 - Math.exp(-TURN_RATE * dt);
    motion.headingRad = wrapAngle(motion.headingRad + wrapAngle(target - motion.headingRad) * turn);
  }

  motion.walkPhase += speed * STRIDE_RATE * dt;
  if (motion.walkPhase > Math.PI * 200) motion.walkPhase -= Math.PI * 200;
}

/**
 * After collision resolution, drop the velocity component the wall absorbed so the
 * explorer settles against it instead of vibrating at full speed.
 */
export function absorbBlockedVelocity(
  motion: Motion,
  intendedDx: number,
  intendedDz: number,
  actualDx: number,
  actualDz: number,
): void {
  if (Math.abs(intendedDx) > 1e-6 && Math.abs(actualDx) < Math.abs(intendedDx) * 0.5) motion.vx = 0;
  if (Math.abs(intendedDz) > 1e-6 && Math.abs(actualDz) < Math.abs(intendedDz) * 0.5) motion.vz = 0;
}
