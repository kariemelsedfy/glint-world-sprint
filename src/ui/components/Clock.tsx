import { TimerIcon } from './Icons';
import { formatTime } from '../format';

interface ClockProps {
  adjustedMs: number;
  penaltyMs: number;
  practice: boolean;
  size?: 'sm' | 'lg';
}

/** Adjusted clock with the running penalty total and the practice flag. */
export function Clock({ adjustedMs, penaltyMs, practice, size = 'sm' }: ClockProps) {
  return (
    <div
      className="bg-[#12253B] text-[#FFF6E5] px-3.5 py-1.5 rounded-xl border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#24B8E8] flex items-center gap-2"
      aria-live="off"
    >
      <TimerIcon size={size === 'lg' ? 18 : 16} className="text-[#FFC857]" />
      <div className="flex flex-col items-end leading-none">
        <strong className={`glint-tabular font-black tracking-tight text-[#FFC857] ${size === 'lg' ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
          {formatTime(adjustedMs)}
        </strong>
        <span className="flex items-center gap-1.5 text-[9px] font-bold mt-0.5">
          <span className={`glint-tabular ${penaltyMs > 0 ? 'text-[#FF655B]' : 'text-white/60'}`}>penalty {formatTime(penaltyMs)}</span>
          {practice && <span className="text-[#FFC857] uppercase tracking-wider">practice</span>}
        </span>
      </div>
    </div>
  );
}
