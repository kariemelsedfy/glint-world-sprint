import { useState } from 'react';
import type { UIModel, UIActions } from '@/shared/contracts';
import { ArcadeButton, ArcadePanel, StatChip } from './Arcade';
import { Clock } from './Clock';
import { CheckIcon, PauseIcon } from './Icons';
import { ObjectivePanel } from './ObjectiveCard';

interface GlobeHUDProps {
  model: UIModel;
  actions: UIActions;
}

export function GlobeHUD({ model, actions }: GlobeHUDProps) {
  const [cluesExpanded, setCluesExpanded] = useState(true);
  const found = model.cards.filter((c) => c.collected).length;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between ar-safe select-none">
      <header className="flex items-start justify-between w-full gap-2">
        <div className="pointer-events-auto w-[min(21rem,60vw)] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Clock adjustedMs={model.adjustedMs} penaltyMs={model.penaltyMs} practice={model.practice} />
            <StatChip label="Found" value={`${found}/${model.cards.length}`} tone="yellow" icon={<CheckIcon size={14} />} />
          </div>
          <ArcadeButton size="sm" className="self-start" onClick={() => setCluesExpanded((prev) => !prev)} aria-expanded={cluesExpanded}>
            Clues {cluesExpanded ? '▲' : '▼'}
          </ArcadeButton>

          {cluesExpanded && (
            <ul className="space-y-3 glint-fade-in max-h-[calc(100vh-14rem)] overflow-y-auto pr-0.5 pb-2 list-none m-0 p-0" aria-label="Objectives">
              {model.cards.map((card, idx) => (
                <li key={card.targetId} className={card.collected ? 'line-through' : ''}>
                  <ObjectivePanel card={card} index={idx} onHint={actions.onHint} compact />
                </li>
              ))}
            </ul>
          )}
        </div>

        <ArcadeButton
          square
          tone="ink"
          className="pointer-events-auto"
          onClick={actions.onPause}
          title="Pause"
          aria-label="Pause"
          icon={<PauseIcon size={16} />}
        />
      </header>

      <footer className="w-full max-w-2xl mx-auto pointer-events-auto">
        <ArcadePanel tone="ink" pad="sm" className="text-center">
          <p className="ar-display text-base text-[var(--ar-yellow)] m-0 mb-2 glint-compact-hide">
            Pick a destination · landing costs +5s
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {model.cities.map((city) => (
              <ArcadeButton
                key={city.id}
                tone={model.cityId === city.id ? 'purple' : 'cream'}
                size="sm"
                onClick={() => actions.onSelectCity(city.id)}
                aria-label={`Fly to ${city.label}`}
                className="flex-col gap-0 min-w-[7.5rem]"
              >
                <span>Fly to {city.label}</span>
                <span className="text-[9px] font-extrabold tracking-wider font-[var(--ar-font-body)] opacity-70 glint-compact-hide">
                  {model.cityId === city.id ? 'Last visited' : 'Land & search'}
                </span>
              </ArcadeButton>
            ))}
          </div>
        </ArcadePanel>
      </footer>
    </div>
  );
}
