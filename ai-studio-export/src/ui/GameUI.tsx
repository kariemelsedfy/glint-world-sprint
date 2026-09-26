import React, { useState } from 'react';
import { UIModel, UIActions, TargetId } from '@/contracts/game';
import { MenuScreen } from './components/MenuScreen';
import { BriefingScreen } from './components/BriefingScreen';
import { GlobeHUD } from './components/GlobeHUD';
import { CityHUD } from './components/CityHUD';
import { MapOverlay } from './components/MapOverlay';
import { HintModal } from './components/HintModal';
import { ResultsScreen } from './components/ResultsScreen';
import { PauseModal } from './components/PauseModal';
import { TravelOverlay } from './components/TravelOverlay';
import { ErrorOverlay } from './components/ErrorOverlay';
import { TouchControls } from './components/TouchControls';
import { OrientationNotice } from './components/OrientationNotice';

export interface GameUIProps {
  model: UIModel;
  actions: UIActions;
  showTouchControls?: boolean;
}

/**
 * GameUI: Pure stateless (w.r.t game engine logic) DOM/CSS overlay designed to sit over
 * a single WebGL 3D canvas for the GLINT speedrun casual game.
 */
export function GameUI({ model, actions, showTouchControls = true }: GameUIProps) {
  const [hintTargetId, setHintTargetId] = useState<TargetId | null>(null);

  const isReducedMotion = model.settings.reducedMotion;

  // Find currently selected objective or fallback
  const currentCard =
    model.cards.find((c) => c.targetId === hintTargetId) ||
    model.cards.find((c) => c.selected) ||
    model.cards[0];

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none font-sans overflow-hidden ${
        isReducedMotion ? 'reduced-motion' : ''
      }`}
      aria-label="GLINT Game Interface"
    >
      {/* Portrait orientation prompt */}
      <OrientationNotice />

      {/* Main Screens by Phase */}
      {model.phase === 'boot' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#12253B] text-[#FFF6E5]">
          <div className="text-center p-6">
            <h1 className="text-3xl font-black tracking-wider text-[#FFC857] mb-2 font-display">
              GLINT
            </h1>
            <p className="text-xs font-semibold text-white/70">
              Spinning up toy-world engines...
            </p>
          </div>
        </div>
      )}

      {model.phase === 'menu' && (
        <MenuScreen model={model} actions={actions} />
      )}

      {model.phase === 'briefing' && (
        <BriefingScreen model={model} actions={actions} />
      )}

      {model.phase === 'globe' && (
        <GlobeHUD model={model} actions={actions} />
      )}

      {model.phase === 'travel' && (
        <TravelOverlay cityId={model.cityId} statusMessage={model.statusMessage} />
      )}

      {model.phase === 'city' && (
        <>
          <CityHUD
            model={model}
            actions={actions}
            onOpenHintModal={(targetId) => setHintTargetId(targetId)}
          />

          {/* Landscape touch controls for driving miniature explorer */}
          {showTouchControls && !model.paused && !model.map && (
            <TouchControls
              onTouchAxis={actions.onTouchAxis}
              onMapClick={() => actions.onMap(true)}
              onHintClick={() => setHintTargetId(currentCard?.targetId || model.cards[0]?.targetId)}
              onActionClick={() => {
                // If a card is selected or nearby, triggers interaction
                if (currentCard && !currentCard.collected) {
                  actions.onSelectObjective(currentCard.targetId);
                }
              }}
              hasAvailableHint={!!currentCard && !currentCard.collected}
            />
          )}
        </>
      )}

      {model.phase === 'results' && model.result && (
        <ResultsScreen result={model.result} model={model} actions={actions} />
      )}

      {model.phase === 'error' && (
        <ErrorOverlay message={model.statusMessage} actions={actions} />
      )}

      {/* Map Modal Overlay */}
      {model.map && (
        <MapOverlay map={model.map} actions={actions} variant="modal" />
      )}

      {/* Hint Intelligence Dialog */}
      {hintTargetId && (
        <HintModal
          cards={model.cards}
          activeTargetId={hintTargetId}
          onSelectTarget={(id) => {
            setHintTargetId(id);
            actions.onSelectObjective(id);
          }}
          onClose={() => setHintTargetId(null)}
          actions={actions}
        />
      )}

      {/* Pause Modal Overlay */}
      {model.paused && model.phase !== 'results' && model.phase !== 'menu' && (
        <PauseModal settings={model.settings} actions={actions} />
      )}
    </div>
  );
}

export default GameUI;
