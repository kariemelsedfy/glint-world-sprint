import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS } from '@/shared/contracts';
import type { RectXZ } from '@/shared/contracts';
import { berlinDefinition } from './definition';

const CLEARANCE = 3;
const STEP = 1;

function blockedAt(x: number, z: number, margin: number): boolean {
  return berlinDefinition.blockers.some(
    (blocker) =>
      x > blocker.minX - margin && x < blocker.maxX + margin && z > blocker.minZ - margin && z < blocker.maxZ + margin,
  );
}

function reachableFromSpawn(): Set<string> {
  const { bounds, spawn } = berlinDefinition;
  const key = (x: number, z: number) => `${x},${z}`;
  const seen = new Set<string>();
  const queue: [number, number][] = [[Math.round(spawn[0]), Math.round(spawn[2])]];
  const limit: RectXZ = {
    minX: bounds.minX + PLAYER_RADIUS,
    maxX: bounds.maxX - PLAYER_RADIUS,
    minZ: bounds.minZ + PLAYER_RADIUS,
    maxZ: bounds.maxZ - PLAYER_RADIUS,
  };
  while (queue.length > 0) {
    const [x, z] = queue.pop()!;
    if (x < limit.minX || x > limit.maxX || z < limit.minZ || z > limit.maxZ) continue;
    if (blockedAt(x, z, PLAYER_RADIUS)) continue;
    const id = key(x, z);
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push([x + STEP, z], [x - STEP, z], [x, z + STEP], [x, z - STEP]);
  }
  return seen;
}

describe('berlin definition', () => {
  it('has unique blocker ids and a landmark blocker for every landmark', () => {
    const ids = berlinDefinition.blockers.map((blocker) => blocker.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const landmark of berlinDefinition.landmarks) {
      const blocker = berlinDefinition.blockers.find((candidate) => candidate.id === landmark.id);
      expect(blocker).toEqual({ id: landmark.id, ...landmark.footprint });
    }
  });

  it('spawns on clear ground and can walk to every socket', () => {
    const reachable = reachableFromSpawn();
    const [sx, , sz] = berlinDefinition.spawn;
    expect(blockedAt(sx, sz, CLEARANCE)).toBe(false);
    for (const socket of berlinDefinition.sockets) {
      const [x, , z] = socket.position;
      expect(blockedAt(x, z, CLEARANCE), `${socket.id} clearance`).toBe(false);
      expect(reachable.has(`${Math.round(x)},${Math.round(z)}`), `${socket.id} reachable`).toBe(true);
    }
  });

  it('keeps the gate and tower squares open on both sides of the main boulevards', () => {
    // Both a north and a south approach must exist around every landmark block.
    for (const landmark of berlinDefinition.landmarks) {
      const { footprint } = landmark;
      const north = footprint.minZ - CLEARANCE;
      const south = footprint.maxZ + CLEARANCE;
      expect(blockedAt((footprint.minX + footprint.maxX) / 2, north, PLAYER_RADIUS), `${landmark.id} north`).toBe(false);
      expect(blockedAt((footprint.minX + footprint.maxX) / 2, south, PLAYER_RADIUS), `${landmark.id} south`).toBe(false);
    }
  });
});
