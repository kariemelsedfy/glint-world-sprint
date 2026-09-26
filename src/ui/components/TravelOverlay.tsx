import type { CityId } from '@/shared/contracts';

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
      className="absolute inset-0 z-40 pointer-events-auto bg-[#24B8E8]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none"
    >
      {/* Playful Floating Toy Clouds */}
      <div className="relative mb-6 animate-cloud-drift">
        <div className="w-24 h-24 bg-[#FFF6E5] rounded-full border-3 border-[#12253B] shadow-[4px_4px_0px_0px_#12253B] flex items-center justify-center">
          <CompassIcon size={44} className="animate-spin-slow" />
        </div>
      </div>

      <div className="bg-[#FFF6E5] p-5 sm:p-6 rounded-3xl border-3 border-[#12253B] shadow-[6px_6px_0px_0px_#12253B] max-w-sm w-full">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#19A7A0] block mb-1">
          Travelling…
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-[#12253B]">
          {cityId ? `Entering ${cityName}` : 'Back to the globe'}
        </h2>
        <p className="text-xs text-[#12253B]/70 font-semibold mt-2">
          {statusMessage ?? 'Loading the streets and landmarks'}
        </p>

        {/* Playful transit loader bar */}
        <div className="mt-4 w-full h-3 bg-[#12253B]/10 rounded-full border border-[#12253B]/30 overflow-hidden p-0.5">
          <div className="h-full bg-[#FFC857] rounded-full animate-transit w-1/4" />
        </div>
      </div>
    </div>
  );
}
