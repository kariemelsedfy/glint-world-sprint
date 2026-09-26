import { useState } from 'react';
import { useIsPortrait } from '../hooks';
import { RotateDeviceIcon } from './Icons';

export function OrientationNotice() {
  const isPortrait = useIsPortrait();
  const [dismissed, setDismissed] = useState(false);

  if (!isPortrait || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto ar-panel ar-panel-ink ar-pad-sm text-[var(--ar-cream)] flex items-center gap-2.5 max-w-[90vw] text-xs font-extrabold glint-fade-in"
    >
      <div className="p-1 bg-[var(--ar-yellow)] text-[var(--ar-ink)] rounded-[6px] border-2 border-[var(--ar-ink)]">
        <RotateDeviceIcon size={18} />
      </div>
      <div className="leading-tight flex-1">
        <span>Rotate to landscape for the best controls</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="min-h-[44px] min-w-[44px] text-[var(--ar-lavender)] hover:text-white px-1.5 py-0.5 rounded text-sm font-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[var(--ar-cyan)] outline-none"
        aria-label="Dismiss rotation suggestion"
      >
        ✕
      </button>
    </div>
  );
}
