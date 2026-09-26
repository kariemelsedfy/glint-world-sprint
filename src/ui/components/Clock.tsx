import { TimerIcon } from './Icons';
import { formatTime } from '../format';

interface ClockProps {
  adjustedMs: number;
  penaltyMs: number;
  practice: boolean;
  size?: 'sm' | 'lg';
}

/** Adjusted clock with the running penalty total and the practice flag. Values are display-only. */
export function Clock({ adjustedMs, penaltyMs, practice, size = 'sm' }: ClockProps) {
  return (
    <div className="ar-chip ar-chip-ink" aria-live="off">
      <span className="ar-chip-icon">
        <TimerIcon size={size === 'lg' ? 18 : 16} className="text-[var(--ar-yellow)]" />
      </span>
      <span className="flex flex-col items-start leading-none">
        <strong className={`ar-chip-value glint-tabular ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>{formatTime(adjustedMs)}</strong>
        <span className="flex items-center gap-1.5 text-[9px] font-extrabold mt-0.5 tracking-wider uppercase">
          <span className={`glint-tabular ${penaltyMs > 0 ? 'text-[var(--ar-pink)]' : 'text-[var(--ar-lavender)]'}`}>
            penalty {formatTime(penaltyMs)}
          </span>
          {practice && <span className="text-[var(--ar-yellow)]">practice</span>}
        </span>
      </span>
    </div>
  );
}
