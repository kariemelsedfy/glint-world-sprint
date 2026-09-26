/**
 * Procedural cartoon earth textures. Owner: A2.
 * Hand-simplified continent outlines (lat/lon polygons, no map data or imagery) painted once into a
 * cached canvas; deserts, caps, coasts and clouds are layered on top. Seeded RNG keeps every load identical.
 */
import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three';
import { createRng, hashSeed } from '@/shared/seed';

export const OCEAN = '#2a9fe0';
export const OCEAN_DEEP = '#1d63c9';
export const OCEAN_SHALLOW = '#22c4ea';
export const LAND = '#8fdc78';
export const LAND_MINT = '#a9e9b4';
export const LAND_DARK = '#4fae58';
export const SAND = '#f2d98a';
export const DESERT = '#e9b96a';
export const ICE = '#fff5e9';
export const INK = '#211333';

/** [latDeg, lonDeg] vertices, drawn as a smoothed closed loop. */
type Outline = readonly (readonly [number, number])[];

interface Land {
  readonly outline: Outline;
  readonly fill?: string;
}

// Deliberately chunky, toy-like silhouettes; only the gestalt has to read as Earth.
const NORTH_AMERICA: Outline = [
  [71, -156], [70, -128], [73, -95], [68, -80], [62, -78], [60, -64], [52, -56], [47, -60], [44, -66],
  [40, -74], [35, -76], [30, -81], [25, -80], [29, -89], [26, -97], [21, -97], [18, -95], [15, -92],
  [9, -80], [8, -78], [12, -86], [16, -95], [22, -106], [30, -115], [37, -123], [46, -124], [56, -131],
  [60, -147], [59, -160], [65, -166],
];
const SOUTH_AMERICA: Outline = [
  [11, -73], [8, -60], [3, -51], [-4, -38], [-13, -38], [-22, -41], [-30, -50], [-38, -57], [-46, -66],
  [-54, -68], [-50, -75], [-40, -73], [-30, -71], [-18, -70], [-6, -80], [1, -79], [7, -78],
];
const AFRICA: Outline = [
  [36, -6], [37, 10], [33, 12], [31, 32], [23, 36], [12, 43], [11, 51], [2, 46], [-5, 40], [-15, 41],
  [-25, 35], [-34, 26], [-34, 19], [-27, 15], [-16, 12], [-6, 12], [1, 9], [5, 5], [5, -6], [9, -14],
  [15, -17], [21, -17], [28, -13], [33, -9],
];
const EURASIA: Outline = [
  [70, 26], [71, 55], [76, 70], [76, 105], [72, 130], [69, 160], [64, 180], [59, 164], [55, 158],
  [51, 141], [43, 134], [39, 122], [30, 122], [22, 112], [12, 109], [1, 104], [8, 98], [16, 94],
  [22, 90], [17, 82], [8, 77], [21, 72], [24, 61], [26, 56], [22, 58], [15, 52], [13, 43], [21, 39],
  // Europe is traced densely (duplicate vertices sharpen peninsula tips) because three pins land here.
  [30, 33], [36, 36], [36, 30], [37, 27], [40, 26], [41, 23], [39, 22], [37, 22], [37, 22], [38, 21],
  [39, 20], [42, 19], [44, 15], [43, 14], [41, 17], [40, 18.5], [40, 18.5], [39, 17], [38, 16], [38, 16],
  [40, 15], [42, 12], [44, 9], [43.5, 6], [42, 3], [40, 0], [37, -1], [36.5, -6], [37, -9], [39, -9.5],
  [43, -9], [43.5, -2], [46, -1], [48, -5], [49, 0], [51, 2], [53, 5], [54, 8], [57, 8], [57, 10],
  [56, 11], [54, 11], [54, 14], [54, 20], [57, 21], [59, 24], [60, 30], [61, 22], [64, 22], [66, 24],
  [64, 21], [60, 18], [58, 16], [56, 14], [58, 11], [59, 10], [58, 7], [62, 5], [69, 14],
];
const AUSTRALIA: Outline = [
  [-12, 131], [-12, 136], [-16, 141], [-11, 143], [-19, 147], [-27, 153], [-33, 152], [-38, 147],
  [-38, 140], [-35, 137], [-32, 133], [-34, 124], [-33, 115], [-26, 113], [-21, 115], [-18, 122], [-14, 127],
];
const GREENLAND: Outline = [
  [83, -35], [81, -20], [76, -20], [70, -22], [65, -40], [60, -44], [64, -52], [72, -56], [78, -70], [82, -60],
];
const ANTARCTICA: Outline = [
  [-66, -180], [-69, -120], [-73, -80], [-70, -60], [-72, -20], [-68, 10], [-66, 50], [-66, 90],
  [-65, 130], [-70, 170], [-72, 180], [-90, 180], [-90, -180],
];

const LANDS: readonly Land[] = [
  { outline: NORTH_AMERICA },
  { outline: SOUTH_AMERICA },
  { outline: AFRICA },
  { outline: EURASIA },
  { outline: AUSTRALIA },
  { outline: GREENLAND, fill: ICE },
  { outline: ANTARCTICA, fill: ICE },
  { outline: [[59, -8], [58, -3], [53, 1], [51, 1], [50, -5], [54, -4], [58, -6]] },
  { outline: [[45, 142], [43, 145], [36, 141], [33, 133], [31, 131], [35, 133], [39, 140], [42, 140]] },
  { outline: [[-12, 49], [-16, 50], [-25, 47], [-25, 44], [-19, 44], [-13, 48]] },
  { outline: [[-34, 173], [-37, 178], [-41, 176], [-46, 171], [-46, 167], [-41, 172], [-38, 174]] },
  { outline: [[-2, 141], [-3, 150], [-9, 148], [-9, 143], [-6, 138], [-2, 133]] },
  { outline: [[5, 96], [-1, 100], [-6, 106], [-7, 113], [-3, 116], [1, 111], [-1, 104], [3, 101]] },
  { outline: [[65, -20], [66, -14], [64, -14], [63, -22]] },
  { outline: [[22, -78], [20, -74], [21, -84], [23, -82]] },
  // Mediterranean islands: Sicily, Sardinia, Corsica, Crete, Cyprus.
  { outline: [[38.2, 12.4], [38.2, 15.6], [36.7, 15.2], [37.2, 12.6]] },
  { outline: [[41.2, 8.4], [41.2, 9.7], [39, 9.6], [39, 8.5]] },
  { outline: [[43, 9], [43, 9.5], [41.5, 9.3], [41.5, 8.7]] },
  { outline: [[35.6, 23.5], [35.6, 26.3], [34.9, 26.1], [35, 23.6]] },
  { outline: [[35.6, 32.3], [35.6, 34.5], [34.7, 33.6], [34.8, 32.4]] },
];

// Inland seas painted back over the land so the Europe/Middle-East silhouette keeps its gaps.
const SEAS: readonly Land[] = [
  { outline: [[41.2, 28], [43, 28], [45.5, 33], [45, 37], [43, 40.5], [41, 41.5], [41, 36], [41, 29.5]] },
  { outline: [[47, 48], [46.5, 52], [42, 51], [38, 52], [37, 53.5], [40.5, 54], [45, 52.5], [47.5, 50]] },
];

// Deserts are inset blobs so the coast stays green/sandy around them.
const DESERTS: readonly Land[] = [
  { outline: [[30, -10], [31, 10], [28, 30], [20, 32], [15, 22], [16, 5], [20, -12]] },
  { outline: [[30, 40], [28, 52], [21, 54], [17, 47], [22, 40]] },
  { outline: [[-20, 120], [-22, 137], [-30, 138], [-31, 125], [-25, 118]] },
  { outline: [[44, 90], [45, 110], [40, 108], [38, 92]] },
  { outline: [[36, -116], [36, -106], [29, -106], [28, -113]] },
  { outline: [[-22, 15], [-24, 20], [-30, 21], [-30, 16]] },
];

function project(lat: number, lon: number, width: number, height: number): [number, number] {
  return [((lon + 180) / 360) * width, ((90 - lat) / 180) * height];
}

/** Closed loop through the midpoints of the polygon edges: rounds every corner without extra vertices. */
function traceOutline(ctx: CanvasRenderingContext2D, outline: Outline, width: number, height: number): void {
  const points = outline.map(([lat, lon]) => project(lat, lon, width, height));
  const n = points.length;
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  const start = mid(points[n - 1], points[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % n];
    const m = mid(current, next);
    ctx.quadraticCurveTo(current[0], current[1], m[0], m[1]);
  }
  ctx.closePath();
}

function fillOutlines(ctx: CanvasRenderingContext2D, lands: readonly Land[], width: number, height: number, fill: (land: Land) => string): void {
  for (const land of lands) {
    traceOutline(ctx, land.outline, width, height);
    ctx.fillStyle = fill(land);
    ctx.fill();
  }
}

function strokeOutlines(ctx: CanvasRenderingContext2D, lands: readonly Land[], width: number, height: number, color: string, lineWidth: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  for (const land of lands) {
    traceOutline(ctx, land.outline, width, height);
    ctx.stroke();
  }
}

export function paintEarth(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const unit = width / 512;

  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, OCEAN_DEEP);
  ocean.addColorStop(0.35, OCEAN);
  ocean.addColorStop(0.5, OCEAN_SHALLOW);
  ocean.addColorStop(0.65, OCEAN);
  ocean.addColorStop(1, OCEAN_DEEP);
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  // Seeded ocean shimmer + island specks: decorative only, deterministic per load.
  const rng = createRng(hashSeed('glint', 'earth-islands'));
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let i = 0; i < 40; i += 1) {
    const x = rng.next() * width;
    const y = height * (0.15 + rng.next() * 0.7);
    const r = (6 + rng.next() * 18) * unit;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 2.4, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = LAND_DARK;
  for (let i = 0; i < 36; i += 1) {
    const x = rng.next() * width;
    const y = height * (0.25 + rng.next() * 0.5);
    const r = (1.2 + rng.next() * 2.2) * unit;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shallow-water halo, sandy coast, ink outline, then land fill and a mint highlight band.
  strokeOutlines(ctx, LANDS, width, height, 'rgba(160,240,255,0.55)', 9 * unit);
  strokeOutlines(ctx, LANDS, width, height, SAND, 5 * unit);
  strokeOutlines(ctx, LANDS, width, height, INK, 2.4 * unit);
  fillOutlines(ctx, LANDS, width, height, (land) => land.fill ?? LAND_DARK);

  ctx.save();
  ctx.translate(0, -1.6 * unit);
  fillOutlines(ctx, LANDS, width, height, (land) => land.fill ?? LAND);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.translate(0, -4 * unit);
  ctx.scale(1, 0.94);
  fillOutlines(ctx, LANDS, width, height, (land) => land.fill ?? LAND_MINT);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.9;
  fillOutlines(ctx, DESERTS, width, height, () => DESERT);
  ctx.restore();

  strokeOutlines(ctx, SEAS, width, height, SAND, 4 * unit);
  strokeOutlines(ctx, SEAS, width, height, INK, 2 * unit);
  fillOutlines(ctx, SEAS, width, height, () => OCEAN_SHALLOW);

  // Polar cap: Antarctica is an outline above; the north gets a soft ice ring.
  const cap = ctx.createLinearGradient(0, 0, 0, (16 / 180) * height);
  cap.addColorStop(0, ICE);
  cap.addColorStop(0.7, ICE);
  cap.addColorStop(1, 'rgba(255,245,233,0)');
  ctx.fillStyle = cap;
  ctx.fillRect(0, 0, width, (16 / 180) * height);

  paintClouds(ctx, width, height);
}

/** A few large, soft cloud banks; baked into the surface so the globe stays a single textured draw. */
export function paintClouds(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const rng = createRng(hashSeed('glint', 'earth-clouds'));
  const unit = width / 512;
  for (let i = 0; i < 14; i += 1) {
    const x = rng.next() * width;
    const y = height * (0.12 + rng.next() * 0.76);
    const r = (14 + rng.next() * 22) * unit;
    const alpha = 0.32 + rng.next() * 0.22;
    // Keep the Europe/Mediterranean pin cluster cloud-free so Paris/Rome/Berlin read on land.
    const lon = (x / width) * 360 - 180;
    const lat = 90 - (y / height) * 180;
    if (lat > 28 && lat < 66 && lon > -16 && lon < 46) continue;
    for (let puffIndex = 0; puffIndex < 3; puffIndex += 1) {
      const px = x + (rng.next() - 0.5) * r * 2.2;
      const py = y + (rng.next() - 0.5) * r * 0.6;
      const pr = r * (0.55 + rng.next() * 0.5);
      const puff = ctx.createRadialGradient(px, py, 0, px, py, pr);
      puff.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(2)})`);
      puff.addColorStop(0.6, `rgba(255,255,255,${(alpha * 0.7).toFixed(2)})`);
      puff.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = puff;
      ctx.beginPath();
      ctx.ellipse(px, py, pr * 1.7, pr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function makeCanvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}

export function paintGlow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  // Sampled by the glow annulus (0.985R..1.25R over a 2.5R square): the rim starts at 0.4w and fades by 0.5w.
  const glow = ctx.createRadialGradient(cx, cy, width * 0.38, cx, cy, width * 0.5);
  glow.addColorStop(0, 'rgba(182,161,232,0.8)');
  glow.addColorStop(0.3, 'rgba(120,150,245,0.35)');
  glow.addColorStop(0.65, 'rgba(60,120,200,0.1)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

let glowTexture: CanvasTexture | null = null;
export function getGlowTexture(): CanvasTexture {
  glowTexture ??= makeCanvasTexture(128, 128, paintGlow);
  return glowTexture;
}

let earthTexture: CanvasTexture | null = null;

/** Lazily created once per page; shared by every GlobeScene mount. */
export function getEarthTexture(): CanvasTexture {
  earthTexture ??= makeCanvasTexture(1024, 512, paintEarth);
  return earthTexture;
}
