import { useMemo } from 'react';
import { ArcadePanel } from './Arcade';
import { GlobeIcon } from './Icons';

/** Real gameplay tips only — every line describes a rule that exists in the store. */
const TIPS: readonly string[] = [
  'Hints cost 10s, 20s and 35s — the third one narrows the map a lot.',
  'Landing in a city costs +5s. Read every clue before you fly.',
  'Each trial is deterministic: the same targets sit in the same spots on retry.',
  'Pausing marks the run as practice, so it will not count as a best.',
  'Open the MAP to see which region a hint has narrowed the target to.',
  'Walk straight into a glint to collect it — no button needed.',
];

interface BootScreenProps {
  statusMessage: string | null;
}

/** Loading state: wordmark, globe mark, one gameplay tip and the honest status from the store. */
export function BootScreen({ statusMessage }: BootScreenProps) {
  // Not scored or placed, so wall-clock rotation is fine here.
  const tip = useMemo(() => TIPS[Math.floor(Date.now() / 1000) % TIPS.length] ?? TIPS[0], []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[var(--ar-ink)] ar-stripes p-6 text-center" role="status" aria-live="polite">
      <div className="w-28 h-28 rounded-full bg-[var(--ar-cyan)] border-[3px] border-[var(--ar-ink)] shadow-[0_7px_0_0_var(--ar-purple)] flex items-center justify-center animate-cloud-drift">
        <GlobeIcon size={72} className="text-[var(--ar-ink)]" />
      </div>
      <h1 className="ar-wordmark text-[var(--ar-cream)] m-0">
        GLINT <span className="text-[var(--ar-yellow)]">World Sprint</span>
      </h1>
      <ArcadePanel tone="lavender" pad="sm" className="max-w-sm w-full">
        <span className="ar-display text-sm block mb-1 text-[var(--ar-purple)]">Tip</span>
        <p className="text-xs font-bold m-0 leading-snug">{tip}</p>
      </ArcadePanel>
      <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--ar-lavender)] m-0">{statusMessage ?? 'Loading…'}</p>
    </div>
  );
}
