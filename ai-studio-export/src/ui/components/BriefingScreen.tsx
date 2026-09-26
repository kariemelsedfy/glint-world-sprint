import React from 'react';
import { UIModel, UIActions } from '@/contracts/game';
import { TargetCollectibleIcon } from './Icons';
import { PassportStamp } from './PassportStamp';

interface BriefingScreenProps {
  model: UIModel;
  actions: UIActions;
}

export function BriefingScreen({ model, actions }: BriefingScreenProps) {
  const currentLevel = model.levels.find((l) => l.id === model.levelId) || model.levels[0];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between pointer-events-auto max-w-4xl mx-auto w-full">
        <button
          type="button"
          onClick={actions.onMenu}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF6E5] hover:bg-white text-[#12253B] font-bold text-xs rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
        >
          <span>←</span>
          <span>Back to Menu</span>
        </button>

        <div className="text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#24B8E8] bg-[#12253B] px-3 py-1 rounded-full border border-white/20">
            Trial: {currentLevel?.title || 'Active Trial'}
          </span>
        </div>

        <div className="text-right">
          <PassportStamp label="BRIEFING" variant="gold" size="sm" />
        </div>
      </header>

      {/* Main Content: Mission Objective & 2 Clue Cards */}
      <main className="my-auto max-w-3xl mx-auto w-full py-4 pointer-events-auto">
        {/* Fantasy kicker banner */}
        <div className="text-center mb-5">
          <h1 className="text-xl sm:text-2xl font-black text-[#12253B] bg-[#FFF6E5]/95 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#12253B] inline-block font-display">
            Find both treasures. Fastest adjusted time wins.
          </h1>
          <p className="mt-1 text-xs font-semibold text-[#12253B]/70 bg-white/70 px-3 py-0.5 rounded-full inline-block">
            Clock has not started · Inspect your clues before launching
          </p>
        </div>

        {/* The Two Illustrated Clue Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {model.cards.map((card, idx) => (
            <div
              key={card.targetId}
              className="passport-card p-4 sm:p-5 flex flex-col justify-between border-2 border-[#12253B] relative overflow-hidden"
            >
              {/* Card top badge */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#12253B]/20">
                <span className="text-[11px] font-black tracking-wider uppercase text-[#19A7A0] bg-[#19A7A0]/10 px-2 py-0.5 rounded">
                  Target #{idx + 1}
                </span>
                <span className="text-[11px] font-bold text-[#12253B]/60">
                  Target Object
                </span>
              </div>

              {/* Clue illustration + text */}
              <div className="my-4 flex items-start gap-3.5">
                <div className="p-2.5 bg-white rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#24B8E8] shrink-0">
                  <TargetCollectibleIcon kind={card.targetId} size={36} />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-extrabold text-[#12253B] leading-tight">
                    {card.title}
                  </h2>
                  <p className="mt-1.5 text-xs text-[#12253B]/80 font-medium leading-relaxed bg-white/60 p-2 rounded-lg border border-[#12253B]/10">
                    "{card.clue}"
                  </p>
                </div>
              </div>

              {/* Card bottom hint preview indicator */}
              <div className="pt-2 text-[11px] font-semibold text-[#12253B]/70 flex items-center justify-between">
                <span>Location: Unknown (Paris or Giza)</span>
                <span className="text-[#B45309] font-bold">Hints available in-city</span>
              </div>
            </div>
          ))}
        </div>

        {/* Controls Summary Bar */}
        <div className="mt-4 bg-[#12253B]/90 backdrop-blur-md text-[#FFF6E5] rounded-xl p-3 border-2 border-white/20 shadow-lg flex flex-wrap items-center justify-around gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="bg-[#24B8E8] text-[#12253B] px-1.5 py-0.5 rounded font-black text-[10px]">
              WASD / ARROWS
            </span>
            <span className="opacity-90">Steer Miniature Explorer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-[#FFC857] text-[#12253B] px-1.5 py-0.5 rounded font-black text-[10px]">
              SPACE / TOUCH
            </span>
            <span className="opacity-90">Collect Replica</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-[#78D896] text-[#12253B] px-1.5 py-0.5 rounded font-black text-[10px]">
              M / MAP
            </span>
            <span className="opacity-90">Open City Map</span>
          </div>
        </div>
      </main>

      {/* Go Button Footer */}
      <footer className="w-full max-w-sm mx-auto pointer-events-auto">
        <button
          type="button"
          onClick={actions.onGo}
          className="w-full py-4 px-8 rounded-2xl bg-[#78D896] hover:bg-[#6ed08c] active:translate-y-0.5 text-[#12253B] font-black text-xl border-3 border-[#12253B] shadow-[4px_4px_0px_0px_#12253B] flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all cursor-pointer"
        >
          <span>GO! START CLOCK</span>
          <span className="text-2xl leading-none">⚡</span>
        </button>
      </footer>
    </div>
  );
}
