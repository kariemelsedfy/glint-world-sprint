import React, { useState, useEffect } from 'react';
import { RotateDeviceIcon } from './Icons';

export function OrientationNotice() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check window dimensions
      if (typeof window !== 'undefined') {
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-[#12253B]/95 backdrop-blur-md text-[#FFF6E5] px-3.5 py-2 rounded-2xl border-2 border-[#FFC857] shadow-2xl flex items-center gap-2.5 max-w-[90vw] text-xs font-bold animate-in fade-in slide-in-from-top-2"
    >
      <div className="p-1 bg-[#FFC857] text-[#12253B] rounded-lg">
        <RotateDeviceIcon size={18} />
      </div>
      <div className="leading-tight flex-1">
        <span>Rotate device to landscape for full speedrun controls</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-white/60 hover:text-white px-1.5 py-0.5 rounded text-sm font-black focus-visible:ring-1 focus-visible:ring-white outline-none"
        aria-label="Dismiss rotation suggestion"
      >
        ✕
      </button>
    </div>
  );
}
