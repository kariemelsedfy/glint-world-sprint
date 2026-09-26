/**
 * Frame-rate bridge between the TravelDirector (DOM timeline) and the GlobeScene
 * (R3F render loop). Mutated inside the timeline; read every frame by the globe.
 * Never a React state update. Owner: A2.
 */
import type { LocationId } from '@/shared/contracts';

export type TravelStage = 'idle' | 'enter' | 'hold' | 'reveal';

export interface TravelSignal {
  /** Transition token currently animating; null when idle. */
  transitionId: string | null;
  /** Where the flight departs from and lands. */
  from: LocationId;
  to: LocationId;
  stage: TravelStage;
  /** 0..1 progress within the current stage. */
  progress: number;
  /** 0..1 how much of the screen the cloud cover hides. */
  cover: number;
}

export const travelSignal: TravelSignal = {
  transitionId: null,
  from: 'globe',
  to: 'globe',
  stage: 'idle',
  progress: 0,
  cover: 0,
};

export function resetTravelSignal(): void {
  travelSignal.transitionId = null;
  travelSignal.stage = 'idle';
  travelSignal.progress = 0;
  travelSignal.cover = 0;
}
