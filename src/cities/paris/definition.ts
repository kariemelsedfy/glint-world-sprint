/**
 * STUB city definition created by A0 for bootstrap. Owner after CONTRACT_READY: A3.
 * IDs follow docs/CONTENT_AND_LEVELS.md so A6 content resolves against them unchanged.
 * Pure data only: collision, map and socket placement all read from this file.
 */
import { CITY_HALF_EXTENT } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';

const HALF = CITY_HALF_EXTENT;

export const parisDefinition: CityDefinition = {
  id: 'paris',
  label: 'Paris',
  globeAnchor: { latDeg: 48.86, lonDeg: 2.35 },
  bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
  spawn: [0, 0, 20],
  groundColor: '#cfe3c8',
  accentColor: '#24b8e8',
  roads: [
    { minX: -HALF, maxX: HALF, minZ: -6, maxZ: 6 },
    { minX: -6, maxX: 6, minZ: -HALF, maxZ: HALF },
  ],
  blockers: [
    { id: 'eiffel', minX: -40, maxX: -26, minZ: 18, maxZ: 32 },
    { id: 'louvre', minX: 26, maxX: 40, minZ: -34, maxZ: -20 },
    { id: 'cafe', minX: 32, maxX: 44, minZ: 34, maxZ: 42 },
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
    { id: 'cafe-b', districtId: 'cafe', position: [42, 0, 44], fineSearchCenter: [40, 48] },
    { id: 'cafe-c', districtId: 'cafe', position: [50, 0, 30], fineSearchCenter: [48, 34] },
  ],
};
