import type { CityId } from '@/shared/contracts';
import { ArcadePanel } from './Arcade';
import { CompassIcon } from './Icons';

interface TravelOverlayProps {
  cityId: CityId | null;
  cityLabel: string | null;
  statusMessage: string | null;
}

export function TravelOverlay({ cityId, cityLabel, statusMessage }: TravelOverlayProps) {
  const cityName = cityLabel ?? (cityId ? cityId : 'the globe');

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-40 pointer-events-auto bg-[rgba(113,70,197,0.92)] ar-stripes flex flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="relative mb-5 animate-cloud-drift">
        <div className="w-24 h-24 bg-[var(--ar-yellow)] rounded-[18px] border-[3px] border-[var(--ar-ink)] shadow-[0_6px_0_0_var(--ar-ink)] flex items-center justify-center">
          <CompassIcon size={48} className="animate-spin-slow text-[var(--ar-ink)]" />
        </div>
      </div>

      <ArcadePanel pad="md" className="max-w-sm w-full">
        <span className="ar-chip ar-chip-cyan mb-2">
          <span className="ar-chip-value text-sm">Travelling…</span>
        </span>
        <h2 className="ar-display text-3xl sm:text-4xl m-0">{cityId ? `Entering ${cityName}` : 'Back to the globe'}</h2>
        <p className="text-xs font-semibold mt-2">{statusMessage ?? 'Loading the streets and landmarks'}</p>

        <div className="mt-4 w-full h-4 bg-[var(--ar-ink)] rounded-[6px] border-2 border-[var(--ar-ink)] overflow-hidden" aria-hidden="true">
          <div className="h-full bg-[var(--ar-yellow)] animate-transit w-1/4" />
        </div>
      </ArcadePanel>
    </div>
  );
}
