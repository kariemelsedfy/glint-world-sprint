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

  // Helper coordinate mapper to 0..100 percentage or SVG coords
  const mapX = (x: number) => ((x - bounds.minX) / width) * 100;
  const mapZ = (z: number) => ((z - bounds.minZ) / height) * 100;
  const mapRadiusX = (r: number) => (r / width) * 100;

  const playerPercentX = mapX(player[0]);
  const playerPercentZ = mapZ(player[1]);

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
            aria-label="Close map"
          >
            Close ✕
          </button>
        </header>

        {/* Map Body: Map Canvas & Legend */}
        <div className="flex-1 p-3 sm:p-5 overflow-auto flex flex-col items-center justify-center bg-[#F9F3E8]">
          <div className="relative w-full aspect-square max-h-[60vh] max-w-[560px] bg-[#FFFBF0] border-2 border-[#12253B] rounded-2xl shadow-inner overflow-hidden">
            {/* SVG Render */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <pattern id="toyGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#EAE2D2" strokeWidth="0.5" />
                </pattern>
              </defs>

              <rect width="100" height="100" fill="url(#toyGrid)" />

              {/* Roads */}
              {roads.map((road, idx) => (
                <rect
                  key={`road-${idx}`}
                  x={mapX(road.minX)}
                  y={mapZ(road.minZ)}
                  width={Math.max(mapX(road.maxX) - mapX(road.minX), 1)}
                  height={Math.max(mapZ(road.maxZ) - mapZ(road.minZ), 1)}
                  fill="#DFD7C7"
                  stroke="#CEC3B0"
                  strokeWidth="0.4"
                />
              ))}

              {/* City Blockers / Buildings */}
              {blockers.map((b) => (
                <rect
                  key={b.id}
                  x={mapX(b.minX)}
                  y={mapZ(b.minZ)}
                  width={Math.max(mapX(b.maxX) - mapX(b.minX), 1)}
                  height={Math.max(mapZ(b.maxZ) - mapZ(b.minZ), 1)}
                  fill="#C6BAA8"
                  stroke="#12253B"
                  strokeWidth="0.5"
                  rx="0.5"
                />
              ))}

              {/* Landmarks */}
              {landmarks.map((l) => {
                const cx = mapX(l.center[0]);
                const cz = mapZ(l.center[1]);
                return (
                  <g key={l.id}>
                    <rect
                      x={mapX(l.footprint.minX)}
                      y={mapZ(l.footprint.minZ)}
                      width={Math.max(mapX(l.footprint.maxX) - mapX(l.footprint.minX), 2)}
                      height={Math.max(mapZ(l.footprint.maxZ) - mapZ(l.footprint.minZ), 2)}
                      fill="#FFC857"
                      stroke="#12253B"
                      strokeWidth="0.6"
                      rx="0.8"
                    />
                    <circle cx={cx} cy={cz} r="1.5" fill="#12253B" />
                    {l.label && (
                      <text
                        x={cx}
                        y={cz - 2.5}
                        textAnchor="middle"
                        fontSize="2.8"
                        fontWeight="bold"
                        fill="#12253B"
                        fontFamily="sans-serif"
                      >
                        {l.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Broad Amber Search Areas */}
              {searchAreas.map((sa, idx) => {
                const cx = mapX(sa.center[0]);
                const cz = mapZ(sa.center[1]);
                const rad = mapRadiusX(sa.radius);
                return (
                  <g key={`search-area-${idx}`}>
                    <circle
                      cx={cx}
                      cy={cz}
                      r={rad}
                      fill="#FFC857"
                      fillOpacity="0.25"
                      stroke="#D97706"
                      strokeWidth="1.2"
                      strokeDasharray="3 1.5"
                    />
                    <circle cx={cx} cy={cz} r="1.5" fill="#D97706" />
                  </g>
                );
              })}

              {/* Player Position Indicator */}
              <g transform={`translate(${playerPercentX}, ${playerPercentZ})`}>
                {/* Glow ring */}
                <circle r="4.5" fill="#24B8E8" fillOpacity="0.3" />
                <circle r="2.8" fill="#24B8E8" stroke="#12253B" strokeWidth="1" />
                <polygon points="0,-4 2.5,2 0,0.8 -2.5,2" fill="#FF655B" stroke="#12253B" strokeWidth="0.6" />
              </g>
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
