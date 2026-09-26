/**
 * One-shot generator for item-specific placeholder pictures so no target ever
 * falls back to a generic gold shape. A1 replaces these with final artwork.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'targets');
mkdirSync(outDir, { recursive: true });

/** @type {ReadonlyArray<{id: string, bg: string, fg: string, glyph: string, label: string}>} */
const ITEMS = [
  { id: 'paris-smile', bg: '#3C2A6B', fg: '#F6D8A8', glyph: 'M32 74c0-16 12-28 24-28s24 12 24 28z M56 22a14 14 0 1 1 0 28 14 14 0 0 1 0-28z', label: 'Portrait' },
  { id: 'paris-iron', bg: '#2B3F6B', fg: '#F3B84B', glyph: 'M56 12 84 96H70L56 56 42 96H28z M40 70h32v8H40z', label: 'Iron tower' },
  { id: 'paris-crescent', bg: '#6B3A2A', fg: '#F5C46B', glyph: 'M20 66c14-26 54-26 68 0-10-10-24-14-34-14s-24 4-34 14z M18 66h76v10H18z', label: 'Croissant' },
  { id: 'giza-crown', bg: '#7A5A22', fg: '#FFE39B', glyph: 'M56 16 92 88H20z M56 34 76 76H36z', label: 'Capstone' },
  { id: 'giza-guardian', bg: '#8A5F2B', fg: '#F7DFA6', glyph: 'M24 84h64v10H24z M36 44a20 20 0 1 1 40 0v14H36z M30 58h52v26H30z', label: 'Guardian' },
  { id: 'giza-beetle', bg: '#123F55', fg: '#49D2E0', glyph: 'M56 20c12 0 20 10 20 24s-8 34-20 34-20-20-20-34 8-24 20-24z M28 46h16M68 46h16M28 66h16M68 66h16', label: 'Scarab' },
  { id: 'rome-arena', bg: '#6B2F22', fg: '#F0C88A', glyph: 'M16 44a40 26 0 0 1 80 0v40H16z M32 52v26 M52 52v26 M72 52v26 M16 66h80', label: 'Arena' },
  { id: 'rome-laurel', bg: '#28502F', fg: '#F2D06B', glyph: 'M56 92C30 76 22 52 26 24c18 4 30 20 30 44 0-24 12-40 30-44 4 28-4 52-30 68z', label: 'Laurel' },
  { id: 'sf-cable-car', bg: '#33465E', fg: '#F2705A', glyph: 'M22 34h68v36H22z M30 42h20v18H30z M62 42h20v18H62z M34 78a8 8 0 1 0 0.1 0z M78 78a8 8 0 1 0 0.1 0z', label: 'Cable car' },
  { id: 'sf-bridge', bg: '#2A4D6B', fg: '#E4572E', glyph: 'M10 78h92 M28 78V28 M84 78V28 M10 60c20-26 34-26 46 0 12-26 26-26 46 0', label: 'Bridge' },
  { id: 'berlin-gate', bg: '#3B3550', fg: '#F0E2C0', glyph: 'M16 84h80v10H16z M24 40h8v44h-8z M44 40h8v44h-8z M62 40h8v44h-8z M82 40h8v44h-8z M14 24h84v14H14z', label: 'Gate' },
  { id: 'berlin-tower', bg: '#243A57', fg: '#D9E6F2', glyph: 'M52 90h8V54h-8z M56 20v12 M56 32a16 16 0 1 1 0.1 0z M40 96h32v6H40z', label: 'TV tower' },
];

for (const item of ITEMS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" width="112" height="112" role="img" aria-label="${item.label}">
  <rect width="112" height="112" rx="14" fill="${item.bg}"/>
  <rect x="5" y="5" width="102" height="102" rx="10" fill="none" stroke="#211333" stroke-width="6"/>
  <g fill="${item.fg}" stroke="${item.fg}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="${item.glyph}"/>
  </g>
</svg>
`;
  writeFileSync(join(outDir, `${item.id}.svg`), svg, 'utf8');
}
console.log(`wrote ${ITEMS.length} placeholder target images to ${outDir}`);
