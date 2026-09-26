/**
 * BOOTSTRAP placeholder overlay created by A0 so every screen exists at CONTRACT_READY.
 * Owner after CONTRACT_READY: A5, who replaces this with the adapted AI Studio export
 * (ai-studio-export/src/ui) against the same UIModel/UIActions contract.
 * Presentational only: no timers, no rules, no store access.
 */
import type { ReactNode } from 'react';
import type { MapVM, UIActions, UIModel } from '@/shared/contracts';
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

      {model.map && <MapOverlay map={model.map} onClose={() => actions.onMap(false)} />}

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

/** Top-down plan drawn straight from the city definition: +X east, +Z south, so north is up. */
function MapOverlay({ map, onClose }: { readonly map: MapVM; readonly onClose: () => void }): ReactNode {
  const { minX, maxX, minZ, maxZ } = map.bounds;
  const width = maxX - minX;
  const height = maxZ - minZ;

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#12253b]/80 p-6">
      <Panel>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-black">{map.cityLabel} — map</h2>
          <button type="button" className="glint-button text-xs" onClick={onClose}>
            Close
          </button>
        </div>
        <svg
          role="img"
          aria-label={`${map.cityLabel} map`}
          viewBox={`${minX} ${minZ} ${width} ${height}`}
          className="mt-3 h-[60vh] w-[60vh] max-h-[70vw] max-w-[70vw] rounded-xl bg-[#1d3a5c]"
        >
          {map.roads.map((road, index) => (
            <rect
              key={`road-${index}`}
              x={road.minX}
              y={road.minZ}
              width={road.maxX - road.minX}
              height={road.maxZ - road.minZ}
              fill="#2f5580"
            />
          ))}
          {map.searchAreas.map((area) => (
            <circle
              key={area.targetId}
              cx={area.center[0]}
              cy={area.center[1]}
              r={area.radius}
              fill="#ffd166"
              fillOpacity={0.18}
              stroke="#ffd166"
              strokeWidth={0.8}
            />
          ))}
          {map.blockers.map((blocker) => (
            <rect
              key={blocker.id}
              x={blocker.minX}
              y={blocker.minZ}
              width={blocker.maxX - blocker.minX}
              height={blocker.maxZ - blocker.minZ}
              fill="#0f2036"
            />
          ))}
          {map.landmarks.map((landmark) => (
            <g key={landmark.id}>
              <rect
                x={landmark.footprint.minX}
                y={landmark.footprint.minZ}
                width={landmark.footprint.maxX - landmark.footprint.minX}
                height={landmark.footprint.maxZ - landmark.footprint.minZ}
                fill="none"
                stroke="#fff6e5"
                strokeOpacity={0.5}
                strokeWidth={0.6}
              />
              {landmark.label && (
                <text
                  x={landmark.center[0]}
                  y={landmark.center[1]}
                  fill="#fff6e5"
                  fontSize={4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {landmark.label}
                </text>
              )}
            </g>
          ))}
          <circle cx={map.player[0]} cy={map.player[1]} r={2.2} fill="#ff655b" />
        </svg>
        <p className="mt-2 text-xs opacity-70">North is up. Movement is held while the map is open.</p>
      </Panel>
    </div>
  );
}
