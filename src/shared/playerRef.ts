/**
 * Frame-rate bridge between the player controller (A1) and the single camera
 * authority (A0). Mutated in the render loop; never a React state update.
 */
export interface PlayerTransform {
  x: number;
  y: number;
  z: number;
  headingRad: number;
}

export const playerTransform: PlayerTransform = { x: 0, y: 0, z: 0, headingRad: 0 };

export function resetPlayerTransform(x: number, y: number, z: number): void {
  playerTransform.x = x;
  playerTransform.y = y;
  playerTransform.z = z;
  playerTransform.headingRad = 0;
}
