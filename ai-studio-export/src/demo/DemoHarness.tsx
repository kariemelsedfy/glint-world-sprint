import React, { useState, useEffect, useCallback } from 'react';
import { GameUI } from '../ui/GameUI';
import {
  UIModel,
  UIActions,
  Phase,
  CityId,
  TargetId,
  LevelId,
  Settings,
} from '@/contracts/game';
import {
  createBaseMockModel,
  MOCK_CARDS_ICONS,
  MOCK_CARDS_COLLECTED,
  MOCK_MAP_PARIS,
  MOCK_RESULT,
} from './mockData';
import { MiniWorldCanvas } from './MiniWorldCanvas';

type ViewportPreset = 'responsive' | '1280x720' | '844x390';

export function DemoHarness() {
  const [preset, setPreset] = useState<ViewportPreset>('responsive');
  const [model, setModel] = useState<UIModel>(createBaseMockModel());
  const [playerPos, setPlayerPos] = useState<[number, number]>([-10, 15]);
  const [showIntegrationNote, setShowIntegrationNote] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  // Live timer tick when liveMode is on and playing
  useEffect(() => {
    if (!liveMode || model.paused || model.phase === 'menu' || model.phase === 'briefing' || model.phase === 'results') {
      return;
    }

    const interval = setInterval(() => {
      setModel((prev) => ({
        ...prev,
        activeMs: prev.activeMs + 100,
        adjustedMs: prev.activeMs + 100 + prev.penaltyMs,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [liveMode, model.paused, model.phase, model.penaltyMs]);

  // Keyboard navigation for live testing explorer in city view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (model.phase !== 'city' || model.paused || model.map) return;

      const speed = 4;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setPlayerPos(([x, z]) => [x, Math.max(z - speed, -70)]);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setPlayerPos(([x, z]) => [x, Math.min(z + speed, 70)]);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setPlayerPos(([x, z]) => [Math.max(x - speed, -70), z]);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setPlayerPos(([x, z]) => [Math.min(x + speed, 70), z]);
      } else if (e.key === 'm' || e.key === 'M') {
        setModel((prev) => ({ ...prev, map: prev.map ? null : MOCK_MAP_PARIS }));
      } else if (e.key === ' ') {
        // Collect current target
        actions.onSelectObjective(model.cards[0].targetId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [model.phase, model.paused, model.map, model.cards]);

  // Implementation of UIActions for the harness
  const actions: UIActions = {
    onSelectLevel: (id: LevelId) => {
      setModel((prev) => ({
        ...prev,
        levelId: id,
      }));
    },
    onGo: () => {
      if (model.phase === 'menu') {
        setModel((prev) => ({ ...prev, phase: 'briefing' }));
      } else if (model.phase === 'briefing') {
        setModel((prev) => ({
          ...prev,
          phase: 'globe',
          activeMs: 0,
          adjustedMs: 0,
          penaltyMs: 0,
        }));
      }
    },
    onSelectCity: (cityId: CityId) => {
      // Simulate brief travel transition then enter city
      setModel((prev) => ({
        ...prev,
        phase: 'travel',
        cityId,
        statusMessage: `Diving through clouds into ${cityId === 'paris' ? 'Paris' : 'Giza'}...`,
      }));

      setTimeout(() => {
        setModel((prev) => ({
          ...prev,
          phase: 'city',
          cityId,
          statusMessage: null,
          map: null,
        }));
      }, 700);
    },
    onSelectObjective: (targetId: TargetId) => {
      // Select or toggle collected status in demo harness
      setModel((prev) => {
        const updatedCards = prev.cards.map((c) => {
          if (c.targetId === targetId) {
            return {
              ...c,
              selected: true,
              collected: !c.collected, // In live demo, hitting collect toggles it
            };
          }
          return { ...c, selected: false };
        });

        // Check if both collected -> win run!
        const allDone = updatedCards.every((c) => c.collected);
        if (allDone && prev.phase === 'city') {
          setTimeout(() => {
            setModel((p) => ({
              ...p,
              phase: 'results',
              result: {
                adjustedMs: p.adjustedMs + 5000,
                activeMs: p.activeMs,
                hintPenaltyMs: p.penaltyMs,
                travelPenaltyMs: 5000,
                points: Math.max(5000 - Math.round(p.adjustedMs / 100), 1200),
                medal: 'gold',
                practice: p.practice,
                bestMs: 92_100,
                isNewBest: true,
                sessionOnly: true,
              },
            }));
          }, 800);
        }

        return { ...prev, cards: updatedCards };
      });
    },
    onHint: (targetId: TargetId) => {
      setModel((prev) => {
        const target = prev.cards.find((c) => c.targetId === targetId);
        if (!target || target.collected || !target.nextHintCostMs) return prev;

        const nextCost = target.nextHintCostMs;
        const newTier = (target.hintTier + 1) as 1 | 2 | 3;
        const newPurchased = [
          ...target.purchasedHints,
          newTier === 1
            ? 'City revealed: Paris (Île-de-France)'
            : newTier === 2
            ? 'District revealed: Champ de Mars'
            : 'Perimeter narrowed to 12m around the Eiffel fountain',
        ];

        const nextLabel =
          newTier === 1 ? 'Reveal District' : newTier === 2 ? 'Narrow Search Radius' : null;
        const nextPrice = newTier === 1 ? 20_000 : newTier === 2 ? 35_000 : null;

        const updatedCards = prev.cards.map((c) =>
          c.targetId === targetId
            ? {
                ...c,
                hintTier: newTier,
                purchasedHints: newPurchased,
                nextHintLabel: nextLabel,
                nextHintCostMs: nextPrice,
              }
            : c
        );

        return {
          ...prev,
          cards: updatedCards,
          penaltyMs: prev.penaltyMs + nextCost,
          adjustedMs: prev.activeMs + prev.penaltyMs + nextCost,
        };
      });
    },
    onMap: (open: boolean) => {
      setModel((prev) => ({
        ...prev,
        map: open ? { ...MOCK_MAP_PARIS, player: playerPos } : null,
      }));
    },
    onGlobe: () => {
      setModel((prev) => ({
        ...prev,
        phase: 'travel',
        statusMessage: 'Ascending to globe orbit...',
      }));
      setTimeout(() => {
        setModel((prev) => ({
          ...prev,
          phase: 'globe',
          cityId: null,
          map: null,
          statusMessage: null,
        }));
      }, 600);
    },
    onPause: () => {
      setModel((prev) => ({
        ...prev,
        paused: true,
        practice: true, // Pausing marks the run as practice
      }));
    },
    onResume: () => {
      setModel((prev) => ({
        ...prev,
        paused: false,
      }));
    },
    onRetry: () => {
      setModel((prev) => ({
        ...prev,
        phase: 'globe',
        activeMs: 0,
        adjustedMs: 0,
        penaltyMs: 0,
        paused: false,
        cards: MOCK_CARDS_ICONS,
        cityId: null,
        map: null,
        result: null,
        practice: false,
      }));
    },
    onNextTrial: () => {
      const nextLevel: LevelId =
        model.levelId === 'icons'
          ? 'sky-sun'
          : model.levelId === 'sky-sun'
          ? 'small-wonders'
          : 'icons';
      setModel((prev) => ({
        ...prev,
        levelId: nextLevel,
        phase: 'briefing',
        cards: MOCK_CARDS_ICONS,
        activeMs: 0,
        adjustedMs: 0,
        penaltyMs: 0,
        cityId: null,
        map: null,
        result: null,
        practice: false,
      }));
    },
    onMenu: () => {
      setModel((prev) => ({
        ...prev,
        phase: 'menu',
        paused: false,
        map: null,
        result: null,
      }));
    },
    onSettings: (patch: Partial<Settings>) => {
      setModel((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));
    },
    onTouchAxis: (normX: number, normZ: number) => {
      // Moves the player dot in the city
      setPlayerPos(([x, z]) => [
        Math.max(Math.min(x + normX * 2.5, 70), -70),
        Math.max(Math.min(z + normZ * 2.5, 70), -70),
      ]);
    },
  };

  // State switcher presets
  const switchState = (phase: Phase, overrides: Partial<UIModel> = {}) => {
    setModel({
      ...createBaseMockModel(),
      phase,
      ...overrides,
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#0E1A29] text-[#FFF6E5] flex flex-col font-sans">
      {/* Top Demo Harness Toolbar */}
      <header className="bg-[#12253B] border-b-2 border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#FFC857] text-[#12253B] font-black px-2.5 py-1 rounded-lg">
            <span>GLINT</span>
            <span className="text-[10px] bg-[#12253B] text-white px-1 rounded">UI HARNESS</span>
          </div>

          {/* Viewport Preset Toggle */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl" role="group" aria-label="Viewport size">
            <button
              onClick={() => setPreset('responsive')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                preset === 'responsive' ? 'bg-[#24B8E8] text-[#12253B]' : 'text-white/80 hover:text-white'
              }`}
            >
              Responsive
            </button>
            <button
              onClick={() => setPreset('1280x720')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                preset === '1280x720' ? 'bg-[#24B8E8] text-[#12253B]' : 'text-white/80 hover:text-white'
              }`}
            >
              1280×720 (Desktop)
            </button>
            <button
              onClick={() => setPreset('844x390')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                preset === '844x390' ? 'bg-[#24B8E8] text-[#12253B]' : 'text-white/80 hover:text-white'
              }`}
            >
              844×390 (Mobile)
            </button>
          </div>
        </div>

        {/* State Quick Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-white/60 font-bold text-[11px] hidden sm:inline">Inspect State:</span>
          <button
            onClick={() => switchState('menu')}
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.phase === 'menu' ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => switchState('briefing')}
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.phase === 'briefing' ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Briefing
          </button>
          <button
            onClick={() => switchState('globe', { activeMs: 14200, adjustedMs: 14200 })}
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.phase === 'globe' ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Globe HUD
          </button>
          <button
            onClick={() =>
              switchState('city', {
                cityId: 'paris',
                activeMs: 42300,
                adjustedMs: 52300,
                penaltyMs: 10000,
                cards: MOCK_CARDS_ICONS,
              })
            }
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.phase === 'city' && model.cityId === 'paris' && !model.map
                ? 'bg-[#FFC857] text-[#12253B]'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            City (Paris)
          </button>
          <button
            onClick={() =>
              switchState('city', {
                cityId: 'giza',
                activeMs: 78500,
                adjustedMs: 98500,
                penaltyMs: 20000,
                cards: MOCK_CARDS_COLLECTED,
              })
            }
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.phase === 'city' && model.cityId === 'giza'
                ? 'bg-[#FFC857] text-[#12253B]'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            City (Giza)
          </button>
          <button
            onClick={() =>
              switchState('city', {
                cityId: 'paris',
                activeMs: 42300,
                adjustedMs: 52300,
                penaltyMs: 10000,
                map: MOCK_MAP_PARIS,
              })
            }
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.map ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Map Overlay
          </button>
          <button
            onClick={() =>
              switchState('travel', {
                cityId: 'paris',
                statusMessage: 'Diving through clouds into Paris...',
              })
            }
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.phase === 'travel' ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Travel
          </button>
          <button
            onClick={() =>
              switchState('results', {
                result: MOCK_RESULT,
              })
            }
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.phase === 'results' ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Results
          </button>
          <button
            onClick={() =>
              switchState('city', {
                cityId: 'paris',
                paused: true,
                practice: true,
              })
            }
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.paused ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Paused
          </button>
          <button
            onClick={() =>
              switchState('error', {
                statusMessage: 'Connection to miniature Paris scene was interrupted.',
              })
            }
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
              model.phase === 'error' ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Error
          </button>
        </div>

        {/* Integration Note Drawer Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLiveMode((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
              liveMode
                ? 'bg-[#78D896] text-[#12253B] border-[#78D896]'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
          >
            {liveMode ? '● Live Simulation Active' : '○ Enable Live Sim'}
          </button>

          <button
            onClick={() => setShowIntegrationNote((prev) => !prev)}
            className="px-2.5 py-1 bg-[#19A7A0] hover:bg-[#158f89] text-white font-black rounded-lg transition-colors"
          >
            Integration Note 📋
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-[#08121E] overflow-auto">
        <div
          className={`relative bg-[#12253B] border-4 border-[#1B3552] rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            preset === 'responsive'
              ? 'w-full h-[calc(100vh-4.5rem)] min-h-[500px]'
              : preset === '1280x720'
              ? 'w-[1280px] h-[720px] max-w-full max-h-full shrink-0'
              : 'w-[844px] h-[390px] max-w-full max-h-full shrink-0'
          }`}
        >
          {/* Background 3D Canvas Mockup (Single existing WebGL Canvas in production) */}
          <MiniWorldCanvas
            phase={model.phase}
            cityId={model.cityId}
            playerPos={playerPos}
            onSelectCity={actions.onSelectCity}
            reducedMotion={model.settings.reducedMotion}
          />

          {/* Shipped GLINT Game UI DOM Overlay */}
          <GameUI
            model={model}
            actions={actions}
            showTouchControls={true}
          />
        </div>
      </main>

      {/* Integration Note Modal */}
      {showIntegrationNote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
        >
          <div className="bg-[#FFF6E5] text-[#12253B] w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-3 border-[#12253B] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#12253B]">
              <h2 className="text-xl font-black font-display">GLINT Game UI Integration Note</h2>
              <button
                onClick={() => setShowIntegrationNote(false)}
                className="px-3 py-1 bg-[#12253B] text-white font-black rounded-xl hover:bg-[#203a59]"
              >
                Close ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-medium leading-relaxed">
              <div>
                <h3 className="font-extrabold text-sm text-[#12253B] uppercase tracking-wider">
                  1. Exported Component
                </h3>
                <p className="mt-1 bg-white p-2.5 rounded-xl border border-[#12253B]/20 font-mono text-[11px]">
                  import {`{ GameUI }`} from '@/ui';<br />
                  &lt;GameUI model={'{uiModel}'} actions={'{uiActions}'} /&gt;
                </p>
                <p className="mt-1 text-slate-700">
                  GameUI is completely stateless with respect to game rules, timing, movement, random content, or persistence. It renders purely as a DOM/CSS overlay sitting over your single WebGL canvas with <code>pointer-events-none</code> on overlay roots and <code>pointer-events-auto</code> on interactive controls.
                </p>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-[#12253B] uppercase tracking-wider">
                  2. Contracts & Types
                </h3>
                <p className="text-slate-700">
                  Imported from <code>contracts/game.ts</code> and <code>src/shared/contracts.ts</code>:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-700">
                  <li><code>UIModel</code>: drives current phase ('boot' | 'menu' | 'briefing' | 'globe' | 'travel' | 'city' | 'results' | 'error'), levelId, active/adjusted/penalty times, cards, map, result, settings.</li>
                  <li><code>UIActions</code>: dispatches events: <code>onSelectLevel(id)</code>, <code>onGo()</code>, <code>onSelectCity(id)</code>, <code>onSelectObjective(id)</code>, <code>onHint(id)</code>, <code>onMap(open)</code>, <code>onGlobe()</code>, <code>onPause()</code>, <code>onResume()</code>, <code>onRetry()</code>, <code>onNextTrial()</code>, <code>onMenu()</code>, <code>onSettings(patch)</code>, <code>onTouchAxis(x, z)</code>.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-[#12253B] uppercase tracking-wider">
                  3. Visual Identity
                </h3>
                <p className="text-slate-700">
                  Toy-world palette: Deep navy #12253B, Ocean blue #24B8E8, Treasure gold #FFC857, Mint #78D896, Warm cream #FFF6E5, Teal #19A7A0. Restrained passport-stamp motifs with stamp slam animations upon item collection. Tabular numerals for timers and penalties. Full <code>prefers-reduced-motion</code> compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
