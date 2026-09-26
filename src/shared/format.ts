/** Shared presentation-free formatting helpers. Owner: A0. */

export function formatMs(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((clamped % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function formatPenaltySeconds(ms: number): string {
  return `+${Math.round(ms / 1000)}s`;
}
