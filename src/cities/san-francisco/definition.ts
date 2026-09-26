/**
 * San Francisco city definition. Owner: A9.
 * Movement stays flat: hills are background visuals only, never slope physics.
 * Pure data only: collision, map and socket placement all read from this file.
 */
import { CITY_HALF_EXTENT } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';

const HALF = CITY_HALF_EXTENT;

export const sanFranciscoDefinition: CityDefinition = {
  id: 'san-francisco',
  label: 'San Francisco',
  globeAnchor: { latDeg: 37.77, lonDeg: -122.42 },
  bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
  spawn: [0, 0, 28],
  groundColor: '#c9cfd6',
  accentColor: '#e4572e',
  roads: [
    { minX: -HALF, maxX: HALF, minZ: -6, maxZ: 6 },
    { minX: -6, maxX: 6, minZ: -HALF, maxZ: HALF },
    { minX: -HALF, maxX: HALF, minZ: 38, maxZ: 48 },
    { minX: 34, maxX: 44, minZ: -HALF, maxZ: HALF },
  ],
  blockers: [
    { id: 'bridge-approach', minX: -56, maxX: -22, minZ: -56, maxZ: -34 },
    { id: 'cable-barn', minX: 14, maxX: 30, minZ: 12, maxZ: 26 },
    { id: 'painted-row-a', minX: -58, maxX: -40, minZ: 14, maxZ: 28 },
    { id: 'painted-row-b', minX: -34, maxX: -16, minZ: 14, maxZ: 28 },
    { id: 'painted-row-c', minX: -56, maxX: -34, minZ: 52, maxZ: 66 },
    { id: 'wharf-sheds', minX: 16, maxX: 30, minZ: 52, maxZ: 66 },
    { id: 'hill-terrace', minX: 48, maxX: 66, minZ: -30, maxZ: -8 },
    { id: 'bay-pier', minX: 50, maxX: 66, minZ: 18, maxZ: 32 },
  ],
  districts: [
    {
      id: 'bridge',
      label: 'Bridge overlook',
      broadSearch: { center: [-34, -34], radius: 32 },
      narrowedSearch: { center: [-34, -34], radius: 27 },
    },
    {
      id: 'cable',
      label: 'Cable-car street',
      broadSearch: { center: [22, 20], radius: 30 },
      narrowedSearch: { center: [22, 20], radius: 20 },
    },
    {
      id: 'wharf',
      label: 'Bayside wharf',
      broadSearch: { center: [26, 56], radius: 28 },
      narrowedSearch: { center: [26, 56], radius: 20 },
    },
  ],
  landmarks: [
    {
      id: 'golden-gate',
      label: 'Golden Gate Bridge',
      center: [-39, -45],
      footprint: { minX: -56, maxX: -22, minZ: -56, maxZ: -34 },
      silhouette: 'bridge',
    },
    {
      id: 'cable-barn',
      label: 'Cable-car barn',
      center: [22, 19],
      footprint: { minX: 14, maxX: 30, minZ: 12, maxZ: 26 },
      silhouette: 'cable-car',
    },
    {
      id: 'wharf-sheds',
      label: 'Wharf sheds',
      center: [23, 59],
      footprint: { minX: 16, maxX: 30, minZ: 52, maxZ: 66 },
      silhouette: 'market',
    },
  ],
  sockets: [
    { id: 'bridge-a', districtId: 'bridge', position: [-14, 0, -40], fineSearchCenter: [-17, -40] },
    { id: 'bridge-b', districtId: 'bridge', position: [-38, 0, -24], fineSearchCenter: [-38, -27] },
    { id: 'bridge-c', districtId: 'bridge', position: [-58, 0, -38], fineSearchCenter: [-56, -40] },
    { id: 'cable-a', districtId: 'cable', position: [10, 0, 20], fineSearchCenter: [9, 23] },
    { id: 'cable-b', districtId: 'cable', position: [22, 0, 32], fineSearchCenter: [24, 33] },
    { id: 'cable-c', districtId: 'cable', position: [38, 0, 18], fineSearchCenter: [40, 21] },
    { id: 'wharf-a', districtId: 'wharf', position: [10, 0, 56], fineSearchCenter: [8, 58] },
    { id: 'wharf-b', districtId: 'wharf', position: [23, 0, 68], fineSearchCenter: [23, 66] },
    { id: 'wharf-c', districtId: 'wharf', position: [38, 0, 58], fineSearchCenter: [40, 58] },
  ],
};
