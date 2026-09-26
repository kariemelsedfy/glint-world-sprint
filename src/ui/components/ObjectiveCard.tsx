import { useEffect, useRef, useState } from 'react';
import type { ObjectiveCardVM, TargetId } from '@/shared/contracts';
import { HINT_COST_MS } from '@/shared/contracts';
import { formatPenalty } from '../format';
import { ArcadeButton, ArcadePanel, PhotoCard } from './Arcade';
import { SparkleHintIcon } from './Icons';

/** Ignore re-presses this soon after a purchase so a double-click buys one tier, not two. */
const HINT_DEBOUNCE_MS = 700;

interface ObjectivePanelProps {
  card: ObjectiveCardVM;
  index: number;
  onHint: (id: TargetId) => void;
  compact?: boolean;
}

/**
 * The selected objective: photo, clue, tier ladder with real prices and the next-hint button.
 * Presentation only — collection state, tier, label and price all come from the view model.
 */
export function ObjectivePanel({ card, index, onHint, compact = false }: ObjectivePanelProps) {
  const [cooling, setCooling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const buyHint = () => {
    if (cooling || card.collected || card.nextHintLabel === null) return;
    onHint(card.targetId);
    setCooling(true);
    timer.current = setTimeout(() => setCooling(false), HINT_DEBOUNCE_MS);
  };

  return (
    <ArcadePanel pad="sm" className="flex flex-col gap-2" aria-label={`Objective ${index + 1}: ${card.title}`}>
      <div className="flex gap-2.5 items-start">
        <PhotoCard src={card.imageUrl} alt={card.imageAlt} size={compact ? 'sm' : 'md'} collected={card.collected} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="ar-chip ar-chip-yellow min-h-[24px] px-2 py-0">
              <span className="ar-chip-label">Target</span>
              <span className="ar-chip-value text-sm">{index + 1}</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ar-purple)]">
              {card.collected ? 'Found' : `Hints ${card.hintTier}/3`}
            </span>
          </div>
          <h2 className="ar-display text-lg sm:text-xl m-0 mt-1 leading-none truncate">{card.title}</h2>
          <p className="mt-1 text-[11px] sm:text-xs font-semibold leading-snug">“{card.clue}”</p>
        </div>
      </div>

      {!card.collected && (
        <div className="pt-2 border-t-[3px] border-dashed border-[var(--ar-ink-faint)] space-y-1.5">
          <div className="grid grid-cols-3 gap-1" role="list" aria-label="Hint tiers">
            {HINT_COST_MS.map((cost, idx) => {
              const tier = idx + 1;
              const bought = card.hintTier >= tier;
              const next = card.hintTier + 1 === tier;
              return (
                <div
                  role="listitem"
                  key={tier}
                  aria-current={next ? 'step' : undefined}
                  className={`rounded-[6px] border-2 border-[var(--ar-ink)] px-1 py-0.5 text-center text-[9px] font-extrabold leading-tight ${
                    bought
                      ? 'bg-[var(--ar-purple)] text-[var(--ar-cream)]'
                      : next
                        ? 'bg-[var(--ar-yellow)]'
                        : 'bg-white/60 text-[var(--ar-ink-soft)] border-[var(--ar-ink-faint)]'
                  }`}
                >
                  <span className="block uppercase tracking-wider">Tier {tier}</span>
                  <span className="block glint-tabular">{bought ? 'Bought' : `+${formatPenalty(cost)}`}</span>
                </div>
              );
            })}
          </div>

          {card.purchasedHints.length > 0 && (
            <ul className="space-y-1 list-none m-0 p-0">
              {card.purchasedHints.map((hint, idx) => (
                <li key={idx} className="text-[11px] font-bold bg-white/80 rounded-[6px] px-2 py-1 border-2 border-[var(--ar-ink-faint)]">
                  <span className="text-[var(--ar-purple)] font-black mr-1">{idx + 1}.</span>
                  {hint}
                </li>
              ))}
            </ul>
          )}

          {card.nextHintLabel !== null ? (
            <ArcadeButton tone="pink" size="sm" block onClick={buyHint} disabled={cooling} icon={<SparkleHintIcon size={16} />}>
              {card.nextHintLabel}
            </ArcadeButton>
          ) : (
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-center text-[var(--ar-ink-soft)]">All hints bought</p>
          )}
        </div>
      )}
    </ArcadePanel>
  );
}

interface ObjectiveTabProps {
  card: ObjectiveCardVM;
  index: number;
  active: boolean;
  onSelect?: (id: TargetId) => void;
}

/** Small photo tab for a non-selected objective. */
export function ObjectiveTab({ card, index, active, onSelect }: ObjectiveTabProps) {
  const label = `${card.collected ? 'Found' : 'Select'} objective ${index + 1}: ${card.title}`;
  return (
    <button
      type="button"
      onClick={onSelect ? () => onSelect(card.targetId) : undefined}
      disabled={!onSelect}
      aria-pressed={active}
      aria-label={label}
      title={card.title}
      className="ar-tab"
    >
      <PhotoCard src={card.imageUrl} alt="" size="xs" collected={card.collected} selected={active} />
      <span className="ar-tab-num" aria-hidden="true">
        {index + 1}
      </span>
    </button>
  );
}

/** Legacy name kept for GlobeHUD; renders the full panel. */
export const ObjectiveCard = ObjectivePanel;
