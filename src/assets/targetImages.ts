/**
 * Target image registry. Owner: A1.
 * Single source of truth mapping a TargetId to its committed local picture,
 * used by both the world collectible mesh and every UI surface.
 * Assets live in src/assets/targets/ and are bundled by Vite (no runtime fetch).
 */
import type { TargetId } from '@/shared/contracts';

import parisSmile from './targets/paris-smile.jpg';
import parisIron from './targets/paris-iron.jpg';
import parisCrescent from './targets/paris-crescent.jpg';
import gizaCrown from './targets/giza-crown.jpg';
import gizaGuardian from './targets/giza-guardian.jpg';
import gizaBeetle from './targets/giza-beetle.jpg';
import romeArena from './targets/rome-arena.jpg';
import romeLaurel from './targets/rome-laurel.jpg';
import sfCableCar from './targets/sf-cable-car.jpg';
import sfBridge from './targets/sf-bridge.jpg';
import berlinGate from './targets/berlin-gate.jpg';
import berlinTower from './targets/berlin-tower.jpg';

export interface TargetImage {
  readonly url: string;
  readonly alt: string;
}

const IMAGES: Readonly<Record<TargetId, TargetImage>> = {
  'paris-smile': { url: parisSmile, alt: 'Framed portrait of a woman with a faint smile' },
  'paris-iron': { url: parisIron, alt: 'Wrought-iron lattice tower token' },
  'paris-crescent': { url: parisCrescent, alt: 'Golden crescent-shaped pastry' },
  'giza-crown': { url: gizaCrown, alt: 'Polished capstone of a pyramid' },
  'giza-guardian': { url: gizaGuardian, alt: 'Carved lion-bodied guardian statue' },
  'giza-beetle': { url: gizaBeetle, alt: 'Blue-glazed scarab beetle amulet' },
  'rome-arena': { url: romeArena, alt: 'Miniature stone amphitheatre souvenir' },
  'rome-laurel': { url: romeLaurel, alt: 'Golden laurel wreath' },
  'sf-cable-car': { url: sfCableCar, alt: 'Red and cream cable-car model' },
  'sf-bridge': { url: sfBridge, alt: 'Postcard of a red suspension bridge in fog' },
  'berlin-gate': { url: berlinGate, alt: 'Miniature neoclassical columned gate' },
  'berlin-tower': { url: berlinTower, alt: 'Souvenir of a tall tower with a sphere' },
};

export function getTargetImage(id: TargetId): TargetImage {
  return IMAGES[id];
}
