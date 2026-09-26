import { useEffect } from 'react';
import type { MapVM, UIActions } from '@/shared/contracts';
import { ArcadeButton } from './Arcade';
import { CompassIcon } from './Icons';

interface MapOverlayProps {
  map: MapVM;
  actions: UIActions;
}

/**
 * SVG city map. Pure projection of MapVM: roads, blockers, permitted search areas, landmarks
 * and the player. Landmark names render only when the adapter supplies a non-null label.
 */
export function MapOverlay({ map, actions }: MapOverlayProps) {
  const close = () => actions.onMap(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') actions.onMap(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  const { bounds, roads, blockers, landmarks, player, searchAreas, cityLabel } = map;
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxZ - bounds.minZ, 1);
  const unit = Math.max(width, height) / 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${cityLabel} map`}
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-3 sm:p-6 bg-[rgba(33,19,51,0.78)] ar-stripes select-none"
    >
      <div className="ar-panel ar-panel-cream ar-pad-none w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Map Header */}
        <header className="px-4 py-3 sm:px-6 bg-[var(--ar-lavender)] border-b-[3px] border-[var(--ar-ink)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[var(--ar-cyan)] rounded-[8px] border-[3px] border-[var(--ar-ink)] shrink-0">
              <CompassIcon size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="ar-display text-xl sm:text-2xl m-0 truncate">{cityLabel} map</h2>
                <span className="ar-chip ar-chip-ink min-h-0 py-0.5 px-2 glint-compact-hide">
                  <span className="ar-chip-value text-[10px]">{landmarks.some((l) => l.label !== null) ? 'Names revealed' : 'Names hidden'}</span>
                </span>
              </div>
              <p className="text-[11px] font-semibold m-0 glint-compact-hide">
                North is up. Amber zones are where your remaining glints may be; hints shrink them.
              </p>
            </div>
          </div>

          <ArcadeButton tone="ink" size="sm" onClick={close} aria-label="Close">
            Close ✕
          </ArcadeButton>
        </header>

        {/* Map Body: Map Canvas & Legend */}
        <div className="flex-1 p-3 sm:p-5 overflow-auto flex flex-col items-center justify-center">
          <div className="relative w-full aspect-square max-h-[60vh] max-w-[560px] glint-map-frame bg-[#FFFBF0] border-[3px] border-[var(--ar-ink)] rounded-[var(--ar-radius)] shadow-[0_5px_0_0_var(--ar-ink)] overflow-hidden">
            {/* SVG Render */}
            <svg
              role="img"
              aria-label={`${cityLabel} map`}
              viewBox={`${bounds.minX} ${bounds.minZ} ${width} ${height}`}
              className="w-full h-full"
            >
              <defs>
                <pattern id="toyGrid" width={unit * 10} height={unit * 10} patternUnits="userSpaceOnUse">
                  <path d={`M ${unit * 10} 0 L 0 0 0 ${unit * 10}`} fill="none" stroke="#EAE2D2" strokeWidth={unit * 0.5} />
                </pattern>
              </defs>

              <rect x={bounds.minX} y={bounds.minZ} width={width} height={height} fill="url(#toyGrid)" />

              {roads.map((road, idx) => (
                <rect
                  key={`road-${idx}`}
                  x={road.minX}
                  y={road.minZ}
                  width={road.maxX - road.minX}
                  height={road.maxZ - road.minZ}
                  fill="#DFD7C7"
                  stroke="#CEC3B0"
                  strokeWidth={unit * 0.4}
                />
              ))}

              {blockers.map((b) => (
                <rect
                  key={b.id}
                  x={b.minX}
                  y={b.minZ}
                  width={b.maxX - b.minX}
                  height={b.maxZ - b.minZ}
                  fill="#C6BAA8"
                  stroke="#12253B"
                  strokeWidth={unit * 0.5}
                  rx={unit * 0.5}
                />
              ))}

              {landmarks.map((l) => (
                <g key={l.id}>
                  <rect
                    x={l.footprint.minX}
                    y={l.footprint.minZ}
                    width={l.footprint.maxX - l.footprint.minX}
                    height={l.footprint.maxZ - l.footprint.minZ}
                    fill="#FFC857"
                    stroke="#12253B"
                    strokeWidth={unit * 0.6}
                    rx={unit * 0.8}
                  />
                  {l.label && (
                    <text
                      x={l.center[0]}
                      y={l.footprint.minZ - unit * 1.5}
                      textAnchor="middle"
                      fontSize={unit * 3.2}
                      fontWeight="bold"
                      fill="#12253B"
                      stroke="#FFFBF0"
                      strokeWidth={unit * 0.6}
                      paintOrder="stroke"
                      fontFamily="sans-serif"
                    >
                      {l.label}
                    </text>
                  )}
                </g>
              ))}

              {searchAreas.map((area) => (
                <circle
                  key={area.targetId}
                  cx={area.center[0]}
                  cy={area.center[1]}
                  r={area.radius}
                  fill="#ffd166"
                  fillOpacity={0.3}
                  stroke="#D97706"
                  strokeWidth={unit * 1}
                  strokeDasharray={`${unit * 3} ${unit * 1.5}`}
                />
              ))}

              <circle cx={player[0]} cy={player[1]} r={unit * 4} fill="#24B8E8" fillOpacity={0.3} />
              <circle cx={player[0]} cy={player[1]} r={2.2} fill="#24B8E8" stroke="#12253B" strokeWidth={unit * 0.6} />
            </svg>

            {/* Toy North Compass Badge in corner */}
            <div className="absolute top-3 right-3 ar-chip ar-chip-yellow min-h-0 py-1">
              <CompassIcon size={16} />
              <span className="ar-chip-value text-xs">North</span>
            </div>
          </div>
        </div>

        {/* Legend Footer */}
        <footer className="p-3 sm:px-6 border-t-[3px] border-[var(--ar-ink)] flex flex-wrap items-center justify-between text-xs font-extrabold gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#24B8E8] border-2 border-[var(--ar-ink)]" />
              <span>You</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FFC857]/60 border-2 border-dashed border-[#D97706]" />
              <span>Search zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-[#FFC857] border-2 border-[var(--ar-ink)]" />
              <span>Landmark</span>
            </div>
          </div>

          <ArcadeButton tone="yellow" size="sm" onClick={close}>
            Back to the city
          </ArcadeButton>
        </footer>
      </div>
    </div>
  );
}
