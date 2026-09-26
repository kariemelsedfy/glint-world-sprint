/**
 * Application composition. Owner: A0.
 * Owns the single Canvas, the UI adapter and every store dispatch path.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { CityId, LevelId, LocationId, Settings, TargetId, UIActions } from '@/shared/contracts';
import { getLevel, resolveObjectives, TARGETS, LEVELS, DEFAULT_LEVEL_ID } from '@/content';
import { InputProvider, resetInput, setTouchAxis } from '@/game/input';
import { useRunClock, usePauseOnHidden } from '@/game/clock';
import { createRunSnapshot, useRunStore } from '@/state/store';
import { GameUI } from '@/ui';
import { TravelDirector } from '@/world';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { SceneHost } from '@/app/SceneHost';
import { toUIModel } from '@/app/adapters';

const DPR_BY_QUALITY: Record<Settings['quality'], [number, number]> = {
  low: [1, 1],
  standard: [1, 1.5],
};

let runCounter = 0;

export function App() {
  const state = useRunStore();
  const dispatch = state.dispatch;
  const [location, setLocation] = useState<LocationId>('globe');
  const pendingLevel = useRef<LevelId>(DEFAULT_LEVEL_ID);

  useRunClock();
  usePauseOnHidden();

  const prepareRun = useCallback(
    (levelId: LevelId) => {
      const level = getLevel(levelId);
      runCounter += 1;
      const objectives = resolveObjectives(level, TARGETS);
      pendingLevel.current = levelId;
      resetInput();
      setLocation('globe');
      dispatch({ type: 'PREPARE_RUN', run: createRunSnapshot(level, objectives, `run-${runCounter}`) });
    },
    [dispatch],
  );

  const onCovered = useCallback(
    (runId: string, transitionId: string) => {
      const travel = useRunStore.getState().travel;
      if (!travel || travel.id !== transitionId || travel.runId !== runId) return;
      setLocation(travel.to);
      resetInput();
      dispatch({ type: 'TRAVEL_COVERED', runId, transitionId });
    },
    [dispatch],
  );

  const onComplete = useCallback(
    (runId: string, transitionId: string) => {
      dispatch({ type: 'TRAVEL_COMPLETE', runId, transitionId });
    },
    [dispatch],
  );

  const onFailure = useCallback(
    (runId: string, transitionId: string, message: string) => {
      setLocation('globe');
      dispatch({ type: 'TRAVEL_FAILED', runId, transitionId, message });
    },
    [dispatch],
  );

  const actions = useMemo<UIActions>(
    () => ({
      onSelectLevel: (id: LevelId) => prepareRun(id),
      onGo: () => dispatch({ type: 'GO' }),
      onSelectCity: (id: CityId) => dispatch({ type: 'SELECT_CITY', cityId: id }),
      onSelectObjective: (id: TargetId) => dispatch({ type: 'SELECT_OBJECTIVE', targetId: id }),
      onHint: (id: TargetId) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        const tier = run.hints[id] ?? 0;
        if (tier >= 3) return;
        dispatch({ type: 'BUY_HINT', targetId: id, expectedTier: (tier + 1) as 1 | 2 | 3 });
      },
      onMap: (open: boolean) => dispatch({ type: 'SET_MAP', open }),
      onGlobe: () => dispatch({ type: 'LEAVE_CITY' }),
      onPause: () => dispatch({ type: 'PAUSE', reason: 'user' }),
      onResume: () => dispatch({ type: 'RESUME' }),
      onRetry: () => prepareRun(pendingLevel.current),
      onNextTrial: () => {
        const index = LEVELS.findIndex((level) => level.id === pendingLevel.current);
        prepareRun(LEVELS[(index + 1) % LEVELS.length]!.id);
      },
      onMenu: () => {
        setLocation('globe');
        dispatch({ type: 'ABANDON' });
      },
      onSettings: (patch: Partial<Settings>) => dispatch({ type: 'SET_SETTINGS', patch }),
      onTouchAxis: (x: number, z: number) => setTouchAxis(x, z),
    }),
    [dispatch, prepareRun],
  );

  const model = toUIModel(state);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1b2c]">
      <Canvas
        className="absolute inset-0"
        dpr={DPR_BY_QUALITY[state.settings.quality]}
        camera={{ fov: 48, near: 0.1, far: 2000, position: [0, 8, 30] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <SceneHost
          location={location}
          quality={state.settings.quality}
          interactiveGlobe={state.phase === 'globe' && !state.paused}
          onSelectCity={(id) => dispatch({ type: 'SELECT_CITY', cityId: id })}
        />
      </Canvas>

      <TravelDirector
        travel={state.travel}
        destinationReady
        paused={state.paused}
        reducedMotion={state.settings.reducedMotion}
        onCovered={onCovered}
        onComplete={onComplete}
        onFailure={onFailure}
      />

      <GameUI model={model} actions={actions} />
    </div>
  );
}

export function Root() {
  return (
    <ErrorBoundary>
      <InputProvider>
        <App />
      </InputProvider>
    </ErrorBoundary>
  );
}
