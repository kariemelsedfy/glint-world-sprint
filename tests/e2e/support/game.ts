/**
 * Shared e2e helpers. They drive the production build only through real DOM controls and
 * keyboard input; nothing here reaches into the store or ships a test hook.
 * Selectors target the current bootstrap GameUI; update them here when A5's UI lands.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { PLAYER_RADIUS, PLAYER_SPEED } from '@/shared/contracts';
import type { CityId, LevelId, RectXZ, TargetId } from '@/shared/contracts';

export interface OracleObjective {
  readonly targetId: TargetId;
  readonly cityId: CityId;
  readonly title: string;
  readonly position: readonly [number, number];
  readonly broadRadius: number;
  readonly narrowedRadius: number;
  readonly fineRadius: number;
  readonly landmarkLabel: string | null;
}
export interface OracleLevel {
  readonly id: LevelId;
  readonly title: string;
  readonly seed: number;
  readonly version: number;
  readonly objectives: readonly OracleObjective[];
}
export interface OracleCity {
  readonly id: CityId;
  readonly label: string;
  readonly spawn: readonly [number, number];
  readonly blockers: readonly (RectXZ & { readonly id: string })[];
  readonly bounds: RectXZ;
}
export interface Oracle {
  readonly levels: readonly OracleLevel[];
  readonly cities: readonly OracleCity[];
}

let cached: Oracle | null = null;

/**
 * Resolves objectives with the real game resolver under vite-node (so Vite aliases and the
 * city registry load exactly as in the app). Playwright's own TS loader cannot import the
 * scene modules, and duplicating the seeded resolver here would hide regressions.
 */
export function oracle(): Oracle {
  if (cached) return cached;
  const root = resolve(import.meta.dirname, '..', '..', '..');
  const bin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vite-node.cmd' : 'vite-node');
  const json = execFileSync(bin, ['tests/e2e/support/print-objectives.ts'], { cwd: root, encoding: 'utf8' });
  cached = JSON.parse(json) as Oracle;
  return cached;
}

export function level(id: LevelId): OracleLevel {
  const found = oracle().levels.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown level ${id}`);
  return found;
}

export function city(id: CityId): OracleCity {
  const found = oracle().cities.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown city ${id}`);
  return found;
}

/** Parses the `m:ss.t` format produced by formatMs into milliseconds. */
export function parseClock(text: string): number {
  const match = /(\d+):(\d{2})\.(\d)/.exec(text);
  if (!match) throw new Error(`Not a clock value: ${text}`);
  return (Number(match[1]) * 60 + Number(match[2])) * 1000 + Number(match[3]) * 100;
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

export async function openFresh(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'GLINT World Sprint' })).toBeVisible();
}

export async function startLevel(page: Page, levelId: LevelId): Promise<void> {
  await page.getByRole('button', { name: level(levelId).title, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Briefing' })).toBeVisible();
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Fly to / }).first()).toBeVisible();
}

export function hud(page: Page) {
  const penalty = page.getByText(/^penalty \d+:\d{2}\.\d$/);
  return {
    adjusted: page.locator('strong').filter({ hasText: /^\d+:\d{2}\.\d$/ }).first(),
    penalty,
    practice: page.getByText('practice', { exact: true }),
    async penaltyMs(): Promise<number> {
      return parseClock((await penalty.textContent()) ?? '');
    },
    async adjustedMs(): Promise<number> {
      return parseClock((await this.adjusted.textContent()) ?? '');
    },
  };
}

export async function flyTo(page: Page, cityId: CityId): Promise<void> {
  const label = city(cityId).label;
  await page.getByRole('button', { name: `Fly to ${label}` }).click();
  await expect(page.getByRole('button', { name: 'Globe', exact: true })).toBeVisible({ timeout: 20_000 });
}

export async function returnToGlobe(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Globe', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Fly to / }).first()).toBeVisible({ timeout: 20_000 });
}

export function mapSvg(page: Page, cityId: CityId): Locator {
  return page.getByRole('img', { name: `${city(cityId).label} map` });
}

export async function openMap(page: Page, cityId: CityId): Promise<Locator> {
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const svg = mapSvg(page, cityId);
  await expect(svg).toBeVisible();
  return svg;
}

export async function closeMap(page: Page, cityId: CityId): Promise<void> {
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(mapSvg(page, cityId)).toBeHidden();
}

/** The map draws the player as the only r=2.2 circle; its centre is city-local X/Z. */
export async function readPlayerFromMap(svg: Locator): Promise<[number, number]> {
  const dot = svg.locator('circle[r="2.2"]');
  const cx = Number(await dot.getAttribute('cx'));
  const cy = Number(await dot.getAttribute('cy'));
  return [cx, cy];
}

export async function readPlayer(page: Page, cityId: CityId): Promise<[number, number]> {
  const svg = await openMap(page, cityId);
  const position = await readPlayerFromMap(svg);
  await closeMap(page, cityId);
  return position;
}

export function searchCircles(svg: Locator): Locator {
  return svg.locator('circle[fill="#ffd166"]');
}

type Leg = { readonly axis: 'x' | 'z'; readonly value: number };

function segmentHits(rect: RectXZ, from: readonly [number, number], to: readonly [number, number]): boolean {
  const pad = PLAYER_RADIUS + 0.4;
  const minX = Math.min(from[0], to[0]);
  const maxX = Math.max(from[0], to[0]);
  const minZ = Math.min(from[1], to[1]);
  const maxZ = Math.max(from[1], to[1]);
  return maxX > rect.minX - pad && minX < rect.maxX + pad && maxZ > rect.minZ - pad && minZ < rect.maxZ + pad;
}

/** Picks an axis-aligned two-leg route (Z then X, or X then Z) that clears every blocker. */
export function planRoute(cityId: CityId, from: readonly [number, number], to: readonly [number, number]): Leg[] {
  const blockers = city(cityId).blockers;
  const candidates: { corner: [number, number]; legs: Leg[] }[] = [
    { corner: [from[0], to[1]], legs: [{ axis: 'z', value: to[1] }, { axis: 'x', value: to[0] }] },
    { corner: [to[0], from[1]], legs: [{ axis: 'x', value: to[0] }, { axis: 'z', value: to[1] }] },
  ];
  for (const candidate of candidates) {
    const clear = blockers.every(
      (blocker) => !segmentHits(blocker, from, candidate.corner) && !segmentHits(blocker, candidate.corner, to),
    );
    if (clear) return candidate.legs;
  }
  throw new Error(`No clear two-leg route in ${cityId} from ${from.join(',')} to ${to.join(',')}`);
}

async function isCollected(page: Page, title: string): Promise<boolean> {
  if (await page.getByRole('button', { name: 'Retry', exact: true }).isVisible()) return true;
  const card = page.locator('li', { hasText: title }).first();
  if (!(await card.isVisible())) return false;
  return /line-through/.test((await card.getAttribute('class')) ?? '');
}

const AXIS_KEYS = { x: ['ArrowLeft', 'ArrowRight'], z: ['ArrowUp', 'ArrowDown'] } as const;
const ARRIVAL_TOLERANCE = 0.9;

/**
 * Walks to an objective with the arrow keys, closing the loop by reading the player dot from the
 * map overlay between key holds. Returns once the objective is collected.
 */
export async function walkToAndCollect(page: Page, objective: OracleObjective): Promise<void> {
  const cityId = objective.cityId;
  const start = await readPlayer(page, cityId);
  const legs = planRoute(cityId, start, objective.position);

  for (const leg of legs) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (await isCollected(page, objective.title)) return;
      const position = await readPlayer(page, cityId);
      const current = leg.axis === 'x' ? position[0] : position[1];
      const delta = leg.value - current;
      if (Math.abs(delta) <= ARRIVAL_TOLERANCE) break;
      const key = AXIS_KEYS[leg.axis][delta > 0 ? 1 : 0];
      const holdMs = Math.max(40, Math.min(6_000, (Math.abs(delta) / PLAYER_SPEED) * 1000 * 0.92));
      await page.keyboard.down(key);
      await page.waitForTimeout(holdMs);
      await page.keyboard.up(key);
    }
  }

  await expect.poll(() => isCollected(page, objective.title), { timeout: 5_000 }).toBe(true);
}

export interface ResultBreakdown {
  readonly medal: string;
  readonly adjustedMs: number;
  readonly activeMs: number;
  readonly hintMs: number;
  readonly travelMs: number;
  readonly practice: boolean;
}

export async function readResults(page: Page): Promise<ResultBreakdown> {
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  const medal = ((await page.getByRole('heading', { level: 2 }).first().textContent()) ?? '').trim();
  const adjustedText = (await page.getByText(/^Adjusted /).textContent()) ?? '';
  const breakdown = (await page.getByText(/^Active /).textContent()) ?? '';
  const match = /Active (\S+) · hints (\S+) · travel (\S+)/.exec(breakdown);
  if (!match) throw new Error(`Unexpected breakdown: ${breakdown}`);
  return {
    medal,
    adjustedMs: parseClock(adjustedText),
    activeMs: parseClock(match[1]!),
    hintMs: parseClock(match[2]!),
    travelMs: parseClock(match[3]!),
    practice: await page.getByText(/Practice run/).isVisible(),
  };
}

export const STORAGE_KEY = 'glint:v1';

export function bestKey(levelDef: OracleLevel, rulesVersion = 1): string {
  return `${levelDef.id}:${levelDef.version}:${levelDef.seed}:${rulesVersion}`;
}

export async function readStoredBests(page: Page): Promise<Record<string, number>> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw) as { bests?: Record<string, number> };
  return parsed.bests ?? {};
}

/**
 * Chromium headless never really hides the page, so emulate the browser's signal: flip
 * document.visibilityState and fire visibilitychange exactly as a tab switch would.
 */
export async function setTabHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((isHidden) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (isHidden ? 'hidden' : 'visible') });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => isHidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}
