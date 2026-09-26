/**
 * STUB city definition created by A0 for bootstrap. Owner after CONTRACT_READY: A4.
 * IDs follow docs/CONTENT_AND_LEVELS.md so A6 content resolves against them unchanged.
 * Pure data only: collision, map and socket placement all read from this file.
 */
import { CITY_HALF_EXTENT } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';

const HALF = CITY_HALF_EXTENT;

export const gizaDefinition: CityDefinition = {
  id: 'giza',
  label: 'Giza',
  globeAnchor: { latDeg: 29.98, lonDeg: 31.13 },
  bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
  spawn: [0, 0, 26],
  groundColor: '#efd9a8',
  accentColor: '#ffc857',
  roads: [
    { minX: -HALF, maxX: HALF, minZ: -8, maxZ: 8 },
    { minX: -8, maxX: 8, minZ: -HALF, maxZ: HALF },
  ],
  blockers: [
    { id: 'great-pyramid', minX: -44, maxX: -20, minZ: -44, maxZ: -20 },
    { id: 'sphinx', minX: 16, maxX: 28, minZ: 8, maxZ: 18 },
    { id: 'market', minX: 22, maxX: 38, minZ: 40, maxZ: 52 },
  ],
  districts: [
    {
      id: 'pyramids',
      label: 'Pyramid plateau',
      broadSearch: { center: [-30, -20], radius: 32 },
      narrowedSearch: { center: [-30, -20], radius: 24 },
    },
    {
      id: 'sphinx',
      label: 'Sphinx terrace',
      broadSearch: { center: [24, 13], radius: 28 },
      narrowedSearch: { center: [24, 13], radius: 20 },
    },
    {
      id: 'market',
      label: 'Desert market',
      broadSearch: { center: [31, 49], radius: 28 },
      narrowedSearch: { center: [31, 49], radius: 20 },
    },
  ],
  landmarks: [
    {
      id: 'great-pyramid',
      label: 'Great Pyramid',
      center: [-32, -32],
      footprint: { minX: -44, maxX: -20, minZ: -44, maxZ: -20 },
      silhouette: 'pyramid',
    },
    {
      id: 'sphinx',
      label: 'Sphinx',
      center: [22, 13],
      footprint: { minX: 16, maxX: 28, minZ: 8, maxZ: 18 },
      silhouette: 'sphinx',
    },
    {
      id: 'market',
      label: 'Market stalls',
      center: [30, 46],
      footprint: { minX: 22, maxX: 38, minZ: 40, maxZ: 52 },
      silhouette: 'market',
    },
  ],
  sockets: [
    { id: 'pyramid-a', districtId: 'pyramids', position: [-10, 0, -22], fineSearchCenter: [-14, -20] },
    { id: 'pyramid-b', districtId: 'pyramids', position: [-30, 0, -6], fineSearchCenter: [-30, -11] },
    { id: 'pyramid-c', districtId: 'pyramids', position: [-50, 0, -30], fineSearchCenter: [-46, -28] },
    { id: 'sphinx-a', districtId: 'sphinx', position: [10, 0, 14], fineSearchCenter: [7, 17] },
    { id: 'sphinx-b', districtId: 'sphinx', position: [32, 0, 0], fineSearchCenter: [35, 3] },
    { id: 'sphinx-c', districtId: 'sphinx', position: [32, 0, 26], fineSearchCenter: [35, 29] },
    { id: 'market-a', districtId: 'market', position: [16, 0, 44], fineSearchCenter: [12, 46] },
    { id: 'market-b', districtId: 'market', position: [34, 0, 58], fineSearchCenter: [34, 62] },
    { id: 'market-c', districtId: 'market', position: [44, 0, 46], fineSearchCenter: [48, 48] },
  ],
};
