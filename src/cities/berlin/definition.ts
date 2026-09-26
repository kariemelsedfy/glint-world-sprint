/**
 * Berlin city definition. Owner: A10.
 * Pure data only: collision, map and socket placement all read from this file.
 */
import { CITY_HALF_EXTENT } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';

const HALF = CITY_HALF_EXTENT;

export const berlinDefinition: CityDefinition = {
  id: 'berlin',
  label: 'Berlin',
  globeAnchor: { latDeg: 52.52, lonDeg: 13.4 },
  bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
  spawn: [0, 0, 26],
  groundColor: '#c8c6bd',
  accentColor: '#d94f8a',
  roads: [
    { minX: -HALF, maxX: HALF, minZ: -9, maxZ: 9 },
    { minX: -9, maxX: 9, minZ: -HALF, maxZ: HALF },
    { minX: -HALF, maxX: HALF, minZ: 40, maxZ: 50 },
  ],
  blockers: [
    { id: 'brandenburg-gate', minX: -44, maxX: -14, minZ: -46, maxZ: -30 },
    { id: 'tv-tower', minX: 20, maxX: 34, minZ: -34, maxZ: -20 },
    { id: 'gallery-wall', minX: 18, maxX: 52, minZ: 52, maxZ: 58 },
    { id: 'altbau-a', minX: -60, maxX: -42, minZ: 14, maxZ: 30 },
    { id: 'altbau-b', minX: -34, maxX: -16, minZ: 14, maxZ: 30 },
    { id: 'altbau-c', minX: -56, maxX: -36, minZ: 54, maxZ: 68 },
    { id: 'plattenbau', minX: 44, maxX: 64, minZ: 16, maxZ: 32 },
    { id: 'kiosk-row', minX: 20, maxX: 34, minZ: 18, maxZ: 28 },
  ],
  districts: [
    {
      id: 'gate',
      label: 'Gate boulevard',
      broadSearch: { center: [-29, -30], radius: 32 },
      narrowedSearch: { center: [-29, -30], radius: 27 },
    },
    {
      id: 'tower',
      label: 'Tower square',
      broadSearch: { center: [28, -22], radius: 30 },
      narrowedSearch: { center: [28, -22], radius: 20 },
    },
    {
      id: 'gallery',
      label: 'Painted wall district',
      broadSearch: { center: [34, 60], radius: 28 },
      narrowedSearch: { center: [34, 60], radius: 20 },
    },
  ],
  landmarks: [
    {
      id: 'brandenburg-gate',
      label: 'Brandenburg Gate',
      center: [-29, -38],
      footprint: { minX: -44, maxX: -14, minZ: -46, maxZ: -30 },
      silhouette: 'gate',
    },
    {
      id: 'tv-tower',
      label: 'TV Tower',
      center: [27, -27],
      footprint: { minX: 20, maxX: 34, minZ: -34, maxZ: -20 },
      silhouette: 'tv-tower',
    },
    {
      id: 'gallery-wall',
      label: 'Painted wall',
      center: [35, 55],
      footprint: { minX: 18, maxX: 52, minZ: 52, maxZ: 58 },
      silhouette: 'market',
    },
  ],
  sockets: [
    { id: 'gate-a', districtId: 'gate', position: [-10, 0, -38], fineSearchCenter: [-13, -38] },
    { id: 'gate-b', districtId: 'gate', position: [-29, 0, -22], fineSearchCenter: [-29, -25] },
    { id: 'gate-c', districtId: 'gate', position: [-52, 0, -38], fineSearchCenter: [-50, -40] },
    { id: 'tower-a', districtId: 'tower', position: [14, 0, -24], fineSearchCenter: [13, -21] },
    { id: 'tower-b', districtId: 'tower', position: [40, 0, -26], fineSearchCenter: [42, -24] },
    { id: 'tower-c', districtId: 'tower', position: [27, 0, -40], fineSearchCenter: [27, -42] },
    { id: 'gallery-a', districtId: 'gallery', position: [18, 0, 64], fineSearchCenter: [16, 64] },
    { id: 'gallery-b', districtId: 'gallery', position: [34, 0, 66], fineSearchCenter: [34, 68] },
    { id: 'gallery-c', districtId: 'gallery', position: [50, 0, 64], fineSearchCenter: [52, 64] },
  ],
};
