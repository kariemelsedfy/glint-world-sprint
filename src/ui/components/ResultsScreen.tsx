import type { ResultVM, UIActions, UIModel } from '@/shared/contracts';
import { formatTime, formatScore } from '../format';
import { ArcadeButton, ArcadePanel, PhotoCard, StatChip } from './Arcade';
import { MedalBadge } from './Icons';

interface ResultsScreenProps {
  result: ResultVM;
  model: UIModel;
  actions: UIActions;
}

const MEDAL_TONE = { gold: 'yellow', silver: 'cream', bronze: 'pink', complete: 'cyan' } as const;

export function ResultsScreen({ result, model, actions }: ResultsScreenProps) {
  const currentLevel = model.levels.find((l) => l.id === model.levelId) || model.levels[0];
  const bestDelta = result.bestMs !== null && !result.isNewBest ? result.adjustedMs - result.bestMs : null;

  return (
    <div className="absolute inset-0 pointer-events-auto flex flex-col items-center ar-safe select-none overflow-y-auto bg-[rgba(33,19,51,0.55)]">
      <ArcadePanel pad="none" className="glint-results-card w-full max-w-xl overflow-hidden flex flex-col my-auto">
        <header className="px-4 py-3 sm:px-6 border-b-[3px] border-[var(--ar-ink)] bg-[var(--ar-lavender)] flex items-center justify-between gap-2">
          <h1 className="ar-display text-xl sm:text-2xl m-0 truncate">Results · {currentLevel?.title ?? 'Trial'}</h1>
          <span className={`ar-chip ${result.practice ? 'ar-chip-ink' : result.isNewBest ? 'ar-chip-yellow' : 'ar-chip-cyan'}`}>
            <span className="ar-chip-value text-xs">{result.practice ? 'Practice' : result.isNewBest ? 'New best!' : 'Complete'}</span>
          </span>
        </header>

        <div className="glint-results-body flex flex-col">
          <div className="glint-results-hero px-4 py-3 sm:px-6 text-center border-b-[3px] border-[var(--ar-ink)] flex flex-col items-center gap-1.5">
            <MedalBadge medal={result.medal} size={60} />
            <h2 className="ar-display text-2xl m-0 uppercase text-[var(--ar-purple)]">
              {result.medal === 'complete' ? 'Completed' : `${result.medal} medal`}
            </h2>
            <p className="flex flex-col items-center m-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--ar-ink-soft)]" aria-hidden="true">
                Adjusted time
              </span>
              <span className="glint-tabular ar-display text-5xl leading-none">
                <span className="sr-only">Adjusted </span>
                {formatTime(result.adjustedMs)}
              </span>
            </p>
            <StatChip label="Score" value={`${formatScore(result.points)} pts`} tone={MEDAL_TONE[result.medal]} />
          </div>

          <div className="px-4 py-3 sm:px-6 space-y-2.5">
            <p className="glint-tabular ar-panel ar-panel-ink ar-pad-sm text-center text-xs sm:text-sm font-bold m-0 text-[var(--ar-cream)]">
              Active <span className="font-black text-[var(--ar-yellow)]">{formatTime(result.activeMs)}</span> · hints{' '}
              <span className="font-black text-[var(--ar-pink)]">{formatTime(result.hintPenaltyMs)}</span> · travel{' '}
              <span className="font-black text-[var(--ar-cyan)]">{formatTime(result.travelPenaltyMs)}</span>
            </p>

            <div className="ar-panel ar-panel-lavender ar-pad-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-extrabold block truncate">Best on this device · {currentLevel?.title}</span>
                <span className="text-[11px] font-semibold text-[var(--ar-ink-soft)]">
                  {result.practice ? 'Practice run — paused, not saved as a best' : result.sessionOnly ? 'Session only (storage unavailable)' : 'Saved on this device'}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="glint-tabular ar-display text-2xl block leading-none">
                  {result.bestMs !== null ? formatTime(result.bestMs) : 'First run'}
                </span>
                {bestDelta !== null && (
                  <span className={`glint-tabular text-[11px] font-extrabold ${bestDelta > 0 ? 'text-[var(--ar-pink)]' : 'text-[var(--ar-purple)]'}`}>
                    {bestDelta > 0 ? `+${formatTime(bestDelta)} behind` : 'matched'}
                  </span>
                )}
              </div>
            </div>

            {model.cards.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-2 list-none m-0 p-0 glint-compact-hide" aria-label="Targets found">
                {model.cards.map((card) => (
                  <li key={card.targetId}>
                    <PhotoCard src={card.imageUrl} alt={card.imageAlt} size="sm" collected={card.collected} />
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2.5 pt-1">
              <ArcadeButton tone="yellow" size="lg" block onClick={actions.onRetry}>
                Retry
              </ArcadeButton>
              <div className="grid grid-cols-2 gap-2.5">
                <ArcadeButton tone="cyan" size="sm" onClick={actions.onNextTrial}>
                  Next expedition
                </ArcadeButton>
                <ArcadeButton tone="cream" size="sm" onClick={actions.onMenu}>
                  Menu
                </ArcadeButton>
              </div>
            </div>
          </div>
        </div>
      </ArcadePanel>
    </div>
  );
}
