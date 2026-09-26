import type { UIModel, UIActions } from '@/shared/contracts';
import { formatTime } from '../format';
import { readLevelBest, trialMeta, trialObjectCount } from '../trialMeta';
import { MedalBadge } from './Icons';
import { SettingsBar } from './SettingsBar';
import { TicketArt } from './TicketArt';

interface MenuScreenProps {
  model: UIModel;
  actions: UIActions;
}

export const TAGLINE = 'See the clue. Find the place. Beat the clock.';

export function MenuScreen({ model, actions }: MenuScreenProps) {
  const selectedLevel = model.levelId;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between ar-safe select-none">
      {/* Top: wordmark + tagline (left), settings (right). Centre stays clear for the 3D globe. */}
      <header className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto">
          <h1 className="ar-wordmark text-5xl sm:text-6xl lg:text-7xl m-0">
            GLINT{' '}
            <span className="block text-[0.42em] tracking-[0.18em] text-[var(--ar-cream)]">World Sprint</span>
          </h1>
          <p className="mt-3 inline-block ar-panel ar-pad-sm text-xs sm:text-sm font-extrabold tracking-wide">{TAGLINE}</p>
        </div>
        <SettingsBar settings={model.settings} onSettings={actions.onSettings} />
      </header>

      <div className="flex-1 pointer-events-none" aria-hidden="true" />

      {/* Bottom: six collectible travel tickets. Selecting one opens its briefing; hover never advances. */}
      <footer className="w-full pointer-events-auto">
        <div className="flex items-end justify-between mb-2 px-1">
          <span className="ar-display text-[var(--ar-cream)] text-lg [text-shadow:2px_2px_0_var(--ar-ink)]">Pick an expedition</span>
          <span className="glint-compact-hide text-[11px] font-extrabold text-[var(--ar-cream)] [text-shadow:1px_1px_0_var(--ar-ink)]">
            {model.levels.length} trials · {model.cities.length} cities · destinations stay secret
          </span>
        </div>
        <ul className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 list-none m-0 p-0" aria-label="Trial selector">
          {model.levels.map((level, idx) => {
            const meta = trialMeta(level.id);
            const best = readLevelBest(level);
            const active = level.id === selectedLevel;
            return (
              <li key={level.id} className="min-w-0">
                <button
                  type="button"
                  className="ar-ticket"
                  aria-pressed={active}
                  aria-label={level.title}
                  onClick={() => actions.onSelectLevel(level.id)}
                >
                  <span className="ar-ticket-num" aria-hidden="true">
                    {idx + 1}
                  </span>
                  <div className="ar-ticket-art">
                    <TicketArt art={meta.art} accent={meta.accent} />
                  </div>
                  <div className="ar-ticket-body">
                    <span className="ar-ticket-title truncate">{level.title}</span>
                    <span className="ar-ticket-meta">
                      {meta.difficulty} · {meta.duration} · {trialObjectCount(level.id)} objects
                    </span>
                    <span className="ar-ticket-best glint-compact-hide">
                      {best.bestMs !== null ? (
                        <>
                          {best.medal && best.medal !== 'complete' && <MedalBadge medal={best.medal} size={14} />}
                          <span className="glint-tabular">Best {formatTime(best.bestMs)}</span>
                        </>
                      ) : (
                        'First expedition'
                      )}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </footer>
    </div>
  );
}
