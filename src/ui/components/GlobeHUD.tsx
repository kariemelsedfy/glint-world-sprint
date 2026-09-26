import { useState } from 'react';
import type { UIModel, UIActions } from '@/shared/contracts';
import { Clock } from './Clock';
import { PauseIcon } from './Icons';
import { ObjectiveCard } from './ObjectiveCard';

interface GlobeHUDProps {
  model: UIModel;
  actions: UIActions;
}

export function GlobeHUD({ model, actions }: GlobeHUDProps) {
  const [cluesExpanded, setCluesExpanded] = useState(true);
  const found = model.cards.filter((c) => c.collected).length;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none">
      <header className="flex items-start justify-between w-full gap-2">
        <div className="pointer-events-auto w-[min(20rem,58vw)] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCluesExpanded((prev) => !prev)}
            className="self-start inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 bg-[#FFF6E5] hover:bg-white text-[#12253B] font-extrabold text-xs rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            aria-expanded={cluesExpanded}
          >
            <span>
              Clues ({found}/{model.cards.length} found)
            </span>
            <span className="text-[10px]" aria-hidden="true">
              {cluesExpanded ? '▲' : '▼'}
            </span>
          </button>

          {cluesExpanded && (
            <ul className="space-y-2 glint-fade-in max-h-[calc(100vh-11rem)] overflow-y-auto pr-0.5" aria-label="Objectives">
              {model.cards.map((card, idx) => (
                <ObjectiveCard
                  key={card.targetId}
                  card={card}
                  index={idx}
                  expanded={!card.collected}
                  onHint={actions.onHint}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Clock adjustedMs={model.adjustedMs} penaltyMs={model.penaltyMs} practice={model.practice} />
          <button
            type="button"
            onClick={actions.onPause}
            className="min-h-[44px] min-w-[44px] p-2 bg-[#FFF6E5] hover:bg-white text-[#12253B] rounded-xl flex items-center justify-center border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            title="Pause"
            aria-label="Pause"
          >
            <PauseIcon size={16} />
          </button>
        </div>
      </header>

      <footer className="w-full max-w-md mx-auto pointer-events-auto">
        <div className="bg-[#12253B]/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl border-2 border-white/20 shadow-2xl text-center">
          <p className="text-xs font-bold text-[#FFF6E5] mb-2.5 glint-compact-hide">
            Pick a destination — landing adds a small travel penalty
          </p>

          <div className="grid grid-cols-2 gap-3">
            {model.cities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => actions.onSelectCity(city.id)}
                aria-label={`Fly to ${city.label}`}
                className="group min-h-[44px] p-2 sm:p-3 bg-[#FFF6E5] hover:bg-[#FFE9C2] active:translate-y-0.5 rounded-xl border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#FFC857] flex flex-col items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#24B8E8] outline-none transition-all cursor-pointer"
              >
                <span className="font-black text-sm text-[#12253B]">Fly to {city.label}</span>
                <span className="text-[10px] font-semibold text-[#12253B]/70 glint-compact-hide">
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
