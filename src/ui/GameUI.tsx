/**
 * GLINT overlay UI. Owner: A5. Adapted from ai-studio-export/src/ui/GameUI.tsx.
 * Presentational only: consumes UIModel/UIActions from @/shared/contracts; owns no rules,
 * timers, scoring or store access. Root is pointer-events-none so the single Canvas in
 * src/app stays clickable; only controls and modal panels opt back in.
 */
import type { UIActions, UIModel } from '@/shared/contracts';
import './glint.css';
import { BriefingScreen } from './components/BriefingScreen';
import { CityHUD } from './components/CityHUD';
import { ErrorOverlay } from './components/ErrorOverlay';
import { GlobeHUD } from './components/GlobeHUD';
import { MapOverlay } from './components/MapOverlay';
import { MenuScreen } from './components/MenuScreen';
import { OrientationNotice } from './components/OrientationNotice';
import { PauseModal } from './components/PauseModal';
import { ResultsScreen } from './components/ResultsScreen';
import { TouchControls } from './components/TouchControls';
import { TravelOverlay } from './components/TravelOverlay';
import { useCoarsePointer } from './hooks';

export interface GameUIProps {
  readonly model: UIModel;
  readonly actions: UIActions;
  /** Force the thumbstick on/off; defaults to showing it on coarse-pointer (touch) devices. */
  readonly showTouchControls?: boolean;
}

export function GameUI({ model, actions, showTouchControls }: GameUIProps) {
  const coarsePointer = useCoarsePointer();
  const touchControls = showTouchControls ?? coarsePointer;

  return (
    <div
      className={`glint-ui absolute inset-0 pointer-events-none select-none overflow-hidden ${
        model.settings.reducedMotion ? 'glint-reduced-motion' : ''
      }`}
      aria-label="GLINT game interface"
    >
      <OrientationNotice />

      {model.phase === 'boot' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#12253B] text-[#FFF6E5]">
          <div className="text-center p-6">
            <h1 className="text-3xl font-black tracking-wider text-[#FFC857] mb-2 glint-font-display">GLINT</h1>
            <p className="text-xs font-semibold text-white/70">{model.statusMessage ?? 'Loading…'}</p>
          </div>
        </div>
      )}

      {model.phase === 'menu' && <MenuScreen model={model} actions={actions} />}
      {model.phase === 'briefing' && <BriefingScreen model={model} actions={actions} />}
      {model.phase === 'globe' && <GlobeHUD model={model} actions={actions} />}
      {model.phase === 'travel' && <TravelOverlay cityId={model.cityId} cityLabel={model.cities.find((city) => city.id === model.cityId)?.label ?? null} statusMessage={model.statusMessage} />}

      {model.phase === 'city' && (
        <>
          <CityHUD model={model} actions={actions} touch={touchControls} />
          {touchControls && !model.paused && !model.map && (
            <TouchControls onTouchAxis={actions.onTouchAxis} />
          )}
        </>
      )}

      {model.phase === 'results' && model.result && (
        <ResultsScreen result={model.result} model={model} actions={actions} />
      )}

      {model.phase === 'error' && <ErrorOverlay message={model.statusMessage} actions={actions} />}

      {model.map && <MapOverlay map={model.map} actions={actions} />}

      {model.paused && (model.phase === 'globe' || model.phase === 'city' || model.phase === 'travel') && (
        <PauseModal settings={model.settings} actions={actions} />
      )}
    </div>
  );
}
