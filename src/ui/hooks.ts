/** Presentation-only viewport hooks. Owner: A5. State changes only on media/orientation events, never per frame. */
import { useEffect, useState } from 'react';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export function useIsPortrait(): boolean {
  return useMediaQuery('(orientation: portrait)');
}

/** True on touch-first devices; drives whether the on-screen thumbstick is shown. */
export function useCoarsePointer(): boolean {
  const coarse = useMediaQuery('(pointer: coarse)');
  const noHover = useMediaQuery('(hover: none)');
  return coarse || noHover;
}
