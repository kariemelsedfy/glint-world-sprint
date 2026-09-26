import { useEffect, useRef, useState } from 'react';
import type { ObjectiveCardVM, UIModel, UIActions } from '@/shared/contracts';
import { ArcadeButton, Keycap, PhotoCard, StatChip } from './Arcade';
import { Clock } from './Clock';
import { MapIcon, GlobeIcon, PauseIcon, CheckIcon } from './Icons';
import { ObjectivePanel, ObjectiveTab } from './ObjectiveCard';

interface CityHUDProps {
  model: UIModel;
  actions: UIActions;
  touch?: boolean;
}

const TOAST_MS = 2600;

export function CityHUD({ model, actions, touch = false }: CityHUDProps) {
  const activeId =
    model.cards.find((c) => c.selected)?.targetId ??
    model.cards.find((c) => !c.collected)?.targetId ??
    model.cards[0]?.targetId;

  const collected = model.cards.filter((c) => c.collected);
  const collectedCount = collected.length;

  // Ephemeral "found" toast: fires only when the collected count grows, never on model ticks.
  const previousCount = useRef(collectedCount);
  const latestCollected = useRef<ObjectiveCardVM | null>(null);
  latestCollected.current = collected[collected.length - 1] ?? null;
  const [toast, setToast] = useState<ObjectiveCardVM | null>(null);
  useEffect(() => {
    if (collectedCount <= previousCount.current) {
      previousCount.current = collectedCount;
      return;
    }
    previousCount.current = collectedCount;
    setToast(latestCollected.current);
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [collectedCount]);

  const cityName = model.cities.find((c) => c.id === model.cityId)?.label ?? 'City';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between ar-safe select-none">
      <header className="flex items-start justify-between w-full gap-2">
        {/* Top-left: timer + found count + city */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Clock adjustedMs={model.adjustedMs} penaltyMs={model.penaltyMs} practice={model.practice} size="lg" />
          <StatChip label="Found" value={`${collectedCount}/${model.cards.length}`} tone="yellow" icon={<CheckIcon size={14} />} />
          <StatChip label="City" value={cityName} tone="cream" className="hidden sm:inline-flex" />
        </div>

        {/* Top-right: selected target panel + photo tabs + pause */}
        <div className="pointer-events-auto flex items-start gap-2">
          <ul
            className="flex flex-col items-end gap-2 w-[min(21rem,60vw)] max-h-[calc(100vh-8.5rem)] overflow-y-auto pl-2 pt-2 list-none m-0 p-0"
            aria-label="Objectives"
          >
            {model.cards.map((card, idx) => {
              const active = card.targetId === activeId;
              return (
                <li
                  key={card.targetId}
                  className={`${active ? 'w-full' : 'inline-flex'} ${card.collected ? 'line-through' : ''}`}
                  aria-current={active ? 'true' : undefined}
                >
                  {active ? (
                    <ObjectivePanel card={card} index={idx} onHint={actions.onHint} compact />
                  ) : (
                    <>
                      <span className="sr-only">{card.title}</span>
                      <ObjectiveTab card={card} index={idx} active={false} onSelect={card.collected ? undefined : actions.onSelectObjective} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <ArcadeButton square tone="ink" onClick={actions.onPause} title="Pause" aria-label="Pause" icon={<PauseIcon size={16} />} />
        </div>
      </header>

      {/* Centre: non-blocking found toast (pointer-events stay off so movement continues). */}
      <div className="flex-1 flex items-start justify-center pointer-events-none pt-2" aria-live="polite">
        {toast && (
          <div key={toast.targetId} className="ar-toast ar-panel ar-panel-lavender ar-pad-sm flex items-center gap-3">
            <PhotoCard src={toast.imageUrl} alt="" size="sm" collected className="ar-thumb-in" />
            <div>
              <span className="ar-display text-2xl text-[var(--ar-ink)] block">Found!</span>
              <span className="text-xs font-extrabold">{toast.title}</span>
            </div>
          </div>
        )}
      </div>

      <footer className="w-full flex flex-col gap-2">
        <p className="self-center inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--ar-cream)] bg-[var(--ar-ink)] border-2 border-[var(--ar-ink)] px-3 py-1 rounded-[6px] glint-compact-hide">
          {touch ? (
            'Drag the stick to move.'
          ) : (
            <>
              <Keycap>W</Keycap>
              <Keycap>A</Keycap>
              <Keycap>S</Keycap>
              <Keycap>D</Keycap>
              <span>WASD or arrow keys to move.</span>
            </>
          )}{' '}
          Walk into a glint to collect it.
        </p>
        <div className="w-full flex items-end justify-between pointer-events-auto gap-2">
          <div className="flex items-end gap-2">
            <ArcadeButton tone="ink" onClick={actions.onGlobe} icon={<GlobeIcon size={18} className="text-[var(--ar-cyan)]" />}>
              Globe
            </ArcadeButton>
            {/* Collected strip: found thumbnails land here. */}
            {collected.length > 0 && (
              <ul className="flex items-end gap-1.5 list-none m-0 p-0 glint-compact-hide" aria-label="Collected">
                {collected.map((card) => (
                  <li key={card.targetId} className="ar-thumb-in">
                    <PhotoCard src={card.imageUrl} alt={`Found: ${card.title}`} size="xs" collected />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ArcadeButton tone="cyan" onClick={() => actions.onMap(true)} icon={<MapIcon size={18} />}>
            Map
          </ArcadeButton>
        </div>
      </footer>
    </div>
  );
}
