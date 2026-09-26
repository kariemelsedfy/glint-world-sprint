/**
 * Procedural cartoon earth textures. Owner: A2.
 * Original simplified continent shapes (no map data) painted once into canvases;
 * cloud puffs and island specks come from the seeded RNG so every load matches.
 */
import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three';
import { createRng, hashSeed } from '@/shared/seed';

export const OCEAN = '#2aa3dc';
export const OCEAN_DEEP = '#1f7fc4';
export const LAND = '#7ccd6a';
export const LAND_DARK = '#5aad4f';
export const SAND = '#e6c77a';
export const ICE = '#f4fbff';
export const COAST = '#1c6fa8';

interface Blob {
  readonly lat: number;
  readonly lon: number;
  /** Half extents in degrees. */
  readonly rLon: number;
  readonly rLat: number;
  readonly color?: string;
  readonly rot?: number;
}

/** Stylised, deliberately inaccurate landmasses that still read as "Earth". */
const CONTINENTS: readonly Blob[] = [
  // Eurasia
  { lat: 51, lon: 12, rLon: 22, rLat: 12 },
  { lat: 56, lon: 85, rLon: 62, rLat: 18 },
  { lat: 40, lon: 100, rLon: 30, rLat: 12 },
  { lat: 20, lon: 78, rLon: 10, rLat: 12 },
  { lat: 24, lon: 46, rLon: 11, rLat: 9, color: SAND },
  { lat: 14, lon: 103, rLon: 9, rLat: 8 },
  { lat: 34, lon: 138, rLon: 3, rLat: 6 },
  // Africa
  { lat: 22, lon: 12, rLon: 26, rLat: 10, color: SAND },
  { lat: 4, lon: 20, rLon: 20, rLat: 20 },
  { lat: -18, lon: 24, rLon: 13, rLat: 16 },
  { lat: -19, lon: 47, rLon: 3, rLat: 6 },
  // North America
  { lat: 48, lon: -100, rLon: 34, rLat: 18 },
  { lat: 64, lon: -110, rLon: 42, rLat: 10 },
  { lat: 34, lon: -100, rLon: 16, rLat: 8, color: SAND },
  { lat: 17, lon: -93, rLon: 8, rLat: 6 },
  { lat: 73, lon: -40, rLon: 12, rLat: 9, color: ICE },
  // South America
  { lat: -8, lon: -58, rLon: 18, rLat: 18 },
  { lat: -30, lon: -63, rLon: 9, rLat: 16 },
  { lat: -48, lon: -70, rLon: 4, rLat: 8 },
  // Oceania
  { lat: -25, lon: 134, rLon: 17, rLat: 11, color: SAND },
  { lat: -28, lon: 148, rLon: 6, rLat: 10 },
  { lat: -41, lon: 173, rLon: 3, rLat: 5 },
  { lat: -5, lon: 140, rLon: 10, rLat: 4 },
];

function project(lat: number, lon: number, width: number, height: number): [number, number] {
  return [((lon + 180) / 360) * width, ((90 - lat) / 180) * height];
}

function drawBlob(ctx: CanvasRenderingContext2D, blob: Blob, width: number, height: number, fill: string, grow: number) {
  const [x, y] = project(blob.lat, blob.lon, width, height);
  const rx = ((blob.rLon + grow) / 360) * width;
  const ry = ((blob.rLat + grow) / 180) * height;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, blob.rot ?? 0, 0, Math.PI * 2);
  ctx.fill();
}

export function paintEarth(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, OCEAN_DEEP);
  ocean.addColorStop(0.5, OCEAN);
  ocean.addColorStop(1, OCEAN_DEEP);
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  // Seeded island specks: decorative only, but deterministic per load.
  const rng = createRng(hashSeed('glint', 'earth-islands'));
  ctx.fillStyle = LAND_DARK;
  for (let i = 0; i < 60; i += 1) {
    const x = rng.next() * width;
    const y = height * (0.2 + rng.next() * 0.6);
    const r = 1.5 + rng.next() * 3;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coast halo, then land fill, then a slightly inset highlight for a toy look.
  for (const blob of CONTINENTS) drawBlob(ctx, blob, width, height, COAST, 1.6);
  for (const blob of CONTINENTS) drawBlob(ctx, blob, width, height, blob.color ?? LAND_DARK, 0.6);
  for (const blob of CONTINENTS) drawBlob(ctx, blob, width, height, blob.color ?? LAND, -1.2);

  // Polar caps
  ctx.fillStyle = ICE;
  ctx.fillRect(0, 0, width, (12 / 180) * height);
  ctx.fillRect(0, height - (22 / 180) * height, width, (22 / 180) * height);
}

export function paintClouds(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  const rng = createRng(hashSeed('glint', 'earth-clouds'));
  for (let i = 0; i < 110; i += 1) {
    const x = rng.next() * width;
    const y = height * (0.08 + rng.next() * 0.84);
    const r = 10 + rng.next() * 26;
    const alpha = 0.55 + rng.next() * 0.4;
    const puff = ctx.createRadialGradient(x, y, 0, x, y, r);
    puff.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(2)})`);
    puff.addColorStop(0.7, `rgba(255,255,255,${(alpha * 0.5).toFixed(2)})`);
    puff.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.8, r, 0, 0, Math.PI * 2);
    ctx.fill();
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
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function paintGlow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  // Globe occupies the inner ~32% of the plane; the rim glow starts just inside its edge.
  const glow = ctx.createRadialGradient(cx, cy, width * 0.3, cx, cy, width * 0.5);
  glow.addColorStop(0, 'rgba(140,210,255,0.8)');
  glow.addColorStop(0.18, 'rgba(100,180,245,0.42)');
  glow.addColorStop(0.5, 'rgba(60,120,200,0.12)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

let glowTexture: CanvasTexture | null = null;
export function getGlowTexture(): CanvasTexture {
  glowTexture ??= makeCanvasTexture(256, 256, paintGlow);
  return glowTexture;
}

let earthTexture: CanvasTexture | null = null;
let cloudTexture: CanvasTexture | null = null;

/** Lazily created once per page; shared by every GlobeScene mount. */
export function getEarthTexture(): CanvasTexture {
  earthTexture ??= makeCanvasTexture(1024, 512, paintEarth);
  return earthTexture;
}

export function getCloudTexture(): CanvasTexture {
  cloudTexture ??= makeCanvasTexture(512, 256, paintClouds);
  return cloudTexture;
}
