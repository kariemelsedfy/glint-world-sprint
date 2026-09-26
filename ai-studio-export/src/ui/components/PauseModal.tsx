import React from 'react';
import { Settings, UIActions } from '@/contracts/game';
import { SettingsBar } from './SettingsBar';
import { PassportStamp } from './PassportStamp';

interface PauseModalProps {
  settings: Settings;
  actions: UIActions;
}

export function PauseModal({ settings, actions }: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Speedrun Paused"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12253B]/75 backdrop-blur-sm select-none"
    >
      <div className="bg-[#FFF6E5] w-full max-w-sm rounded-3xl border-3 border-[#12253B] shadow-[6px_6px_0px_0px_#12253B] p-5 sm:p-6 text-center space-y-4">
        {/* Stamp / Title */}
        <div className="flex justify-center">
          <PassportStamp label="SPEEDRUN PAUSED" variant="gold" size="md" />
        </div>

        <div>
          <h2 className="text-xl font-black text-[#12253B]">Take a Breather</h2>
          <p className="text-xs text-[#12253B]/80 font-medium mt-1 leading-relaxed">
            Pausing marks the current run as <strong className="font-extrabold text-[#12253B]">Practice</strong> to preserve fair speedrun timing.
          </p>
        </div>

        {/* Quick Settings Toggles */}
        <div className="bg-white/80 p-3 rounded-2xl border-2 border-[#12253B] text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#19A7A0] block mb-2">
            Quick Adjustments
          </span>
          <SettingsBar settings={settings} onSettings={actions.onSettings} variant="inline" />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={actions.onResume}
            className="w-full py-3 px-4 rounded-xl bg-[#78D896] hover:bg-[#68cb87] text-[#12253B] font-black text-sm border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all cursor-pointer"
          >
            ▶ RESUME PRACTICE RUN
          </button>

          <button
            type="button"
            onClick={actions.onRetry}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FFC857] hover:bg-[#ffcf66] text-[#12253B] font-bold text-xs border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#19A7A0] outline-none transition-all"
          >
            ↺ Restart Fresh Speedrun
          </button>

          <button
            type="button"
            onClick={actions.onMenu}
            className="w-full py-2 px-4 rounded-xl bg-white hover:bg-slate-50 text-[#12253B] font-bold text-xs border-2 border-[#12253B]/30 hover:border-[#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all"
          >
            Quit to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
