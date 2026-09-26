/**
 * Seeded objective resolver. Owner: A6.
 *
 * Socket choice: candidate socket IDs are sorted, then indexed with a mulberry32 stream seeded by
 * FNV-1a over (level.seed, level.version, targetId) — see `@/shared/seed`. Nothing else draws from
 * that stream, so cosmetic randomness can never move a target. Every resolved socket is re-validated
 * against the city's own collision geometry and search regions; an unreachable or unfair placement
 * throws instead of shipping an unfindable target.
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
import { errorsOf, formatIssues, regionContains, validateSocketPlacement } from '@/content/validate';
import type { ContentIssue } from '@/content/validate';

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
    if (candidates.length === 0) throw new Error(`Target ${targetId} has no candidate sockets`);

    const rng = createRng(hashSeed(level.seed, level.version, targetId));
    const socket = candidates[rng.int(candidates.length)]!;

    const objective: ObjectiveInstance = {
      targetId,
      cityId: target.cityId,
      socketId: socket.id,
      position: socket.position,
      broadSearch: district.broadSearch,
      narrowedSearch: district.narrowedSearch,
      fineSearch: { center: socket.fineSearchCenter, radius: FINE_SEARCH_RADIUS },
    };

    const issues: ContentIssue[] = errorsOf(validateSocketPlacement(city, socket));
    if (socket.districtId !== target.districtId) {
      issues.push({
        severity: 'error',
        scope: 'target',
        id: targetId,
        message: `socket ${socket.id} is not in district ${target.districtId}`,
      });
    }
    const point = [socket.position[0], socket.position[2]] as const;
    for (const [name, region] of [
      ['broad', objective.broadSearch],
      ['narrowed', objective.narrowedSearch],
      ['fine', objective.fineSearch],
    ] as const) {
      if (!regionContains(region, point)) {
        issues.push({
          severity: 'error',
          scope: 'target',
          id: targetId,
          message: `${name} search region does not contain the socket`,
        });
      }
    }
    if (issues.length > 0) {
      throw new Error(`Objective ${targetId} resolved to invalid socket ${socket.id}:\n${formatIssues(issues)}`);
    }

    return objective;
  });
}
