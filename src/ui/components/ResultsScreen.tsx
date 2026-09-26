import type { ResultVM, UIActions, UIModel } from '@/shared/contracts';
import { formatTime, formatScore } from '../format';
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
    <div className="absolute inset-0 pointer-events-auto flex flex-col items-center p-3 sm:p-6 select-none overflow-y-auto">
      <div className="glint-results-card bg-[#FFF6E5] w-full max-w-xl rounded-3xl border-3 border-[#12253B] shadow-[6px_6px_0px_0px_#12253B] overflow-hidden flex flex-col pointer-events-auto my-auto">
        {/* Top Header / Status Stamp */}
        <header className="p-4 sm:px-6 bg-[#FFF6E5] border-b-2 border-[#12253B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#78D896] border border-[#12253B]" />
            <h1 className="text-base sm:text-lg font-black text-[#12253B] uppercase tracking-tight">
              Results · {currentLevel?.title ?? 'Trial'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {result.practice ? (
              <PassportStamp label="PRACTICE" variant="navy" size="sm" />
            ) : result.isNewBest ? (
              <PassportStamp label="NEW BEST" variant="gold" size="sm" animated />
            ) : (
              <PassportStamp label="COMPLETE" variant="teal" size="sm" />
            )}
          </div>
        </header>

        <div className="glint-results-body flex flex-col">
        {/* Hero Section: Medal + Primary Adjusted Time */}
        <div className="glint-results-hero p-5 sm:p-6 text-center bg-white/70 border-b-2 border-[#12253B] flex flex-col items-center">
          <div className="mb-2">
            <MedalBadge medal={result.medal} size={64} className="hover:scale-105 transition-transform" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-[#12253B] mb-1">
            {result.medal === 'complete' ? 'Completed' : `${result.medal} medal`}
          </h2>

          <p className="flex flex-col items-center mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#19A7A0] mb-0.5" aria-hidden="true">
              Adjusted time
            </span>
            <span className="glint-tabular text-4xl sm:text-5xl font-black text-[#12253B] tracking-tight">
              <span className="sr-only">Adjusted </span>
              {formatTime(result.adjustedMs)}
            </span>
          </p>

          {/* Points earned */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFC857]/30 border border-[#B45309]/30 rounded-full text-xs font-black text-[#12253B]">
            <span>{formatScore(result.points)} points</span>
          </div>
        </div>

        {/* Time and Penalty Breakdown Grid */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <p className="glint-tabular bg-white p-3 rounded-2xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] text-center text-xs sm:text-sm font-bold text-[#12253B]">
            Active <span className="font-black">{formatTime(result.activeMs)}</span> · hints{' '}
            <span className="font-black text-[#FF655B]">{formatTime(result.hintPenaltyMs)}</span> · travel{' '}
            <span className="font-black text-[#FF655B]">{formatTime(result.travelPenaltyMs)}</span>
          </p>
          {result.practice && (
            <p className="text-xs font-bold text-[#FF655B] text-center">Practice run — not saved as a best.</p>
          )}

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
                  {result.practice ? 'Practice runs are not saved' : result.sessionOnly ? 'Session only (storage unavailable)' : 'Saved on this device'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="glint-tabular text-base font-black text-[#12253B]">
                {result.bestMs !== null ? formatTime(result.bestMs) : 'First run'}
              </span>
            </div>
          </div>

          {/* Action Buttons: Retry & Next Trial */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={actions.onRetry}
              className="w-full min-h-[44px] py-3.5 px-6 rounded-2xl bg-[#FFC857] hover:bg-[#ffcf66] text-[#12253B] font-black text-base border-3 border-[#12253B] shadow-[4px_4px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#19A7A0] outline-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Retry</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={actions.onNextTrial}
                className="min-h-[44px] py-2.5 px-4 rounded-xl bg-[#78D896] hover:bg-[#68cb87] text-[#12253B] font-extrabold text-xs sm:text-sm border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all"
              >
                Next trial ➜
              </button>

              <button
                type="button"
                onClick={actions.onMenu}
                className="min-h-[44px] py-2.5 px-4 rounded-xl bg-[#FFF6E5] hover:bg-white text-[#12253B] font-extrabold text-xs sm:text-sm border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
