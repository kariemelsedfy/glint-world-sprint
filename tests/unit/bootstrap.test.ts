import { describe, expect, it } from 'vitest';
import { CITY_HALF_EXTENT, FINE_SEARCH_RADIUS, PLAYER_RADIUS } from '@/shared/contracts';
import { getCity, CITY_IDS } from '@/cities';
import { LEVELS, TARGETS, resolveObjectives } from '@/content';
import { buildCollisionWorld, moveCircle } from '@/game/collision';

function contains(center: readonly [number, number], radius: number, point: readonly [number, number]): boolean {
  return Math.hypot(center[0] - point[0], center[1] - point[1]) <= radius;
}

describe('city definitions', () => {
  it('keeps every socket in bounds and outside expanded blockers', () => {
    for (const cityId of CITY_IDS) {
      const city = getCity(cityId);
      for (const socket of city.sockets) {
        const [x, , z] = socket.position;
        expect(Math.abs(x)).toBeLessThan(CITY_HALF_EXTENT - PLAYER_RADIUS);
        expect(Math.abs(z)).toBeLessThan(CITY_HALF_EXTENT - PLAYER_RADIUS);
        for (const blocker of city.blockers) {
          const insideX = x > blocker.minX - PLAYER_RADIUS && x < blocker.maxX + PLAYER_RADIUS;
          const insideZ = z > blocker.minZ - PLAYER_RADIUS && z < blocker.maxZ + PLAYER_RADIUS;
          expect(insideX && insideZ).toBe(false);
        }
      }
    }
  });

  it('keeps every socket inside its district regions and fine patch', () => {
    for (const cityId of CITY_IDS) {
      const city = getCity(cityId);
      for (const socket of city.sockets) {
        const district = city.districts.find((candidate) => candidate.id === socket.districtId);
        expect(district).toBeDefined();
        const point: readonly [number, number] = [socket.position[0], socket.position[2]];
        expect(contains(district!.broadSearch.center, district!.broadSearch.radius, point)).toBe(true);
        expect(contains(district!.narrowedSearch.center, district!.narrowedSearch.radius, point)).toBe(true);
        expect(contains(socket.fineSearchCenter, FINE_SEARCH_RADIUS, point)).toBe(true);
      }
    }
  });
});

describe('objective resolution', () => {
  it('is deterministic and uses declared sockets', () => {
    for (const level of LEVELS) {
      const first = resolveObjectives(level, TARGETS);
      const second = resolveObjectives(level, [...TARGETS].reverse());
      expect(first).toEqual(second);
      expect(first).toHaveLength(level.targetIds.length);
      for (const objective of first) {
        const target = TARGETS.find((candidate) => candidate.id === objective.targetId)!;
        expect(target.socketIds).toContain(objective.socketId);
      }
    }
  });

  it('covers both cities in every P0 trial', () => {
    for (const level of LEVELS) {
      const cities = new Set(resolveObjectives(level, TARGETS).map((objective) => objective.cityId));
      expect([...cities].sort()).toEqual(['giza', 'paris']);
    }
  });
});

describe('collision', () => {
  it('blocks movement into a landmark and keeps the player inside bounds', () => {
    const paris = getCity('paris');
    const world = buildCollisionWorld(paris);
    const eiffel = paris.blockers.find((blocker) => blocker.id === 'eiffel')!;

    const startX = eiffel.minX - 4;
    const startZ = (eiffel.minZ + eiffel.maxZ) / 2;
    const [x] = moveCircle(world, startX, startZ, 20, 0);
    expect(x).toBeLessThanOrEqual(eiffel.minX - PLAYER_RADIUS + 0.001);

    const [edgeX, edgeZ] = moveCircle(world, 0, 0, 500, 500);
    expect(edgeX).toBeLessThanOrEqual(CITY_HALF_EXTENT - PLAYER_RADIUS);
    expect(edgeZ).toBeLessThanOrEqual(CITY_HALF_EXTENT - PLAYER_RADIUS);
  });
});
