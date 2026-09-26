import { useEffect, useRef, useState } from 'react';
import type { ObjectiveCardVM, TargetId } from '@/shared/contracts';
import { HINT_COST_MS } from '@/shared/contracts';
import { formatPenalty } from '../format';
import { CheckIcon, SparkleHintIcon, TargetCollectibleIcon } from './Icons';

/** Ignore re-presses this soon after a purchase so a double-click buys one tier, not two. */
const HINT_DEBOUNCE_MS = 700;

interface ObjectiveCardProps {
  card: ObjectiveCardVM;
  index: number;
  /** Compact cards show one line; expanded cards show the clue, tier ladder and hint button. */
  expanded: boolean;
  onSelect?: (id: TargetId) => void;
  onHint: (id: TargetId) => void;
}

/**
 * One objective, rendered as a passport card. Presentation only: collection state, hint tier,
 * next label and price all come from the view model; the button only reports a purchase.
 */
export function ObjectiveCard({ card, index, expanded, onSelect, onHint }: ObjectiveCardProps) {
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

  const title = (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="w-4 h-4 shrink-0 rounded-full bg-white/80 border border-[#12253B]/30 flex items-center justify-center text-[10px] font-black text-[#12253B]">
        {card.collected ? <CheckIcon size={11} className="text-[#047857]" /> : index + 1}
      </span>
      <span className="truncate text-xs font-extrabold text-[#12253B]">{card.title}</span>
    </span>
  );

  return (
    <li
      className={`passport-card p-2.5 sm:p-3 ${
        card.collected ? 'line-through decoration-[#12253B]/50 opacity-85 bg-[#78D896]/25' : 'bg-[#FFF6E5]'
      } ${card.selected && !card.collected ? 'ring-2 ring-[#FFC857]' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="p-1 bg-white rounded-lg border border-[#12253B]/20 shrink-0">
          <TargetCollectibleIcon kind={card.targetId} size={expanded ? 26 : 20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {onSelect && !card.collected && !expanded ? (
              <button
                type="button"
                onClick={() => onSelect(card.targetId)}
                className="min-h-[32px] -my-1 text-left rounded-lg focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none hover:underline"
              >
                {title}
              </button>
            ) : (
              title
            )}
            <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-[#19A7A0]">
              {card.collected ? 'Found' : expanded ? 'Active' : `Hints ${card.hintTier}/3`}
            </span>
          </div>

          {(expanded || !card.collected) && (
            <p className="text-[11px] text-[#12253B]/85 italic mt-0.5 leading-tight">
              “{card.clue}”
            </p>
          )}
        </div>
      </div>

      {expanded && !card.collected && (
        <div className="mt-2 pt-2 border-t border-dashed border-[#12253B]/25 space-y-1.5">
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
                  className={`rounded-md border px-1 py-0.5 text-center text-[9px] font-bold leading-tight ${
                    bought
                      ? 'bg-[#19A7A0] text-white border-[#12253B]'
                      : next
                        ? 'bg-[#FFC857] text-[#12253B] border-[#12253B]'
                        : 'bg-white/60 text-[#12253B]/60 border-[#12253B]/20'
                  }`}
                >
                  <span className="block uppercase tracking-wider">Tier {tier}</span>
                  <span className="block glint-tabular">{bought ? 'Bought' : formatPenalty(cost)}</span>
                </div>
              );
            })}
          </div>

          {card.purchasedHints.length > 0 && (
            <div className="space-y-1">
              {card.purchasedHints.map((hint, idx) => (
                <p key={idx} className="text-[11px] font-semibold text-[#12253B] bg-white/80 rounded-lg px-2 py-1 border border-[#12253B]/20">
                  <span className="text-[#19A7A0] font-black mr-1">{idx + 1}.</span>
                  {hint}
                </p>
              ))}
            </div>
          )}

          {card.nextHintLabel !== null && (
            <button
              type="button"
              onClick={buyHint}
              disabled={cooling}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-[#FFC857] hover:bg-[#ffd373] disabled:opacity-70 active:translate-y-0.5 text-[#12253B] font-extrabold text-xs border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#19A7A0] outline-none"
            >
              <SparkleHintIcon size={16} />
              {card.nextHintLabel}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
