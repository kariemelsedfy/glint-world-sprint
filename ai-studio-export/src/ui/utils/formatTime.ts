/** Time and score formatting helpers for GLINT UI */

export function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const secStr = seconds.toFixed(1).padStart(4, '0'); // e.g. 05.2 or 45.1
  if (minutes > 0) {
    return `${minutes.toString().padStart(2, '0')}:${secStr}`;
  }
  return `00:${secStr}`;
}

export function formatPenalty(ms: number): string {
  if (ms <= 0) return '0s';
  const sec = Math.round(ms / 1000);
  return `+${sec}s`;
}

export function formatScore(points: number): string {
  return new Intl.NumberFormat('en-US').format(points);
}
