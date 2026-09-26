/** UI-local formatting aliases over the shared helpers. Owner: A5. */
import { formatMs, formatPenaltySeconds } from '@/shared/format';

export const formatTime = formatMs;

export function formatPenalty(ms: number): string {
  return ms <= 0 ? '0s' : formatPenaltySeconds(ms);
}

export function formatScore(points: number): string {
  return new Intl.NumberFormat('en-US').format(points);
}
