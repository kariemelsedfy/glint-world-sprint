import { useState } from 'react';
import type { UIModel, UIActions } from '@/shared/contracts';
import { formatTime, formatPenalty } from '../format';
import { TargetCollectibleIcon, TimerIcon, PauseIcon } from './Icons';
import { PassportStamp } from './PassportStamp';

interface GlobeHUDProps {
  model: UIModel;
  actions: UIActions;
}

export function GlobeHUD({ model, actions }: GlobeHUDProps) {
  const [cluesExpanded, setCluesExpanded] = useState(true);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Header: Clue drawer toggle + Elapsed Time + Pause Button */}
      <header className="flex items-start justify-between w-full">
        {/* Left: Compact Clues Dock */}
        <div className="pointer-events-auto max-w-xs sm:max-w-sm flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCluesExpanded((prev) => !prev)}
            className="self-start inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 bg-[#FFF6E5] hover:bg-white text-[#12253B] font-extrabold text-xs rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            aria-expanded={cluesExpanded}
          >
            <span>Clues ({model.cards.filter((c) => c.collected).length}/{model.cards.length} found)</span>
            <span className="text-[10px]">{cluesExpanded ? '▲' : '▼'}</span>
          </button>

          {cluesExpanded && (
            <div className="space-y-2 glint-fade-in">
              {model.cards.map((card, idx) => (
                <div
                  key={card.targetId}
                  className={`passport-card p-2.5 sm:p-3 transition-opacity ${
                    card.collected ? 'opacity-85 bg-[#78D896]/20' : 'bg-[#FFF6E5]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-white rounded-lg border border-[#12253B]/20 shrink-0">
                      <TargetCollectibleIcon kind={card.targetId} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-[#12253B] truncate">
                          #{idx + 1} {card.title}
                        </span>
                        {card.collected && (
                          <PassportStamp label="FOUND" variant="teal" size="sm" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#12253B]/80 italic line-clamp-2 mt-0.5 leading-tight">
                        "{card.clue}"
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center/Right: Timer & Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Active Adjusted Timer */}
          <div className="bg-[#12253B] text-[#FFF6E5] px-3.5 py-1.5 rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#24B8E8] flex items-center gap-2">
            <TimerIcon size={16} className="text-[#FFC857]" />
            <div className="flex flex-col items-end leading-none">
              <span className="glint-tabular text-sm sm:text-base font-black tracking-tight text-[#FFC857]">
                {formatTime(model.adjustedMs)}
              </span>
              {model.penaltyMs > 0 && (
                <span className="text-[9px] font-bold text-[#FF655B]">
                  {formatPenalty(model.penaltyMs)} pen.
                </span>
              )}
            </div>
          </div>

          {/* Pause Button */}
          <button
            type="button"
            onClick={actions.onPause}
            className="min-h-[44px] min-w-[44px] p-2 bg-[#FFF6E5] hover:bg-white text-[#12253B] rounded-xl flex items-center justify-center border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            title="Pause game"
            aria-label="Pause game"
          >
            <PauseIcon size={16} />
          </button>
        </div>
      </header>

      {/* Center 3D globe area is clear */}
      <div className="flex-1 flex items-center justify-center pointer-events-none" />

      {/* Bottom: Accessible Paris / Giza city pins / selection buttons */}
      <footer className="w-full max-w-md mx-auto pointer-events-auto">
        <div className="bg-[#12253B]/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl border-2 border-white/20 shadow-2xl text-center">
          <p className="text-xs font-bold text-[#FFF6E5] mb-2.5">
            Pick a destination (entering a city adds a small travel penalty)
          </p>

          <div className="grid grid-cols-2 gap-3">
            {model.cities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => actions.onSelectCity(city.id)}
                aria-label={`Fly to ${city.label}`}
                className="group min-h-[44px] p-3 bg-[#FFF6E5] hover:bg-[#FFE9C2] active:translate-y-0.5 rounded-xl border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#FFC857] flex flex-col items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#24B8E8] outline-none transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#19A7A0] text-white flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform" aria-hidden="true">
                  ✈
                </div>
                <span className="font-black text-sm text-[#12253B]">
                  Fly to {city.label}
                </span>
                <span className="text-[10px] font-semibold text-[#12253B]/70">
                  {model.cityId === city.id ? 'Last visited' : 'Land and search'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
