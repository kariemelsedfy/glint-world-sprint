import { useEffect } from 'react';
import type { MapVM, UIActions } from '@/shared/contracts';
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
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-3 sm:p-6 bg-[#12253B]/70 backdrop-blur-sm select-none"
    >
      <div className="bg-[#FFF6E5] w-full max-w-3xl rounded-3xl border-3 border-[#12253B] shadow-[6px_6px_0px_0px_#12253B] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Map Header */}
        <header className="p-4 sm:px-6 bg-[#FFF6E5] border-b-2 border-[#12253B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#24B8E8] text-[#12253B] rounded-xl border-2 border-[#12253B]">
              <CompassIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#12253B] tracking-tight">
                  {cityLabel} map
                </h2>
                <span className="text-[10px] font-black uppercase text-[#19A7A0] bg-[#19A7A0]/15 px-2 py-0.5 rounded-full glint-compact-hide">
                  {landmarks.some((l) => l.label !== null) ? 'Names revealed' : 'Names hidden'}
                </span>
              </div>
              <p className="text-xs text-[#12253B]/70 font-medium">
                North is up. Amber zones are where your remaining glints may be; hints shrink them.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            className="min-h-[44px] min-w-[44px] p-2 sm:px-3 sm:py-1.5 bg-[#12253B] hover:bg-[#203a59] text-white font-black text-sm rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#FFC857] focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            aria-label="Close"
          >
            Close ✕
          </button>
        </header>

        {/* Map Body: Map Canvas & Legend */}
        <div className="flex-1 p-3 sm:p-5 overflow-auto flex flex-col items-center justify-center bg-[#F9F3E8]">
          <div className="relative w-full aspect-square max-h-[60vh] max-w-[560px] glint-map-frame bg-[#FFFBF0] border-2 border-[#12253B] rounded-2xl shadow-inner overflow-hidden">
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
            <div className="absolute top-3 right-3 bg-[#FFF6E5] border-2 border-[#12253B] rounded-xl px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#12253B] flex items-center gap-1.5 text-xs font-black text-[#12253B]">
              <CompassIcon size={18} />
              <span>NORTH</span>
            </div>
          </div>
        </div>

        {/* Legend Footer */}
        <footer className="p-3 sm:px-6 bg-[#FFF6E5] border-t-2 border-[#12253B] flex flex-wrap items-center justify-between text-xs font-bold gap-3">
          <div className="flex items-center gap-4 text-[#12253B]">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#24B8E8] border border-[#12253B]" />
              <span>You</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FFC857]/60 border border-dashed border-[#D97706]" />
              <span>Search zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-[#FFC857] border border-[#12253B]" />
              <span>Landmark</span>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            className="min-h-[44px] px-4 py-1.5 bg-[#FFC857] hover:bg-[#ffd577] text-[#12253B] rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] font-black focus-visible:ring-2 focus-visible:ring-[#19A7A0]"
          >
            Back to the city
          </button>
        </footer>
      </div>
    </div>
  );
}
