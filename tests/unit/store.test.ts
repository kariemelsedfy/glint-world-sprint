import { beforeEach, describe, expect, it } from 'vitest';
import { ENTRY_PENALTY_MS, HINT_COST_MS } from '@/shared/contracts';
import { LEVELS, TARGETS, resolveObjectives } from '@/content';
import { createRunSnapshot, useRunStore } from '@/state/store';

const level = LEVELS[0]!;

function startRunInFirstCity() {
  const store = useRunStore.getState();
  const objectives = resolveObjectives(level, TARGETS);
  store.dispatch({ type: 'PREPARE_RUN', run: createRunSnapshot(level, objectives, 'run-test') });
  store.dispatch({ type: 'GO' });
  const first = objectives[0]!;
  useRunStore.getState().dispatch({ type: 'SELECT_CITY', cityId: first.cityId });
  const travel = useRunStore.getState().travel!;
  useRunStore.getState().dispatch({ type: 'TRAVEL_COMPLETE', runId: travel.runId, transitionId: travel.id });
  return first;
}

beforeEach(() => {
  useRunStore.getState().dispatch({ type: 'ABANDON' });
  useRunStore.setState({ bests: {}, playerXZ: [0, 0] });
});

describe('run store rules', () => {
  it('charges the entry penalty exactly once per arrival and ignores stale travel tokens', () => {
    const first = startRunInFirstCity();
    expect(useRunStore.getState().phase).toBe('city');
    expect(useRunStore.getState().run!.travelPenaltyMs).toBe(ENTRY_PENALTY_MS);

    useRunStore.getState().dispatch({ type: 'TRAVEL_COMPLETE', runId: 'run-test', transitionId: 't1' });
    expect(useRunStore.getState().run!.travelPenaltyMs).toBe(ENTRY_PENALTY_MS);
    expect(useRunStore.getState().cityId).toBe(first.cityId);
  });

  it('rejects collection out of range and accepts it in range, once', () => {
    const first = startRunInFirstCity();
    const store = () => useRunStore.getState();

    useRunStore.setState({ playerXZ: [first.position[0] + 40, first.position[2]] });
    store().dispatch({ type: 'COLLECT', targetId: first.targetId, cityId: first.cityId });
    expect(store().run!.collected).toEqual([]);

    useRunStore.setState({ playerXZ: [first.position[0], first.position[2]] });
    store().dispatch({ type: 'COLLECT', targetId: first.targetId, cityId: first.cityId });
    store().dispatch({ type: 'COLLECT', targetId: first.targetId, cityId: first.cityId });
    expect(store().run!.collected).toEqual([first.targetId]);
  });

  it('applies incremental hint costs only for the expected next tier', () => {
    const first = startRunInFirstCity();
    const store = () => useRunStore.getState();

    store().dispatch({ type: 'BUY_HINT', targetId: first.targetId, expectedTier: 2 });
    expect(store().run!.hintPenaltyMs).toBe(0);

    store().dispatch({ type: 'BUY_HINT', targetId: first.targetId, expectedTier: 1 });
    store().dispatch({ type: 'BUY_HINT', targetId: first.targetId, expectedTier: 2 });
    expect(store().run!.hints[first.targetId]).toBe(2);
    expect(store().run!.hintPenaltyMs).toBe(HINT_COST_MS[0] + HINT_COST_MS[1]);
  });

  it('marks a paused run as practice and never records a best for it', () => {
    const first = startRunInFirstCity();
    const store = () => useRunStore.getState();

    store().dispatch({ type: 'PAUSE', reason: 'user' });
    store().dispatch({ type: 'RESUME' });
    expect(store().run!.practice).toBe(true);

    for (const objective of store().run!.objectives) {
      if (store().cityId !== objective.cityId) {
        store().dispatch({ type: 'LEAVE_CITY' });
        let travel = useRunStore.getState().travel!;
        store().dispatch({ type: 'TRAVEL_COMPLETE', runId: travel.runId, transitionId: travel.id });
        store().dispatch({ type: 'SELECT_CITY', cityId: objective.cityId });
        travel = useRunStore.getState().travel!;
        store().dispatch({ type: 'TRAVEL_COMPLETE', runId: travel.runId, transitionId: travel.id });
      }
      useRunStore.setState({ playerXZ: [objective.position[0], objective.position[2]] });
      store().dispatch({ type: 'COLLECT', targetId: objective.targetId, cityId: objective.cityId });
    }

    expect(first).toBeDefined();
    expect(store().phase).toBe('results');
    expect(store().result!.practice).toBe(true);
    expect(store().result!.isNewBest).toBe(false);
    expect(store().bests).toEqual({});
  });
});
