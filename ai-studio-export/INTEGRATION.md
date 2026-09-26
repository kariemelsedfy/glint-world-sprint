# GLINT Game UI — Integration Guide

## 1. Overview
GLINT is a colorful 3D world treasure speedrun for a gaming hackathon.
The exported `GameUI` component is a production-grade, stateless DOM/CSS overlay that sits directly over a single WebGL canvas. It adheres strictly to the contract defined in `contracts/game.ts`.

## 2. Exported Files & Paths
- **Main Barrel**: `src/ui/index.ts`
- **Main Component**: `src/ui/GameUI.tsx` (`export { GameUI }`)
- **Contract Definition**: `contracts/game.ts` and `src/shared/contracts.ts`
- **Component Submodules**:
  - `src/ui/components/MenuScreen.tsx`: Menu screen with compact wordmark, trials selector, play action, settings
  - `src/ui/components/BriefingScreen.tsx`: Two illustrated clue cards, rules kicker, controls summary, Go button
  - `src/ui/components/GlobeHUD.tsx`: Clue cards dock, Paris/Giza accessible pin selectors, adjusted timer
  - `src/ui/components/CityHUD.tsx`: Compact top timer, 2 objective chips, active clue popout, collection stamp slam
  - `src/ui/components/MapOverlay.tsx`: City survey blueprint, north indicator, explorer position, amber search zones
  - `src/ui/components/HintModal.tsx`: Tiered intelligence desk, incremental penalties (+10s, +20s, +35s)
  - `src/ui/components/ResultsScreen.tsx`: Heroic adjusted time, active time / penalty breakdown, medals, retry/next
  - `src/ui/components/PauseModal.tsx`: Paused dialog with practice run indicator & quick settings
  - `src/ui/components/TravelOverlay.tsx`: Toy cloud transit sequence during city diving
  - `src/ui/components/ErrorOverlay.tsx`: Recoverable error dialog with retry & orbit fallback
  - `src/ui/components/TouchControls.tsx`: Lower-left normalized thumbstick + >=44px right action buttons
  - `src/ui/components/OrientationNotice.tsx`: Non-destructive portrait rotate suggestion
  - `src/ui/components/PassportStamp.tsx`: Inked passport stamp seal motifs

## 3. Usage Example
```tsx
import React from 'react';
import { GameUI } from '@/ui';
import { UIModel, UIActions } from '@/contracts/game';

export function GameContainer() {
  const model: UIModel = /* your state machine snapshot */;
  const actions: UIActions = {
    onSelectLevel: (id) => { /* change trial */ },
    onGo: () => { /* start run */ },
    onSelectCity: (cityId) => { /* fly to city */ },
    onSelectObjective: (targetId) => { /* focus clue */ },
    onHint: (targetId) => { /* buy next hint tier */ },
    onMap: (open) => { /* toggle map overlay */ },
    onGlobe: () => { /* fly back to globe */ },
    onPause: () => { /* pause run */ },
    onResume: () => { /* resume run */ },
    onRetry: () => { /* restart trial */ },
    onNextTrial: () => { /* advance level */ },
    onMenu: () => { /* return to main menu */ },
    onSettings: (patch) => { /* update audio/motion/quality */ },
    onTouchAxis: (x, z) => { /* steer explorer (x: -1..1, z: -1..1) */ },
  };

  return (
    <div className="relative w-full h-screen">
      {/* 3D WebGL Canvas sits behind */}
      <canvas id="webgl-canvas" className="absolute inset-0 w-full h-full" />

      {/* GLINT DOM Overlay sits above with pointer-events discipline */}
      <GameUI model={model} actions={actions} />
    </div>
  );
}
```

## 4. Pointer-Events Architecture
- Overlay root containers use `pointer-events-none` so mouse/touch interactions pass directly through to the 3D WebGL canvas.
- All interactive elements (buttons, cards, modals, touch thumbsticks) explicitly declare `pointer-events-auto`.

## 5. Visual Palette & Tokens
- **Navy**: `#12253B`
- **Ocean Blue**: `#24B8E8`
- **Treasure Gold**: `#FFC857`
- **Mint Green**: `#78D896`
- **Warm Cream**: `#FFF6E5`
- **Teal**: `#19A7A0`
- **Coral Penalty**: `#FF655B`
- **Typography**: System rounded sans-serif + Tabular numerals (`tabular-nums`) for timers and telemetry.
- **Accessibility**: Full keyboard focus visibility rings, zero pill slop, high-contrast dark text on warm cards.
