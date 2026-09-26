/**
 * Paris city definition. Owner: A3.
 * IDs follow docs/CONTENT_AND_LEVELS.md so A6 content resolves against them unchanged.
 * Pure data only: collision, map, socket placement and the scenery all read from this file.
 *
 * Layout (144 x 144, flat):
 * - River Seine runs north-south along X -8..8, blocked except three 12-unit bridges at Z -48, 0, 48.
 * - Boulevards: three east-west roads over the bridges, one avenue on each bank at X +/-18.
 * - `block-*` blockers are Haussmann-style facade blocks; `river-*` are water; landmarks keep their ids.
 * Every socket sits on open ground with >= 3 units of clearance from any blocker.
 */
import { CITY_HALF_EXTENT } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';

const HALF = CITY_HALF_EXTENT;

export const parisDefinition: CityDefinition = {
  id: 'paris',
  label: 'Paris',
  globeAnchor: { latDeg: 48.86, lonDeg: 2.35 },
  bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
  spawn: [18, 0, 58],
  groundColor: '#cfe3c8',
  accentColor: '#24b8e8',
  roads: [
    { minX: -HALF, maxX: HALF, minZ: -54, maxZ: -42 },
    { minX: -HALF, maxX: HALF, minZ: -6, maxZ: 6 },
    { minX: -HALF, maxX: HALF, minZ: 42, maxZ: 54 },
    { minX: -22, maxX: -14, minZ: -HALF, maxZ: HALF },
    { minX: 14, maxX: 22, minZ: -HALF, maxZ: HALF },
  ],
  blockers: [
    { id: 'eiffel', minX: -40, maxX: -26, minZ: 18, maxZ: 32 },
    { id: 'louvre', minX: 26, maxX: 40, minZ: -34, maxZ: -20 },
    { id: 'cafe', minX: 32, maxX: 44, minZ: 34, maxZ: 42 },

    { id: 'river-n', minX: -8, maxX: 8, minZ: -HALF, maxZ: -54 },
    { id: 'river-nc', minX: -8, maxX: 8, minZ: -42, maxZ: -6 },
    { id: 'river-sc', minX: -8, maxX: 8, minZ: 6, maxZ: 42 },
    { id: 'river-s', minX: -8, maxX: 8, minZ: 54, maxZ: HALF },

    { id: 'block-w1', minX: -66, maxX: -52, minZ: -68, maxZ: -58 },
    { id: 'block-w2', minX: -46, maxX: -30, minZ: -68, maxZ: -58 },
    { id: 'block-w3', minX: -66, maxX: -52, minZ: -38, maxZ: -26 },
    { id: 'block-w4', minX: -46, maxX: -30, minZ: -38, maxZ: -26 },
    { id: 'block-w5', minX: -66, maxX: -52, minZ: -20, maxZ: -10 },
    { id: 'block-w6', minX: -46, maxX: -30, minZ: -20, maxZ: -10 },
    { id: 'block-w7', minX: -68, maxX: -56, minZ: 22, maxZ: 34 },
    { id: 'block-w8', minX: -66, maxX: -52, minZ: 58, maxZ: 68 },
    { id: 'block-w9', minX: -46, maxX: -30, minZ: 58, maxZ: 68 },

    { id: 'block-e1', minX: 26, maxX: 40, minZ: -68, maxZ: -58 },
    { id: 'block-e2', minX: 50, maxX: 66, minZ: -68, maxZ: -58 },
    { id: 'block-e3', minX: 54, maxX: 66, minZ: -40, maxZ: -32 },
    { id: 'block-e4', minX: 26, maxX: 40, minZ: 10, maxZ: 22 },
    { id: 'block-e5', minX: 56, maxX: 68, minZ: 10, maxZ: 22 },
    { id: 'block-e6', minX: 26, maxX: 40, minZ: 58, maxZ: 68 },
    { id: 'block-e7', minX: 50, maxX: 66, minZ: 58, maxZ: 68 },
  ],
  districts: [
    {
      id: 'tower',
      label: 'Eiffel Tower plaza',
      broadSearch: { center: [-33, 26], radius: 30 },
      narrowedSearch: { center: [-33, 26], radius: 20 },
    },
    {
      id: 'louvre',
      label: 'Louvre courtyard',
      broadSearch: { center: [36, -20], radius: 28 },
      narrowedSearch: { center: [36, -20], radius: 18 },
    },
    {
      id: 'cafe',
      label: 'Cafe quarter',
      broadSearch: { center: [38, 40], radius: 26 },
      narrowedSearch: { center: [38, 40], radius: 18 },
    },
  ],
  landmarks: [
    {
      id: 'eiffel',
      label: 'Eiffel Tower',
      center: [-33, 25],
      footprint: { minX: -40, maxX: -26, minZ: 18, maxZ: 32 },
      silhouette: 'tower',
    },
    {
      id: 'louvre',
      label: 'The Louvre',
      center: [33, -27],
      footprint: { minX: 26, maxX: 40, minZ: -34, maxZ: -20 },
      silhouette: 'museum',
    },
    {
      id: 'cafe',
      label: 'Striped cafe',
      center: [38, 38],
      footprint: { minX: 32, maxX: 44, minZ: 34, maxZ: 42 },
      silhouette: 'cafe',
    },
  ],
  sockets: [
    { id: 'tower-a', districtId: 'tower', position: [-46, 0, 12], fineSearchCenter: [-42, 15] },
    { id: 'tower-b', districtId: 'tower', position: [-20, 0, 24], fineSearchCenter: [-24, 26] },
    { id: 'tower-c', districtId: 'tower', position: [-35, 0, 42], fineSearchCenter: [-33, 37] },
    { id: 'louvre-a', districtId: 'louvre', position: [24, 0, -14], fineSearchCenter: [28, -12] },
    { id: 'louvre-b', districtId: 'louvre', position: [42, 0, -14], fineSearchCenter: [44, -18] },
    { id: 'louvre-c', districtId: 'louvre', position: [48, 0, -26], fineSearchCenter: [44, -28] },
    { id: 'cafe-a', districtId: 'cafe', position: [24, 0, 42], fineSearchCenter: [28, 44] },
    { id: 'cafe-b', districtId: 'cafe', position: [42, 0, 46], fineSearchCenter: [40, 48] },
    { id: 'cafe-c', districtId: 'cafe', position: [50, 0, 30], fineSearchCenter: [48, 34] },
  ],
};
