/**
 * Kinematic circle-vs-AABB movement. Owner: A1.
 * Axis-resolved sliding against blockers expanded by the player radius; no physics engine.
 * Substeps are bounded by half the radius so a maximum-speed diagonal cannot tunnel.
 */
import { PLAYER_RADIUS } from '@/shared/contracts';
import type { CityDefinition, RectXZ } from '@/shared/contracts';

function expand(rect: RectXZ, by: number): RectXZ {
  return {
    minX: rect.minX - by,
    maxX: rect.maxX + by,
    minZ: rect.minZ - by,
    maxZ: rect.maxZ + by,
  };
}

function inside(rect: RectXZ, x: number, z: number): boolean {
  return x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ;
}

export interface CollisionWorld {
  readonly solids: readonly RectXZ[];
  readonly limits: RectXZ;
}

export function buildCollisionWorld(definition: CityDefinition, radius = PLAYER_RADIUS): CollisionWorld {
  return {
    solids: definition.blockers.map((blocker) => expand(blocker, radius)),
    limits: expand(definition.bounds, -radius),
  };
}

function resolveAxis(world: CollisionWorld, fromX: number, fromZ: number, toX: number, toZ: number): [number, number] {
  let x = toX;
  let z = toZ;
  for (const solid of world.solids) {
    if (!inside(solid, x, fromZ)) continue;
    x = fromX < solid.minX ? solid.minX : fromX > solid.maxX ? solid.maxX : fromX;
  }
  for (const solid of world.solids) {
    if (!inside(solid, x, z)) continue;
    z = fromZ < solid.minZ ? solid.minZ : fromZ > solid.maxZ ? solid.maxZ : fromZ;
  }
  return [x, z];
}

/** Pushes a point that starts inside a solid out through the nearest face. */
function depenetrate(world: CollisionWorld, x: number, z: number): [number, number] {
  for (const solid of world.solids) {
    if (!inside(solid, x, z)) continue;
    const toMinX = x - solid.minX;
    const toMaxX = solid.maxX - x;
    const toMinZ = z - solid.minZ;
    const toMaxZ = solid.maxZ - z;
    const smallest = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
    if (smallest === toMinX) x = solid.minX;
    else if (smallest === toMaxX) x = solid.maxX;
    else if (smallest === toMinZ) z = solid.minZ;
    else z = solid.maxZ;
  }
  return [x, z];
}

export function clampToBounds(world: CollisionWorld, x: number, z: number): [number, number] {
  return [
    Math.min(world.limits.maxX, Math.max(world.limits.minX, x)),
    Math.min(world.limits.maxZ, Math.max(world.limits.minZ, z)),
  ];
}

/** Moves in substeps no longer than half the player radius, sliding along solids. */
export function moveCircle(
  world: CollisionWorld,
  fromX: number,
  fromZ: number,
  deltaX: number,
  deltaZ: number,
  radius = PLAYER_RADIUS,
): [number, number] {
  const distance = Math.hypot(deltaX, deltaZ);
  const steps = Math.max(1, Math.ceil(distance / (radius * 0.5)));
  let [x, z] = clampToBounds(world, ...depenetrate(world, fromX, fromZ));
  for (let step = 0; step < steps; step += 1) {
    const nextX = x + deltaX / steps;
    const nextZ = z + deltaZ / steps;
    const [resolvedX, resolvedZ] = resolveAxis(world, x, z, nextX, nextZ);
    [x, z] = clampToBounds(world, resolvedX, resolvedZ);
  }
  return [x, z];
}
