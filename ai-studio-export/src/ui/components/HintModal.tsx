import React from 'react';
import { ObjectiveCardVM, TargetId, UIActions } from '@/contracts/game';
import { formatPenalty } from '../utils/formatTime';
import { SparkleHintIcon, TargetCollectibleIcon } from './Icons';
import { PassportStamp } from './PassportStamp';

interface HintModalProps {
  cards: readonly ObjectiveCardVM[];
  activeTargetId: TargetId;
  onSelectTarget: (id: TargetId) => void;
  onClose: () => void;
  actions: UIActions;
}

export function HintModal({
  cards,
  activeTargetId,
  onSelectTarget,
  onClose,
  actions,
}: HintModalProps) {
  const card = cards.find((c) => c.targetId === activeTargetId) || cards[0];

  const handleBuyHint = () => {
    if (!card || card.collected || !card.nextHintCostMs) return;
    actions.onHint(card.targetId);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Intelligence Hints Desk"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#12253B]/70 backdrop-blur-sm select-none"
    >
      <div className="bg-[#FFF6E5] w-full max-w-lg rounded-3xl border-3 border-[#12253B] shadow-[6px_6px_0px_0px_#12253B] overflow-hidden flex flex-col">
        {/* Header */}
        <header className="p-4 sm:px-6 bg-[#FFF6E5] border-b-2 border-[#12253B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#FFC857] text-[#12253B] rounded-xl border-2 border-[#12253B]">
              <SparkleHintIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#12253B]">Treasure Intelligence</h2>
              <p className="text-xs text-[#12253B]/70 font-semibold">
                Exchange time penalty for tactical coordinates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:px-3 sm:py-1 bg-[#12253B] hover:bg-[#223d5d] text-white font-black text-xs rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#FFC857] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            aria-label="Close hints"
          >
            Done ✕
          </button>
        </header>

        {/* Tab switch between the two target cards */}
        <div className="flex border-b-2 border-[#12253B] bg-white/60 p-2 gap-2" role="tablist">
          {cards.map((c, idx) => {
            const isSelected = c.targetId === activeTargetId;
            return (
              <button
                key={c.targetId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectTarget(c.targetId)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 border-2 transition-all focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none ${
                  isSelected
                    ? 'bg-[#12253B] text-[#FFF6E5] border-[#12253B] shadow-[2px_2px_0px_0px_#24B8E8]'
                    : 'bg-[#FFF6E5] text-[#12253B] border-[#12253B]/30 hover:border-[#12253B]'
                }`}
              >
                <span>Target #{idx + 1}: {c.title}</span>
                {c.collected && <PassportStamp label="FOUND" variant="teal" size="sm" />}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Card Clue Header */}
          <div className="flex items-start gap-3 bg-white/70 p-3 rounded-2xl border-2 border-[#12253B]">
            <div className="p-2 bg-[#FFF6E5] rounded-xl border border-[#12253B]/30 shrink-0">
              <TargetCollectibleIcon kind={card.targetId} size={30} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#19A7A0] tracking-wider">
                Initial Clue
              </span>
              <p className="text-xs font-extrabold text-[#12253B] leading-tight">
                "{card.clue}"
              </p>
            </div>
          </div>

          {/* Purchased Hints Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#12253B]/80">
                Purchased Intel ({card.purchasedHints.length} of 3 tiers)
              </span>
              <span className="text-[11px] font-bold text-[#19A7A0]">
                {card.collected ? 'Completed' : 'Permanent for this run'}
              </span>
            </div>

            {card.purchasedHints.length === 0 ? (
              <div className="p-3 bg-white/50 rounded-xl border-2 border-dashed border-[#12253B]/30 text-center text-xs text-[#12253B]/60 font-semibold">
                No hints unlocked for this target yet. Explore the city or purchase an intel tier below.
              </div>
            ) : (
              <div className="space-y-2">
                {card.purchasedHints.map((hint, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#78D896] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#19A7A0] text-white flex items-center justify-center font-black text-[10px]">
                        ✓
                      </span>
                      <span className="text-xs font-bold text-[#12253B]">
                        {hint}
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase text-[#78D896] bg-[#12253B] px-2 py-0.5 rounded">
                      Tier {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next Hint Cost & Action */}
          <div className="pt-2">
            {card.collected ? (
              <div className="p-3.5 bg-[#78D896]/20 border-2 border-[#78D896] rounded-2xl text-center">
                <PassportStamp label="TARGET REPLICA SECURED" variant="teal" size="md" />
                <p className="text-xs font-bold text-[#12253B] mt-1.5">
                  Great scouting! No further hints needed for this replica.
                </p>
              </div>
            ) : card.nextHintLabel && card.nextHintCostMs ? (
              <div className="bg-[#12253B] text-[#FFF6E5] p-4 rounded-2xl border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#FFC857]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFC857]">
                      Next Intel Available
                    </span>
                    <h3 className="text-sm font-black text-white">
                      {card.nextHintLabel}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#FF655B] bg-[#FF655B]/20 px-2 py-0.5 rounded-full">
                      {formatPenalty(card.nextHintCostMs)} Penalty
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-white/70 mb-3 leading-relaxed">
                  Adds {Math.round(card.nextHintCostMs / 1000)} seconds to your adjusted speedrun clock. Prices are incremental and will narrow your survey area.
                </p>

                <button
                  type="button"
                  onClick={handleBuyHint}
                  className="w-full py-2.5 px-4 bg-[#FFC857] hover:bg-[#ffcf66] text-[#12253B] font-black text-sm rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#24B8E8] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#24B8E8] outline-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SparkleHintIcon size={16} />
                  <span>Reveal {card.nextHintLabel} · {formatPenalty(card.nextHintCostMs)}</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-white/60 border-2 border-[#12253B]/20 rounded-2xl text-center text-xs font-bold text-[#12253B]/70">
                All available hints unlocked for this target! Check your city map.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
