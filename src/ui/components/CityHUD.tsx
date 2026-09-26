import { useEffect, useRef, useState } from 'react';
import type { UIModel, UIActions } from '@/shared/contracts';
import { Clock } from './Clock';
import { MapIcon, GlobeIcon, PauseIcon } from './Icons';
import { ObjectiveCard } from './ObjectiveCard';
import { PassportStamp } from './PassportStamp';

interface CityHUDProps {
  model: UIModel;
  actions: UIActions;
  touch?: boolean;
}

export function CityHUD({ model, actions, touch = false }: CityHUDProps) {
  const activeId =
    model.cards.find((c) => c.selected)?.targetId ??
    model.cards.find((c) => !c.collected)?.targetId ??
    model.cards[0]?.targetId;

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

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none">
      <header className="flex items-start justify-between w-full gap-2">
        <ul
          className="pointer-events-auto flex flex-col gap-1.5 w-[min(19rem,58vw)] max-h-[calc(100vh-9rem)] overflow-y-auto pr-0.5"
          aria-label="Objectives"
        >
          {model.cards.map((card, idx) => (
            <ObjectiveCard
              key={card.targetId}
              card={card}
              index={idx}
              expanded={card.targetId === activeId && !card.collected}
              onSelect={actions.onSelectObjective}
              onHint={actions.onHint}
            />
          ))}
        </ul>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF6E5] text-[#12253B] rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] text-xs font-black">
            <span aria-hidden="true">📍</span>
            <span>{currentCityName}</span>
          </div>
          <Clock adjustedMs={model.adjustedMs} penaltyMs={model.penaltyMs} practice={model.practice} size="lg" />
          <button
            type="button"
            onClick={actions.onPause}
            className="min-h-[44px] min-w-[44px] p-2 bg-[#FFF6E5] hover:bg-white text-[#12253B] rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            title="Pause"
            aria-label="Pause"
          >
            <PauseIcon size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {stamped && (
          <div className="pointer-events-none animate-stamp-slam bg-[#FFF6E5]/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border-3 border-[#12253B] shadow-2xl flex flex-col items-center text-center">
            <PassportStamp label="TARGET FOUND!" variant="gold" size="lg" animated />
            <span className="text-xs font-black text-[#12253B] mt-2 uppercase tracking-wider">Keep moving!</span>
          </div>
        )}
      </div>

      <footer className="w-full flex flex-col gap-2">
        <p className="self-center text-[11px] font-semibold text-[#FFF6E5] bg-[#12253B]/75 px-3 py-1 rounded-full glint-compact-hide">
          {touch ? 'Drag the stick to move.' : 'WASD or arrow keys to move.'} Walk into a glint to collect it.
        </p>
        <div className="w-full flex items-end justify-between pointer-events-auto gap-2">
          <button
            type="button"
            onClick={actions.onGlobe}
            className="inline-flex items-center min-h-[44px] gap-2 px-3 sm:px-4 py-2.5 bg-[#12253B] hover:bg-[#1b3452] active:translate-y-0.5 text-[#FFF6E5] font-extrabold text-xs sm:text-sm rounded-xl border-2 border-white/20 shadow-lg focus-visible:ring-2 focus-visible:ring-[#24B8E8] outline-none"
          >
            <GlobeIcon size={18} className="text-[#24B8E8]" />
            <span>Globe</span>
          </button>

          <button
            type="button"
            onClick={() => actions.onMap(true)}
            className="inline-flex items-center min-h-[44px] gap-2 px-3.5 sm:px-5 py-2.5 bg-[#FFF6E5] hover:bg-white active:translate-y-0.5 text-[#12253B] font-black text-xs sm:text-sm rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
          >
            <MapIcon size={18} className="text-[#19A7A0]" />
            <span>Map</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
