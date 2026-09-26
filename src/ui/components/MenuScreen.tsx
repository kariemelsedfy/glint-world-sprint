import type { UIModel, UIActions } from '@/shared/contracts';
import { CompassIcon } from './Icons';
import { SettingsBar } from './SettingsBar';

interface MenuScreenProps {
  model: UIModel;
  actions: UIActions;
}

export function MenuScreen({ model, actions }: MenuScreenProps) {
  const selectedLevel = model.levelId;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      {/* Top Bar: Wordmark + Tagline + Quick Controls */}
      <header className="flex items-start justify-between">
        <div className="pointer-events-auto">
          {/* Compact GLINT Wordmark Lockup */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#12253B] text-[#FFF6E5] rounded-xl border-2 border-[#12253B] shadow-[3px_3px_0px_0px_#24B8E8]">
            <div className="w-6 h-6 rounded-lg bg-[#FFC857] flex items-center justify-center text-[#12253B] font-black text-sm">
              G
            </div>
            <div className="flex flex-col">
              <h1 className="font-black tracking-wider text-base leading-none text-[#FFF6E5] glint-font-display">
                GLINT World Sprint
              </h1>
              <span className="text-[10px] text-[#24B8E8] font-bold tracking-tight">
                GEOGRAPHY SPEEDRUN
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs font-bold text-[#12253B] bg-[#FFF6E5]/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-[#12253B]/20 inline-block shadow-sm">
            Know the landmark. Beat the clock.
          </p>
        </div>

        {/* Top-Right Settings Bar */}
        <SettingsBar settings={model.settings} onSettings={actions.onSettings} />
      </header>

      {/* Center is left completely transparent for the 3D globe hero */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {/* Subtle decorative guide if desired, keeping center clear */}
      </div>

      {/* Bottom Panel: Compact Trial Selector & Play Action */}
      <footer className="w-full max-w-xl mx-auto pointer-events-auto">
        <div className="bg-[#FFF6E5] border-2 border-[#12253B] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_#12253B] backdrop-blur-md">
          {/* Trial Selector */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#12253B]/70">
                Choose a trial
              </span>
              <span className="text-xs font-semibold text-[#19A7A0] flex items-center gap-1">
                <CompassIcon size={14} /> {model.cities.length} cities
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Trial selector">
              {model.levels.map((level) => {
                const isActive = level.id === selectedLevel;
                return (
                  <button
                    key={level.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => actions.onSelectLevel(level.id)}
                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-extrabold transition-all border-2 flex flex-col items-center justify-center text-center gap-0.5 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none ${
                      isActive
                        ? 'bg-[#12253B] text-[#FFF6E5] border-[#12253B] shadow-[2px_2px_0px_0px_#FFC857] scale-[1.02]'
                        : 'bg-white/80 text-[#12253B] border-[#12253B]/20 hover:border-[#12253B]/60 hover:bg-white'
                    }`}
                  >
                    <span className="truncate w-full">{level.title}</span>
                    <span className="text-[10px] font-medium opacity-75" aria-hidden="true">
                      Trial {model.levels.indexOf(level) + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] font-semibold text-[#12253B]/70 text-center">
            Pick a trial to read its briefing — the clock only starts when you press Go.
          </p>
        </div>
      </footer>
    </div>
  );
}
