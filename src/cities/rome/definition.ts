/**
 * Rome city definition. Owner: A8.
 * Pure data only: collision, map and socket placement all read from this file.
 * RomeScene renders every blocker listed here and nothing solid beyond them.
 */
import { CITY_HALF_EXTENT } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';

const HALF = CITY_HALF_EXTENT;

export const romeDefinition: CityDefinition = {
  id: 'rome',
  label: 'Rome',
  globeAnchor: { latDeg: 41.9, lonDeg: 12.5 },
  bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
  spawn: [0, 0, 24],
  groundColor: '#d9c4a3',
  accentColor: '#d9793f',
  roads: [
    { minX: -HALF, maxX: HALF, minZ: -7, maxZ: 7 },
    { minX: -7, maxX: 7, minZ: -HALF, maxZ: HALF },
    { minX: -HALF, maxX: HALF, minZ: 36, maxZ: 46 },
  ],
  blockers: [
    { id: 'colosseum', minX: -46, maxX: -16, minZ: -48, maxZ: -18 },
    { id: 'fountain', minX: 18, maxX: 34, minZ: 12, maxZ: 28 },
    { id: 'trattoria', minX: 24, maxX: 44, minZ: 48, maxZ: 62 },
    { id: 'insula-a', minX: -60, maxX: -44, minZ: 12, maxZ: 28 },
    { id: 'insula-b', minX: -38, maxX: -20, minZ: 14, maxZ: 30 },
    { id: 'insula-c', minX: -56, maxX: -38, minZ: 50, maxZ: 64 },
    { id: 'forum-ruin', minX: 16, maxX: 40, minZ: -42, maxZ: -22 },
    { id: 'cypress-row', minX: 52, maxX: 62, minZ: -18, maxZ: 4 },
  ],
  districts: [
    {
      id: 'arena',
      label: 'Arena quarter',
      broadSearch: { center: [-30, -30], radius: 32 },
      narrowedSearch: { center: [-30, -30], radius: 27 },
    },
    {
      id: 'piazza',
      label: 'Fountain piazza',
      broadSearch: { center: [26, 20], radius: 30 },
      narrowedSearch: { center: [26, 20], radius: 20 },
    },
    {
      id: 'trastevere',
      label: 'Trattoria lanes',
      broadSearch: { center: [32, 54], radius: 28 },
      narrowedSearch: { center: [32, 54], radius: 20 },
    },
  ],
  landmarks: [
    {
      id: 'colosseum',
      label: 'Colosseum',
      center: [-31, -33],
      footprint: { minX: -46, maxX: -16, minZ: -48, maxZ: -18 },
      silhouette: 'colosseum',
    },
    {
      id: 'fountain',
      label: 'Trevi Fountain',
      center: [26, 20],
      footprint: { minX: 18, maxX: 34, minZ: 12, maxZ: 28 },
      silhouette: 'fountain',
    },
    {
      id: 'trattoria',
      label: 'Trattoria row',
      center: [34, 55],
      footprint: { minX: 24, maxX: 44, minZ: 48, maxZ: 62 },
      silhouette: 'cafe',
    },
  ],
  sockets: [
    { id: 'arena-a', districtId: 'arena', position: [-10, 0, -30], fineSearchCenter: [-13, -30] },
    { id: 'arena-b', districtId: 'arena', position: [-30, 0, -12], fineSearchCenter: [-30, -15] },
    { id: 'arena-c', districtId: 'arena', position: [-54, 0, -34], fineSearchCenter: [-50, -34] },
    { id: 'piazza-a', districtId: 'piazza', position: [12, 0, 20], fineSearchCenter: [9, 22] },
    { id: 'piazza-b', districtId: 'piazza', position: [40, 0, 20], fineSearchCenter: [43, 18] },
    { id: 'piazza-c', districtId: 'piazza', position: [26, 0, 34], fineSearchCenter: [22, 36] },
    { id: 'trastevere-a', districtId: 'trastevere', position: [16, 0, 54], fineSearchCenter: [13, 54] },
    { id: 'trastevere-b', districtId: 'trastevere', position: [34, 0, 66], fineSearchCenter: [34, 68] },
    { id: 'trastevere-c', districtId: 'trastevere', position: [52, 0, 54], fineSearchCenter: [55, 54] },
  ],
};
