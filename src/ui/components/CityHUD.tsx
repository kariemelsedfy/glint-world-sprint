import { useEffect, useRef, useState } from 'react';
import type { UIModel, UIActions, TargetId } from '@/shared/contracts';
import { formatTime, formatPenalty } from '../format';
import { MapIcon, SparkleHintIcon, GlobeIcon, PauseIcon, CheckIcon, TargetCollectibleIcon } from './Icons';
import { PassportStamp } from './PassportStamp';

interface CityHUDProps {
  model: UIModel;
  actions: UIActions;
  onOpenHintModal: (targetId: TargetId) => void;
  touch?: boolean;
}

export function CityHUD({ model, actions, onOpenHintModal, touch = false }: CityHUDProps) {
  // Find selected card or default to first uncollected, or first card
  const activeCard =
    model.cards.find((c) => c.selected) ||
    model.cards.find((c) => !c.collected) ||
    model.cards[0];

  // Ephemeral "found" stamp: fires only when the collected count grows, not on every model tick.
  const collectedCount = model.cards.filter((c) => c.collected).length;
  const previousCount = useRef(collectedCount);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    if (collectedCount <= previousCount.current) {
      previousCount.current = collectedCount;
      return;
    }
    previousCount.current = collectedCount;
    setStamped(true);
    const timer = setTimeout(() => setStamped(false), 3000);
    return () => clearTimeout(timer);
  }, [collectedCount]);

  const currentCityName = model.cities.find((c) => c.id === model.cityId)?.label ?? 'City';
  const hintCost = activeCard?.nextHintCostMs;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Bar: Left Objective Chips | Center Compact Timer | Right City & Controls */}
      <header className="flex items-start justify-between w-full">
        {/* Top-Left: Two Objective Chips */}
        <div className="pointer-events-auto flex flex-col gap-2 max-w-[280px] sm:max-w-xs">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Objectives">
            {model.cards.map((card, idx) => {
              const isSelected = activeCard?.targetId === card.targetId;
              return (
                <button
                  key={card.targetId}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => actions.onSelectObjective(card.targetId)}
                  className={`group min-h-[44px] px-2.5 py-1.5 rounded-xl border-2 font-bold text-xs flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none ${
                    card.collected
                      ? 'bg-[#78D896] text-[#12253B] border-[#12253B] shadow-[2px_2px_0px_0px_#12253B]'
                      : isSelected
                      ? 'bg-[#FFC857] text-[#12253B] border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] scale-105'
                      : 'bg-[#FFF6E5]/90 text-[#12253B] border-[#12253B]/30 hover:bg-white'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/70 flex items-center justify-center text-[10px]">
                    {card.collected ? <CheckIcon size={12} className="text-[#047857]" /> : idx + 1}
                  </span>
                  <span className="truncate max-w-[90px] sm:max-w-[120px]">{card.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Clue Popout */}
          {activeCard && (
            <div className="passport-card p-3 relative shadow-md glint-fade-in">
              <div className="flex items-start gap-2">
                <div className="p-1 bg-white rounded-lg border border-[#12253B]/20 shrink-0">
                  <TargetCollectibleIcon kind={activeCard.targetId} size={26} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-[#19A7A0] tracking-wider">
                      {activeCard.collected ? 'Found' : 'Active clue'}
                    </span>
                    {activeCard.hintTier > 0 && !activeCard.collected && (
                      <span className="text-[10px] font-bold text-[#B45309]">
                        Hints {activeCard.hintTier}/3
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#12253B] leading-tight mt-0.5">
                    "{activeCard.clue}"
                  </p>
                </div>
              </div>

              {/* Inked stamp if collected */}
              {activeCard.collected && (
                <div className="mt-2 pt-1 border-t border-dashed border-[#12253B]/20 flex justify-end">
                  <PassportStamp label="COLLECTED" variant="teal" size="sm" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Center: Compact Timer */}
        <div className="pointer-events-auto bg-[#12253B] text-[#FFF6E5] px-4 py-1.5 rounded-2xl border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#24B8E8] flex flex-col items-center">
          <span className="glint-tabular text-lg sm:text-xl font-black tracking-tight text-[#FFC857]">
            {formatTime(model.adjustedMs)}
          </span>
          {model.penaltyMs > 0 ? (
            <span className="text-[10px] font-bold text-[#FF655B] -mt-0.5">
              {formatPenalty(model.penaltyMs)} pen.
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-white/60 -mt-0.5 uppercase tracking-wider">
              Speedrun Time
            </span>
          )}
        </div>

        {/* Top-Right: City Badge & Game Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Current City indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF6E5] text-[#12253B] rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] text-xs font-black">
            <span aria-hidden="true">📍</span>
            <span>{currentCityName}</span>
            {model.practice && <span className="ml-1 text-[#B45309]">Practice</span>}
          </div>

          {/* Pause Button */}
          <button
            type="button"
            onClick={actions.onPause}
            className="min-h-[44px] min-w-[44px] p-2 bg-[#FFF6E5] hover:bg-white text-[#12253B] rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            title="Pause run"
            aria-label="Pause run"
          >
            <PauseIcon size={16} />
          </button>
        </div>
      </header>

      {/* Center of Screen: Keep completely clear! Only ephemeral collection stamp banner if triggered */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {stamped && (
          <div className="pointer-events-none animate-stamp-slam bg-[#FFF6E5]/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border-3 border-[#12253B] shadow-2xl flex flex-col items-center text-center">
            <PassportStamp label="TARGET FOUND!" variant="gold" size="lg" animated />
            <span className="text-xs font-black text-[#12253B] mt-2 uppercase tracking-wider">
              Keep moving!
            </span>
          </div>
        )}
      </div>

      {/* Bottom Bar: Action HUD (Map / Hint / Globe) */}
      <footer className="w-full flex flex-col gap-2">
        <p className="self-center text-[11px] font-semibold text-[#FFF6E5] bg-[#12253B]/75 px-3 py-1 rounded-full glint-compact-hide">
          {touch ? 'Drag the stick to move.' : 'WASD or arrow keys to move.'} Walk into a glint to collect it.
        </p>
        <div className="w-full flex items-end justify-between pointer-events-auto gap-2">
        {/* Left: Return to Globe button */}
        <button
          type="button"
          onClick={actions.onGlobe}
          className="inline-flex items-center min-h-[44px] gap-2 px-3 sm:px-4 py-2.5 bg-[#12253B] hover:bg-[#1b3452] active:translate-y-0.5 text-[#FFF6E5] font-extrabold text-xs sm:text-sm rounded-xl border-2 border-white/20 shadow-lg focus-visible:ring-2 focus-visible:ring-[#24B8E8] outline-none"
        >
          <GlobeIcon size={18} className="text-[#24B8E8]" />
          <span>Globe</span>
        </button>

        {/* Right: Hint + Map Action cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hint Button */}
          {activeCard && !activeCard.collected && (
            <button
              type="button"
              onClick={() => onOpenHintModal(activeCard.targetId)}
              aria-label={hintCost ? `Hints for ${activeCard.title}, next costs ${Math.round(hintCost / 1000)} seconds` : `Hints for ${activeCard.title}`}
              className="inline-flex items-center min-h-[44px] gap-2 px-3 sm:px-4 py-2.5 bg-[#FFC857] hover:bg-[#ffd373] active:translate-y-0.5 text-[#12253B] font-extrabold text-xs sm:text-sm rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#19A7A0] outline-none"
            >
              <SparkleHintIcon size={18} />
              <span>
                {hintCost ? `Hint ${formatPenalty(hintCost)}` : `Hints ${activeCard.hintTier}/3`}
              </span>
            </button>
          )}

          {/* Map Overlay Button */}
          <button
            type="button"
            onClick={() => actions.onMap(true)}
            className="inline-flex items-center min-h-[44px] gap-2 px-3.5 sm:px-5 py-2.5 bg-[#FFF6E5] hover:bg-white active:translate-y-0.5 text-[#12253B] font-black text-xs sm:text-sm rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
          >
            <MapIcon size={18} className="text-[#19A7A0]" />
            <span>Map</span>
          </button>
        </div>
        </div>
      </footer>
    </div>
  );
}
