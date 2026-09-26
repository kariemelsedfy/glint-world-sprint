import type { UIActions } from '@/shared/contracts';
import { PassportStamp } from './PassportStamp';

interface ErrorOverlayProps {
  message: string | null;
  actions: UIActions;
}

export function ErrorOverlay({ message, actions }: ErrorOverlayProps) {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-[#12253B]/80 backdrop-blur-md select-none"
    >
      <div className="bg-[#FFF6E5] w-full max-w-sm rounded-3xl border-3 border-[#12253B] shadow-[6px_6px_0px_0px_#12253B] p-5 sm:p-6 text-center space-y-4">
        <div className="flex justify-center">
          <PassportStamp label="DETOUR" variant="red" size="md" />
        </div>

        <div>
          <h2 className="text-lg font-black text-[#12253B]">Something went wrong</h2>
          <p className="text-xs text-[#12253B]/80 font-medium mt-1 leading-relaxed">
            {message ?? 'The city failed to load. Your run can be retried or you can head back to the globe.'}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={actions.onRetry}
            className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#FFC857] hover:bg-[#ffcf66] text-[#12253B] font-black text-sm border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#19A7A0] outline-none transition-all cursor-pointer"
          >
            Retry
          </button>

          <button
            type="button"
            onClick={actions.onGlobe}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#24B8E8] hover:bg-[#1fa0cb] text-[#12253B] font-extrabold text-xs border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-all"
          >
            Back to globe
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
