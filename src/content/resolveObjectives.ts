/**
 * STUB seeded objective resolver created by A0 for bootstrap.
 * Owner after CONTRACT_READY: A6, who adds full validation (reachability, clearance, region checks).
 */
import { FINE_SEARCH_RADIUS } from '@/shared/contracts';
import type {
  CityDefinition,
  CityId,
  LevelDefinition,
  ObjectiveInstance,
  TargetDefinition,
} from '@/shared/contracts';
import { createRng, hashSeed } from '@/shared/seed';
import { getCity } from '@/cities';

export function resolveObjectives(
  level: LevelDefinition,
  definitions: readonly TargetDefinition[],
  cityLookup: (id: CityId) => CityDefinition = getCity,
): ObjectiveInstance[] {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));

  return [...level.targetIds].map((targetId) => {
    const target = byId.get(targetId);
    if (!target) throw new Error(`Level ${level.id} references unknown target ${targetId}`);

    const city = cityLookup(target.cityId);
    const district = city.districts.find((candidate) => candidate.id === target.districtId);
    if (!district) throw new Error(`Target ${targetId} references unknown district ${target.districtId}`);

    const candidates = [...target.socketIds].sort().map((socketId) => {
      const socket = city.sockets.find((candidate) => candidate.id === socketId);
      if (!socket) throw new Error(`Target ${targetId} references unknown socket ${socketId}`);
      return socket;
    });

    const rng = createRng(hashSeed(level.seed, level.version, targetId));
    const socket = candidates[rng.int(candidates.length)]!;

    return {
      targetId,
      cityId: target.cityId,
      socketId: socket.id,
      position: socket.position,
      broadSearch: district.broadSearch,
      narrowedSearch: district.narrowedSearch,
      fineSearch: { center: socket.fineSearchCenter, radius: FINE_SEARCH_RADIUS },
    };
  });
}
