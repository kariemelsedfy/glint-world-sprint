/**
 * Target picture textures for collectibles. Owner: A1.
 * Rasterises the local SVG from the target image registry into a shared CanvasTexture
 * (one per TargetId, cached for the session). Until the image decodes, or if it fails,
 * the canvas holds an item-specific fallback card so every target still reads.
 */
import { CanvasTexture, SRGBColorSpace, LinearFilter, LinearMipmapLinearFilter } from 'three';
import type { TargetId } from '@/shared/contracts';
import { getTargetImage } from '@/assets/targetImages';

export const TEXTURE_SIZE = 512;

interface FallbackStyle {
  readonly bg: string;
  readonly fg: string;
  readonly glyph: string;
}

const FALLBACKS: Readonly<Record<TargetId, FallbackStyle>> = {
  'paris-smile': { bg: '#7146C5', fg: '#FFF5E9', glyph: '☺' },
  'paris-iron': { bg: '#B6A1E8', fg: '#211333', glyph: 'A' },
  'paris-crescent': { bg: '#22C4EA', fg: '#FFD963', glyph: '☾' },
  'giza-crown': { bg: '#7146C5', fg: '#FFD963', glyph: '▲' },
  'giza-guardian': { bg: '#22C4EA', fg: '#FFD963', glyph: '☀' },
  'giza-beetle': { bg: '#FFD963', fg: '#22C4EA', glyph: '●' },
  'rome-arena': { bg: '#F43FAB', fg: '#FFF5E9', glyph: '◯' },
  'rome-laurel': { bg: '#7146C5', fg: '#FFD963', glyph: '❦' },
  'sf-cable-car': { bg: '#22C4EA', fg: '#F43FAB', glyph: '▬' },
  'sf-bridge': { bg: '#FFF5E9', fg: '#F43FAB', glyph: '⌒' },
  'berlin-gate': { bg: '#FFD963', fg: '#211333', glyph: '∏' },
  'berlin-tower': { bg: '#F43FAB', fg: '#FFF5E9', glyph: '⟟' },
};

export function drawFallbackCard(ctx: CanvasRenderingContext2D, id: TargetId, size: number): void {
  const style = FALLBACKS[id];
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#211333';
  ctx.lineWidth = size * 0.03;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);
  ctx.fillStyle = style.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.5}px sans-serif`;
  ctx.fillText(style.glyph, size / 2, size * 0.44);
  ctx.font = `bold ${size * 0.09}px sans-serif`;
  ctx.fillStyle = '#211333';
  const label = getTargetImage(id).alt.split(' ').slice(0, 3).join(' ');
  ctx.fillText(label, size / 2, size * 0.84, size * 0.9);
}

const cache = new Map<TargetId, CanvasTexture>();
const loaded = new Set<TargetId>();

/** Returns the shared texture for a target, starting the SVG rasterisation on first use. */
export function getTargetTexture(id: TargetId): CanvasTexture {
  const existing = cache.get(id);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  cache.set(id, texture);
  if (!ctx) return texture;

  drawFallbackCard(ctx, id, TEXTURE_SIZE);
  texture.needsUpdate = true;

  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    ctx.drawImage(image, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    texture.needsUpdate = true;
    loaded.add(id);
  };
  image.src = getTargetImage(id).url;
  return texture;
}

/** Whether the real artwork has replaced the fallback card for this target. */
export function isTargetTextureLoaded(id: TargetId): boolean {
  return loaded.has(id);
}
