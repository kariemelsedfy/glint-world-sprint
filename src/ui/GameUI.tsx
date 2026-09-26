/**
 * BOOTSTRAP placeholder overlay created by A0 so every screen exists at CONTRACT_READY.
 * Owner after CONTRACT_READY: A5, who replaces this with the adapted AI Studio export
 * (ai-studio-export/src/ui) against the same UIModel/UIActions contract.
 * Presentational only: no timers, no rules, no store access.
 */
import type { ReactNode } from 'react';
import type { UIActions, UIModel } from '@/shared/contracts';
import { formatMs } from '@/shared/format';

export interface GameUIProps {
  readonly model: UIModel;
  readonly actions: UIActions;
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto max-w-xl rounded-2xl bg-[#fff6e5]/95 p-6 text-[#12253b] shadow-xl">
      {children}
    </div>
  );
}

export function GameUI({ model, actions }: GameUIProps) {
  const { phase } = model;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 font-sans">
      <div className="flex items-start justify-between gap-4">
        {(phase === 'globe' || phase === 'city') && (
          <div className="pointer-events-auto rounded-xl bg-[#12253b] px-3 py-2 text-[#fff6e5] tabular-nums">
            <strong>{formatMs(model.adjustedMs)}</strong>
            <span className="ml-2 text-xs opacity-80">penalty {formatMs(model.penaltyMs)}</span>
            {model.practice && <span className="ml-2 text-xs text-[#ffc857]">practice</span>}
          </div>
        )}
        {(phase === 'globe' || phase === 'city') && (
          <div className="pointer-events-auto flex gap-2">
            {phase === 'city' && (
              <button className="glint-button" type="button" onClick={() => actions.onMap(model.map === null)}>
                Map
              </button>
            )}
            {phase === 'city' && (
              <button className="glint-button" type="button" onClick={actions.onGlobe}>
                Globe
              </button>
            )}
            <button className="glint-button" type="button" onClick={actions.onPause}>
              Pause
            </button>
          </div>
        )}
      </div>

      <div className="flex items-end justify-center">
        {phase === 'menu' && (
          <Panel>
            <h1 className="text-3xl font-black">GLINT World Sprint</h1>
            <p className="mt-2 text-sm">Pick a trial, read the clues, find both treasures.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {model.levels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  className="glint-button"
                  onClick={() => actions.onSelectLevel(level.id)}
                >
                  {level.title}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {phase === 'briefing' && (
          <Panel>
            <h2 className="text-2xl font-black">Briefing</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {model.cards.map((card) => (
                <li key={card.targetId}>
                  <strong>{card.title}</strong> — {card.clue}
                </li>
              ))}
            </ul>
            <button type="button" className="glint-button mt-4" onClick={actions.onGo}>
              Go
            </button>
          </Panel>
        )}

        {phase === 'globe' && (
          <Panel>
            <div className="flex flex-wrap gap-2">
              {model.cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className="glint-button"
                  onClick={() => actions.onSelectCity(city.id)}
                >
                  Fly to {city.label}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {model.cards.map((card) => (
                <li key={card.targetId} className={card.collected ? 'line-through opacity-60' : ''}>
                  {card.title} — {card.clue}
                  {!card.collected && card.nextHintLabel && (
                    <button
                      type="button"
                      className="glint-button ml-2 text-xs"
                      onClick={() => actions.onHint(card.targetId)}
                    >
                      {card.nextHintLabel}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {phase === 'travel' && (
          <Panel>
            <p className="text-lg font-bold">Travelling…</p>
          </Panel>
        )}

        {phase === 'city' && (
          <Panel>
            <ul className="space-y-1 text-sm">
              {model.cards.map((card) => (
                <li key={card.targetId} className={card.collected ? 'line-through opacity-60' : ''}>
                  {card.title} — {card.clue}
                  {card.purchasedHints.map((hint) => (
                    <em key={hint} className="ml-2 opacity-80">
                      {hint}
                    </em>
                  ))}
                  {!card.collected && card.nextHintLabel && (
                    <button
                      type="button"
                      className="glint-button ml-2 text-xs"
                      onClick={() => actions.onHint(card.targetId)}
                    >
                      {card.nextHintLabel}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs opacity-70">WASD or arrow keys to move. Walk into a glint to collect it.</p>
          </Panel>
        )}

        {phase === 'results' && model.result && (
          <Panel>
            <h2 className="text-2xl font-black">{model.result.medal.toUpperCase()}</h2>
            <p className="mt-1 tabular-nums">Adjusted {formatMs(model.result.adjustedMs)}</p>
            <p className="text-sm tabular-nums opacity-80">
              Active {formatMs(model.result.activeMs)} · hints {formatMs(model.result.hintPenaltyMs)} · travel{' '}
              {formatMs(model.result.travelPenaltyMs)}
            </p>
            {model.result.practice && <p className="text-sm text-[#ff655b]">Practice run — not saved as a best.</p>}
            {model.result.sessionOnly && <p className="text-xs opacity-70">Session-only best (storage unavailable).</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" className="glint-button" onClick={actions.onRetry}>
                Retry
              </button>
              <button type="button" className="glint-button" onClick={actions.onNextTrial}>
                Next trial
              </button>
              <button type="button" className="glint-button" onClick={actions.onMenu}>
                Menu
              </button>
            </div>
          </Panel>
        )}
      </div>

      {model.paused && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#12253b]/70">
          <Panel>
            <h2 className="text-2xl font-black">Paused</h2>
            <p className="text-sm">Pausing marks this run as practice.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="glint-button" onClick={actions.onResume}>
                Resume
              </button>
              <button type="button" className="glint-button" onClick={actions.onMenu}>
                Menu
              </button>
              <button
                type="button"
                className="glint-button"
                onClick={() => actions.onSettings({ reducedMotion: !model.settings.reducedMotion })}
              >
                Reduced motion: {model.settings.reducedMotion ? 'on' : 'off'}
              </button>
              <button
                type="button"
                className="glint-button"
                onClick={() => actions.onSettings({ muted: !model.settings.muted })}
              >
                Sound: {model.settings.muted ? 'off' : 'on'}
              </button>
            </div>
          </Panel>
        </div>
      )}

      {model.statusMessage && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-4 mx-auto w-fit rounded-xl bg-[#ff655b] px-4 py-2 text-[#fff6e5]">
          {model.statusMessage}
        </div>
      )}
    </div>
  );
}
