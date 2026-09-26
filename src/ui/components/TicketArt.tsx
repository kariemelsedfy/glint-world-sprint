import type { TicketArt as Art } from '../trialMeta';

/** Abstract, city-agnostic ticket illustrations (no landmarks — the destination stays a secret). */
export function TicketArt({ art, accent }: { art: Art; accent: string }) {
  const ink = '#211333';
  return (
    <svg viewBox="0 0 160 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="160" height="64" fill={accent} />
      {art === 'sun' && (
        <>
          <circle cx="120" cy="40" r="18" fill="#fff5e9" stroke={ink} strokeWidth="3" />
          <path d="M0 52 L40 30 L70 48 L100 34 L160 56 V64 H0Z" fill="#7146c5" stroke={ink} strokeWidth="3" />
        </>
      )}
      {art === 'moon' && (
        <>
          <rect width="160" height="64" fill="#211333" />
          <circle cx="40" cy="26" r="14" fill="#ffd963" stroke={ink} strokeWidth="3" />
          <circle cx="47" cy="22" r="12" fill="#211333" />
          <circle cx="100" cy="14" r="2" fill="#fff5e9" />
          <circle cx="130" cy="30" r="2" fill="#fff5e9" />
          <circle cx="80" cy="40" r="2" fill="#fff5e9" />
          <path d="M0 56 L30 44 L60 54 L95 42 L130 52 L160 46 V64 H0Z" fill="#7146c5" stroke={ink} strokeWidth="3" />
        </>
      )}
      {art === 'stars' && (
        <>
          <polygon points="40,10 46,26 62,26 50,36 54,52 40,42 26,52 30,36 18,26 34,26" fill="#ffd963" stroke={ink} strokeWidth="3" />
          <polygon points="110,20 114,30 124,30 116,36 118,46 110,40 102,46 104,36 96,30 106,30" fill="#fff5e9" stroke={ink} strokeWidth="3" />
          <rect x="0" y="52" width="160" height="12" fill="#7146c5" stroke={ink} strokeWidth="3" />
        </>
      )}
      {art === 'flags' && (
        <>
          <path d="M20 8 V60" stroke={ink} strokeWidth="3" />
          <path d="M20 8 H60 L50 20 L60 32 H20Z" fill="#f43fab" stroke={ink} strokeWidth="3" />
          <path d="M100 14 V60" stroke={ink} strokeWidth="3" />
          <path d="M100 14 H140 L130 26 L140 38 H100Z" fill="#22c4ea" stroke={ink} strokeWidth="3" />
          <rect x="0" y="56" width="160" height="8" fill="#fff5e9" stroke={ink} strokeWidth="3" />
        </>
      )}
      {art === 'waves' && (
        <>
          <circle cx="130" cy="18" r="10" fill="#ffd963" stroke={ink} strokeWidth="3" />
          <path d="M0 36 Q20 26 40 36 T80 36 T120 36 T160 36 V64 H0Z" fill="#7146c5" stroke={ink} strokeWidth="3" />
          <path d="M0 48 Q20 38 40 48 T80 48 T120 48 T160 48" fill="none" stroke="#fff5e9" strokeWidth="3" />
        </>
      )}
      {art === 'bricks' && (
        <>
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={col * 36 - (row % 2) * 18}
                y={12 + row * 18}
                width="34"
                height="16"
                fill={row === 1 ? '#f43fab' : '#fff5e9'}
                stroke={ink}
                strokeWidth="3"
              />
            )),
          )}
        </>
      )}
    </svg>
  );
}
