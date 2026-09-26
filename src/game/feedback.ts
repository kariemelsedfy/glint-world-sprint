/**
 * Frame-loop pickup feedback channel. Owner: A1.
 * The controller records a pickup; visuals read it in their own frame callbacks.
 * Mutable module state, never React state, so nothing re-renders per frame.
 */
export interface PickupPulse {
  /** Scene clock seconds of the last pickup, or -Infinity. */
  at: number;
  x: number;
  z: number;
}

export const pickupPulse: PickupPulse = { at: -Infinity, x: 0, z: 0 };

export const PICKUP_PULSE_SECONDS = 0.55;

export function markPickup(at: number, x: number, z: number): void {
  pickupPulse.at = at;
  pickupPulse.x = x;
  pickupPulse.z = z;
}

/** 1 at the pickup instant, decaying to 0 at PICKUP_PULSE_SECONDS. */
export function pickupPulseStrength(now: number): number {
  const age = now - pickupPulse.at;
  if (age < 0 || age >= PICKUP_PULSE_SECONDS) return 0;
  return 1 - age / PICKUP_PULSE_SECONDS;
}
