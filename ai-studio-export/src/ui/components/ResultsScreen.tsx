import React from 'react';
import { ResultVM, UIActions, UIModel } from '@/contracts/game';
import { formatTime, formatPenalty, formatScore } from '../utils/formatTime';
import { MedalBadge, TimerIcon } from './Icons';
import { PassportStamp } from './PassportStamp';

interface ResultsScreenProps {
  result: ResultVM;
  model: UIModel;
  actions: UIActions;
}

export function ResultsScreen({ result, model, actions }: ResultsScreenProps) {
  const currentLevel = model.levels.find((l) => l.id === model.levelId) || model.levels[0];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center p-3 sm:p-6 select-none overflow-y-auto">
      <div className="bg-[#FFF6E5] w-full max-w-xl rounded-3xl border-3 border-[#12253B] shadow-[6px_6px_0px_0px_#12253B] overflow-hidden flex flex-col pointer-events-auto my-auto">
        {/* Top Header / Status Stamp */}
        <header className="p-4 sm:px-6 bg-[#FFF6E5] border-b-2 border-[#12253B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#78D896] border border-[#12253B]" />
            <h1 className="text-base sm:text-lg font-black text-[#12253B] uppercase tracking-tight">
              Speedrun Debrief
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {result.practice ? (
              <PassportStamp label="PRACTICE RUN" variant="navy" size="sm" />
            ) : result.isNewBest ? (
              <PassportStamp label="NEW PERSONAL BEST" variant="gold" size="sm" animated />
            ) : (
              <PassportStamp label="TRIAL COMPLETED" variant="teal" size="sm" />
            )}
          </div>
        </header>

        {/* Hero Section: Medal + Primary Adjusted Time */}
        <div className="p-5 sm:p-6 text-center bg-white/70 border-b-2 border-[#12253B] flex flex-col items-center">
          <div className="mb-2">
            <MedalBadge medal={result.medal} size={64} className="hover:scale-105 transition-transform" />
          </div>

          <span className="text-xs font-black uppercase tracking-widest text-[#19A7A0] mb-0.5">
            Official Adjusted Time
          </span>
          <div className="glint-tabular text-4xl sm:text-5xl font-black text-[#12253B] tracking-tight mb-2">
            {formatTime(result.adjustedMs)}
          </div>

          {/* Points earned */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFC857]/30 border border-[#B45309]/30 rounded-full text-xs font-black text-[#12253B]">
            <span>⭐</span>
            <span>{formatScore(result.points)} POINTS</span>
            <span>⭐</span>
          </div>
        </div>

        {/* Time and Penalty Breakdown Grid */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Raw Active Time */}
            <div className="bg-white p-3 rounded-2xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B]">
              <span className="text-[10px] font-extrabold uppercase text-[#12253B]/70 block">
                Raw Drive Time
              </span>
              <span className="glint-tabular text-sm sm:text-base font-black text-[#12253B]">
                {formatTime(result.activeMs)}
              </span>
            </div>

            {/* Hint Penalties */}
            <div className="bg-white p-3 rounded-2xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B]">
              <span className="text-[10px] font-extrabold uppercase text-[#12253B]/70 block">
                Hint Penalty
              </span>
              <span className="glint-tabular text-sm sm:text-base font-black text-[#FF655B]">
                {formatPenalty(result.hintPenaltyMs)}
              </span>
            </div>

            {/* Travel Penalties */}
            <div className="bg-white p-3 rounded-2xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B]">
              <span className="text-[10px] font-extrabold uppercase text-[#12253B]/70 block">
                Transit Penalty
              </span>
              <span className="glint-tabular text-sm sm:text-base font-black text-[#FF655B]">
                {formatPenalty(result.travelPenaltyMs)}
              </span>
            </div>
          </div>

          {/* Best on This Device & Session Status */}
          <div className="bg-white/80 p-3.5 rounded-2xl border-2 border-[#12253B] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#FFC857] text-[#12253B] rounded-xl border border-[#12253B]">
                <TimerIcon size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-[#12253B] block">
                  Best on this device ({currentLevel?.title})
                </span>
                <span className="text-[11px] font-semibold text-[#12253B]/60">
                  {result.sessionOnly ? 'Stored for this session · Local device' : 'Local device high score'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="glint-tabular text-base font-black text-[#12253B]">
                {result.bestMs ? formatTime(result.bestMs) : 'First run'}
              </span>
            </div>
          </div>

          {/* Action Buttons: Retry & Next Trial */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={actions.onRetry}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#FFC857] hover:bg-[#ffcf66] text-[#12253B] font-black text-base border-3 border-[#12253B] shadow-[4px_4px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#19A7A0] outline-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>↺ RETRY THIS TRIAL</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={actions.onNextTrial}
                className="py-2.5 px-4 rounded-xl bg-[#78D896] hover:bg-[#68cb87] text-[#12253B] font-extrabold text-xs sm:text-sm border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all"
              >
                Next Trial ➜
              </button>

              <button
                type="button"
                onClick={actions.onMenu}
                className="py-2.5 px-4 rounded-xl bg-[#FFF6E5] hover:bg-white text-[#12253B] font-extrabold text-xs sm:text-sm border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
