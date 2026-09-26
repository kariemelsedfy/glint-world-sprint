/**
 * Run with vite-node (Vite alias resolution) to print the objectives the real resolver
 * picks for every level. The e2e oracle shells out to this so it never duplicates rules.
 */
import { LEVELS, TARGETS, resolveObjectives } from '@/content';
import { getCity } from '@/cities';

const levels = LEVELS.map((level) => ({
  id: level.id,
  title: level.title,
  seed: level.seed,
  version: level.version,
  objectives: resolveObjectives(level, TARGETS).map((objective) => {
    const target = TARGETS.find((candidate) => candidate.id === objective.targetId)!;
    return {
      targetId: objective.targetId,
      cityId: objective.cityId,
      title: target.clueTitle,
      position: [objective.position[0], objective.position[2]],
      broadRadius: objective.broadSearch.radius,
      narrowedRadius: objective.narrowedSearch.radius,
      fineRadius: objective.fineSearch.radius,
      landmarkLabel: getCity(objective.cityId).landmarks.find((landmark) => landmark.id === target.landmarkId)?.label ?? null,
    };
  }),
}));

const cities = (['paris', 'giza'] as const).map((id) => {
  const city = getCity(id);
  return { id, label: city.label, spawn: [city.spawn[0], city.spawn[2]], blockers: city.blockers, bounds: city.bounds };
});

process.stdout.write(JSON.stringify({ levels, cities }));
