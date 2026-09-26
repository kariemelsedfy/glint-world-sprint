/**
 * BOOTSTRAP run store created by A0 so the graybox loop exists at CONTRACT_READY.
 * Owner after CONTRACT_READY: A1. This is the only rule authority: phases, penalties,
 * collection validity, results and persistence live here, never in UI or scenes.
 */
import { create } from 'zustand';
import {
  ENTRY_PENALTY_MS,
  HINT_COST_MS,
  PICKUP_RADIUS,
  RULES_VERSION,
} from '@/shared/contracts';
import type {
  CityId,
  GameEvent,
  HintTier,
  LevelDefinition,
  LevelId,
  Phase,
  ResultVM,
  RunSnapshot,
  Settings,
  TargetId,
  TravelSpec,
  Vec2,
} from '@/shared/contracts';
import { readStorage, writeStorage } from '@/shared/storage';
import { getLevel } from '@/content/levels';

interface PersistedState {
  readonly settings: Settings;
  readonly bests: Record<string, number>;
}

const DEFAULT_SETTINGS: Settings = { muted: false, reducedMotion: false, quality: 'standard' };

const persisted = readStorage<PersistedState>({ settings: DEFAULT_SETTINGS, bests: {} });

export interface RunState {
  phase: Phase;
  levelId: LevelId | null;
  run: RunSnapshot | null;
  cityId: CityId | null;
  travel: TravelSpec | null;
  selectedTargetId: TargetId | null;
  paused: boolean;
  mapOpen: boolean;
  statusMessage: string | null;
  result: ResultVM | null;
  settings: Settings;
  bests: Record<string, number>;
  sessionOnly: boolean;
  /** Live player position written by the game layer, never by the UI. */
  playerXZ: Vec2;
  dispatch(event: GameEvent): void;
  setPlayerXZ(x: number, z: number): void;
}

export function bestKey(run: Pick<RunSnapshot, 'levelId' | 'levelVersion' | 'seed' | 'rulesVersion'>): string {
  return `${run.levelId}:${run.levelVersion}:${run.seed}:${run.rulesVersion}`;
}

export function adjustedMs(run: RunSnapshot): number {
  return run.activeMs + run.hintPenaltyMs + run.travelPenaltyMs;
}

export function medalFor(level: LevelDefinition, ms: number): ResultVM['medal'] {
  const seconds = ms / 1000;
  if (seconds <= level.medalSeconds.gold) return 'gold';
  if (seconds <= level.medalSeconds.silver) return 'silver';
  if (seconds <= level.medalSeconds.bronze) return 'bronze';
  return 'complete';
}

export function pointsFor(level: LevelDefinition, ms: number): number {
  const target = level.medalSeconds.bronze * 1000;
  return Math.max(0, Math.round(1000 * (2 - ms / target)));
}

function distanceSq(a: readonly [number, number, number], x: number, z: number): number {
  const dx = a[0] - x;
  const dz = a[2] - z;
  return dx * dx + dz * dz;
}

function isActivePhase(phase: Phase): boolean {
  return phase === 'globe' || phase === 'city';
}

let transitionCounter = 0;

export const useRunStore = create<RunState>((set, get) => ({
  phase: 'menu',
  levelId: null,
  run: null,
  cityId: null,
  travel: null,
  selectedTargetId: null,
  paused: false,
  mapOpen: false,
  statusMessage: null,
  result: null,
  settings: persisted.value.settings ?? DEFAULT_SETTINGS,
  bests: persisted.value.bests ?? {},
  sessionOnly: !persisted.persistent,
  playerXZ: [0, 0],

  setPlayerXZ: (x, z) => set({ playerXZ: [x, z] }),

  dispatch: (event) => {
    const state = get();
    const run = state.run;

    switch (event.type) {
      case 'PREPARE_RUN':
        set({
          phase: 'briefing',
          levelId: event.run.levelId,
          run: event.run,
          cityId: null,
          travel: null,
          selectedTargetId: event.run.objectives[0]?.targetId ?? null,
          paused: false,
          mapOpen: false,
          statusMessage: null,
          result: null,
        });
        return;

      case 'GO':
        if (state.phase !== 'briefing' || !run) return;
        set({ phase: 'globe', statusMessage: null });
        return;

      case 'SELECT_CITY': {
        if (state.phase !== 'globe' || state.paused || !run) return;
        transitionCounter += 1;
        const travel: TravelSpec = {
          id: `t${transitionCounter}`,
          runId: run.runId,
          from: 'globe',
          to: event.cityId,
        };
        set({ phase: 'travel', travel, mapOpen: false, statusMessage: null });
        return;
      }

      case 'LEAVE_CITY': {
        if (state.phase !== 'city' || state.paused || !run) return;
        transitionCounter += 1;
        const travel: TravelSpec = {
          id: `t${transitionCounter}`,
          runId: run.runId,
          from: state.cityId ?? 'globe',
          to: 'globe',
        };
        set({ phase: 'travel', travel, mapOpen: false });
        return;
      }

      case 'TRAVEL_COVERED':
        return;

      case 'TRAVEL_COMPLETE': {
        const travel = state.travel;
        if (!run || !travel) return;
        if (travel.id !== event.transitionId || travel.runId !== event.runId) return;
        if (travel.to === 'globe') {
          set({ phase: 'globe', cityId: null, travel: null });
          return;
        }
        set({
          phase: 'city',
          cityId: travel.to,
          travel: null,
          run: { ...run, travelPenaltyMs: run.travelPenaltyMs + ENTRY_PENALTY_MS },
        });
        return;
      }

      case 'TRAVEL_FAILED': {
        const travel = state.travel;
        if (!travel || travel.id !== event.transitionId || travel.runId !== event.runId) return;
        set({ phase: 'globe', cityId: null, travel: null, statusMessage: event.message });
        return;
      }

      case 'TICK_ACTIVE': {
        if (!run || state.paused || !isActivePhase(state.phase)) return;
        set({ run: { ...run, activeMs: run.activeMs + event.elapsedMs } });
        return;
      }

      case 'COLLECT': {
        if (!run || state.paused || state.phase !== 'city') return;
        if (state.cityId !== event.cityId) return;
        const objective = run.objectives.find((candidate) => candidate.targetId === event.targetId);
        if (!objective || objective.cityId !== event.cityId) return;
        if (run.collected.includes(event.targetId)) return;
        const [px, pz] = state.playerXZ;
        if (distanceSq(objective.position, px, pz) > PICKUP_RADIUS * PICKUP_RADIUS) return;

        const collected = [...run.collected, event.targetId];
        const nextRun: RunSnapshot = { ...run, collected };
        const remaining = run.objectives.filter((candidate) => !collected.includes(candidate.targetId));

        if (remaining.length > 0) {
          set({
            run: nextRun,
            selectedTargetId: remaining[0]!.targetId,
            statusMessage: null,
          });
          return;
        }

        const level = getLevel(nextRun.levelId);
        const finalMs = adjustedMs(nextRun);
        const key = bestKey(nextRun);
        const previousBest = state.bests[key] ?? null;
        const isNewBest = !nextRun.practice && (previousBest === null || finalMs < previousBest);
        const bests = isNewBest ? { ...state.bests, [key]: finalMs } : state.bests;
        const stored = writeStorage({ settings: state.settings, bests });

        set({
          run: nextRun,
          phase: 'results',
          mapOpen: false,
          bests,
          sessionOnly: state.sessionOnly || !stored,
          result: {
            adjustedMs: finalMs,
            activeMs: nextRun.activeMs,
            hintPenaltyMs: nextRun.hintPenaltyMs,
            travelPenaltyMs: nextRun.travelPenaltyMs,
            points: pointsFor(level, finalMs),
            medal: medalFor(level, finalMs),
            practice: nextRun.practice,
            bestMs: bests[key] ?? previousBest,
            isNewBest,
            sessionOnly: state.sessionOnly || !stored,
          },
        });
        return;
      }

      case 'BUY_HINT': {
        if (!run || state.paused || !isActivePhase(state.phase)) return;
        if (run.collected.includes(event.targetId)) return;
        const current = (run.hints[event.targetId] ?? 0) as HintTier;
        if (current + 1 !== event.expectedTier) return;
        if (event.expectedTier > 3) return;
        const cost = HINT_COST_MS[event.expectedTier - 1] ?? 0;
        set({
          run: {
            ...run,
            hints: { ...run.hints, [event.targetId]: event.expectedTier as HintTier },
            hintPenaltyMs: run.hintPenaltyMs + cost,
          },
        });
        return;
      }

      case 'SELECT_OBJECTIVE':
        if (!run || !run.objectives.some((candidate) => candidate.targetId === event.targetId)) return;
        set({ selectedTargetId: event.targetId });
        return;

      case 'SET_MAP':
        if (state.phase !== 'city') return;
        set({ mapOpen: event.open });
        return;

      case 'PAUSE':
        if (!run || !isActivePhase(state.phase) || state.paused) return;
        set({ paused: true, run: { ...run, practice: true } });
        return;

      case 'RESUME':
        if (!state.paused) return;
        set({ paused: false });
        return;

      case 'ABANDON':
        set({
          phase: 'menu',
          run: null,
          cityId: null,
          travel: null,
          paused: false,
          mapOpen: false,
          result: null,
          statusMessage: null,
        });
        return;

      case 'SET_SETTINGS': {
        const settings = { ...state.settings, ...event.patch };
        const stored = writeStorage({ settings, bests: state.bests });
        set({ settings, sessionOnly: state.sessionOnly || !stored });
        return;
      }

      default:
        return;
    }
  },
}));

export function createRunSnapshot(
  level: LevelDefinition,
  objectives: RunSnapshot['objectives'],
  runId: string,
): RunSnapshot {
  return {
    runId,
    levelId: level.id,
    levelVersion: level.version,
    rulesVersion: RULES_VERSION,
    seed: level.seed,
    objectives,
    collected: [],
    hints: {},
    activeMs: 0,
    hintPenaltyMs: 0,
    travelPenaltyMs: 0,
    practice: false,
  };
}
