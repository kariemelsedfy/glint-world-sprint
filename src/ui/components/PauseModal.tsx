import type { Settings, UIActions } from '@/shared/contracts';
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
      aria-label="Paused"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-[#12253B]/75 backdrop-blur-sm select-none"
    >
      <div className="glint-pause-card bg-[#FFF6E5] w-full max-w-sm max-h-full overflow-y-auto rounded-3xl border-3 border-[#12253B] shadow-[6px_6px_0px_0px_#12253B] p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
        {/* Stamp / Title */}
        <div className="flex justify-center glint-compact-hide">
          <PassportStamp label="PAUSED" variant="gold" size="md" />
        </div>

        <div>
          <h2 className="text-xl font-black text-[#12253B]">Paused</h2>
          <p className="text-xs text-[#12253B]/80 font-medium mt-1 leading-relaxed">
            Pausing marks this run as <strong className="font-extrabold text-[#12253B]">practice</strong>: it will not count as a best time.
          </p>
        </div>

        {/* Quick Settings Toggles */}
        <div className="bg-white/80 p-3 rounded-2xl border-2 border-[#12253B] text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#19A7A0] block mb-2">
            Settings
          </span>
          <SettingsBar settings={settings} onSettings={actions.onSettings} variant="inline" />
        </div>

        {/* Action Buttons */}
        <div className="glint-pause-actions space-y-2 pt-1">
          <button
            type="button"
            onClick={actions.onResume}
            className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#78D896] hover:bg-[#68cb87] text-[#12253B] font-black text-sm border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all cursor-pointer"
          >
            Resume
          </button>

          <button
            type="button"
            onClick={actions.onRetry}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#FFC857] hover:bg-[#ffcf66] text-[#12253B] font-bold text-xs border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#19A7A0] outline-none transition-all"
          >
            Retry
          </button>

          <button
            type="button"
            onClick={actions.onMenu}
            className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-white hover:bg-slate-50 text-[#12253B] font-bold text-xs border-2 border-[#12253B]/30 hover:border-[#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
