/**
 * State → view model adapters. Owner: A0.
 * The UI never sees store internals and never recomputes rules, hints or scores here.
 */
import { HINT_COST_MS } from '@/shared/contracts';
import type {
  CityId,
  HintTier,
  MapVM,
  ObjectiveCardVM,
  SearchRegion,
  TargetId,
  UIModel,
} from '@/shared/contracts';
import { getCity, listCities } from '@/cities';
import { LEVELS, getTarget } from '@/content';
import type { RunState } from '@/state/store';
import { adjustedMs } from '@/state/store';

const HINT_LABELS = ['Hint 1: city', 'Hint 2: district', 'Hint 3: nearby'] as const;

function cardFor(state: RunState, targetId: TargetId): ObjectiveCardVM {
  const run = state.run!;
  const target = getTarget(targetId);
  const tier = (run.hints[targetId] ?? 0) as HintTier;
  const collected = run.collected.includes(targetId);
  const nextTier = tier < 3 ? tier + 1 : null;

  return {
    targetId,
    title: target.clueTitle,
    clue: target.clueText,
    collected,
    selected: state.selectedTargetId === targetId,
    hintTier: tier,
    purchasedHints: target.hintText.slice(0, tier),
    nextHintLabel:
      nextTier === null || collected
        ? null
        : `${HINT_LABELS[nextTier - 1]} (+${HINT_COST_MS[nextTier - 1]! / 1000}s)`,
    nextHintCostMs: nextTier === null || collected ? null : HINT_COST_MS[nextTier - 1]!,
  };
}

function searchRegionFor(tier: HintTier, broad: SearchRegion, narrowed: SearchRegion, fine: SearchRegion): SearchRegion {
  if (tier >= 3) return fine;
  if (tier === 2) return narrowed;
  return broad;
}

function mapFor(state: RunState): MapVM | null {
  if (!state.mapOpen || state.phase !== 'city' || !state.cityId || !state.run) return null;
  const run = state.run;
  const city = getCity(state.cityId);

  const namedLandmarkIds = new Set(
    run.objectives
      .filter((objective) => ((run.hints[objective.targetId] ?? 0) as HintTier) >= 2)
      .map((objective) => getTarget(objective.targetId).landmarkId),
  );

  return {
    cityLabel: city.label,
    bounds: city.bounds,
    roads: city.roads,
    blockers: city.blockers,
    landmarks: city.landmarks.map(({ label, ...rest }) => ({
      ...rest,
      label: namedLandmarkIds.has(rest.id) ? label : null,
    })),
    player: state.playerXZ,
    searchAreas: run.objectives
      .filter((objective) => objective.cityId === state.cityId && !run.collected.includes(objective.targetId))
      .map((objective) => ({
        ...searchRegionFor(
          (run.hints[objective.targetId] ?? 0) as HintTier,
          objective.broadSearch,
          objective.narrowedSearch,
          objective.fineSearch,
        ),
        targetId: objective.targetId,
      })),
  };
}

function destinationCityId(state: RunState): CityId | null {
  if (state.phase === 'travel' && state.travel) {
    return state.travel.to === 'globe' ? null : state.travel.to;
  }
  return state.cityId;
}

export function toUIModel(state: RunState): UIModel {
  const run = state.run;
  const penaltyMs = run ? run.hintPenaltyMs + run.travelPenaltyMs : 0;

  return {
    phase: state.phase,
    levelId: state.levelId,
    levels: LEVELS.map((level) => ({ id: level.id, title: level.title })),
    cities: listCities(),
    cityId: destinationCityId(state),
    cards: run ? run.objectives.map((objective) => cardFor(state, objective.targetId)) : [],
    activeMs: run ? run.activeMs : 0,
    adjustedMs: run ? adjustedMs(run) : 0,
    penaltyMs,
    practice: run ? run.practice : false,
    paused: state.paused,
    map: mapFor(state),
    result: state.result,
    settings: state.settings,
    statusMessage: state.statusMessage,
  };
}
