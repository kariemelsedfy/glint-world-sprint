import type { UIModel, UIActions } from '@/shared/contracts';
import { trialMeta } from '../trialMeta';
import { ArcadeButton, ArcadePanel, Keycap, PhotoCard } from './Arcade';

interface BriefingScreenProps {
  model: UIModel;
  actions: UIActions;
}

export function BriefingScreen({ model, actions }: BriefingScreenProps) {
  const currentLevel = model.levels.find((l) => l.id === model.levelId) || model.levels[0];
  const meta = currentLevel ? trialMeta(currentLevel.id) : null;

  return (
    <div className="absolute inset-0 pointer-events-auto flex flex-col justify-between gap-3 ar-safe select-none overflow-y-auto bg-[rgba(33,19,51,0.55)]">
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full shrink-0 gap-2">
        <ArcadeButton size="sm" onClick={actions.onMenu} icon={<span>←</span>}>
          Menu
        </ArcadeButton>

        <div className="text-center min-w-0">
          <span className="ar-chip ar-chip-purple min-h-[36px]">
            <span className="ar-chip-label">Expedition</span>
            <span className="ar-chip-value text-base truncate">{currentLevel?.title ?? 'Trial'}</span>
          </span>
        </div>

        <ArcadeButton tone="yellow" size="sm" onClick={actions.onGo} aria-label="Go" className="glint-compact-only">
          Start hunt
        </ArcadeButton>
        <span className="glint-compact-hide w-[92px]" aria-hidden="true" />
      </header>

      <main className="my-auto max-w-5xl mx-auto w-full py-1 sm:py-3">
        <div className="text-center mb-3 sm:mb-4">
          <h1 className="ar-display text-4xl sm:text-5xl text-[var(--ar-yellow)] [text-shadow:4px_4px_0_var(--ar-ink)] m-0">Briefing</h1>
          <p className="mt-2 inline-block ar-panel ar-pad-sm text-xs sm:text-sm font-extrabold">
            Find {model.cards.length} objects across the globe. Fastest adjusted time wins.
            {meta && <span className="text-[var(--ar-purple)]"> · {meta.difficulty}, {meta.duration}</span>}
          </p>
        </div>

        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 list-none m-0 p-0" aria-label="Clue cards">
          {model.cards.map((card, idx) => (
            <li key={card.targetId}>
              <ArcadePanel pad="sm" className="h-full flex gap-3 items-start">
                <PhotoCard src={card.imageUrl} alt={card.imageAlt} size="md" className="shrink-0 hidden sm:inline-flex" />
                <PhotoCard src={card.imageUrl} alt={card.imageAlt} size="sm" className="shrink-0 sm:hidden" />
                <div className="min-w-0 flex-1">
                  <span className="ar-chip ar-chip-yellow min-h-[26px] px-2 py-0 mb-1">
                    <span className="ar-chip-label">Target</span>
                    <span className="ar-chip-value text-sm">{idx + 1}</span>
                  </span>
                  <h2 className="ar-display text-xl sm:text-2xl m-0 leading-none">{card.title}</h2>
                  <p className="mt-1.5 text-xs sm:text-sm font-semibold leading-snug">“{card.clue}”</p>
                  <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--ar-purple)] glint-compact-hide">
                    City unknown · paid hints in-city
                  </p>
                </div>
              </ArcadePanel>
            </li>
          ))}
        </ul>

        <ArcadePanel tone="ink" pad="sm" className="mt-3 sm:mt-4 glint-compact-hide flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5">
            <Keycap>W</Keycap>
            <Keycap>A</Keycap>
            <Keycap>S</Keycap>
            <Keycap>D</Keycap>
            <span className="opacity-80">or arrows to move</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="ar-chip ar-chip-pink min-h-[26px] px-2 py-0 ar-chip-value text-[11px]">WALK INTO A GLINT</span>
            <span className="opacity-80">to collect it</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="ar-chip ar-chip-cyan min-h-[26px] px-2 py-0 ar-chip-value text-[11px]">MAP · HINT · GLOBE</span>
            <span className="opacity-80">buttons in the HUD</span>
          </span>
        </ArcadePanel>
      </main>

      <footer className="w-full max-w-md mx-auto shrink-0 glint-compact-hide">
        <ArcadeButton tone="yellow" size="lg" block onClick={actions.onGo} aria-label="Go">
          Start hunt
        </ArcadeButton>
        <p className="mt-3 text-center text-[11px] font-extrabold text-[var(--ar-cream)] [text-shadow:1px_1px_0_var(--ar-ink)]">
          The clock starts when you press START HUNT.
        </p>
      </footer>
    </div>
  );
}
