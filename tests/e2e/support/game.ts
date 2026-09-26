/**
 * Shared e2e helpers. They drive the production build only through real DOM controls and
 * keyboard input; nothing here reaches into the store or ships a test hook.
 * Selectors target the accessible names of the production GameUI.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { MAX_FRAME_DT } from '@/game/simulate';
import { PICKUP_RADIUS, PLAYER_RADIUS, PLAYER_SPEED } from '@/shared/contracts';
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
  cached ??= JSON.parse(runSupportScript('print-objectives.ts')) as Oracle;
  return cached;
}

/** Runs a `tests/e2e/support/` script under vite-node and returns its stdout. */
export function runSupportScript(name: string): string {
  const root = resolve(import.meta.dirname, '..', '..', '..');
  const bin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vite-node.cmd' : 'vite-node');
  return execFileSync(bin, [`tests/e2e/support/${name}`], { cwd: root, encoding: 'utf8' });
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

/**
 * Travel animates on wall-clock time (~1.8 s), but on a loaded box running SwiftShader the city
 * scene can take tens of seconds to present its first frames. Generous, still bounded.
 */
export const TRAVEL_TIMEOUT_MS = 60_000;

export async function flyTo(page: Page, cityId: CityId): Promise<void> {
  const label = city(cityId).label;
  await page.getByRole('button', { name: `Fly to ${label}` }).click();
  await expect(page.getByRole('button', { name: 'Globe', exact: true })).toBeVisible({ timeout: TRAVEL_TIMEOUT_MS });
}

export async function returnToGlobe(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Globe', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Fly to / }).first()).toBeVisible({ timeout: TRAVEL_TIMEOUT_MS });
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

const GRID_STEP = 2;
const CLEARANCE = PLAYER_RADIUS + 0.9;
const TURN_COST = 4;
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

interface Grid {
  readonly origin: readonly [number, number];
  readonly width: number;
  readonly height: number;
  readonly free: readonly boolean[];
}

const grids = new Map<CityId, Grid>();

/** Occupancy grid over the city: a cell is free when its centre clears every padded blocker. */
function gridFor(cityId: CityId): Grid {
  const cached = grids.get(cityId);
  if (cached) return cached;
  const { bounds, blockers } = city(cityId);
  const origin = [bounds.minX + CLEARANCE, bounds.minZ + CLEARANCE] as const;
  const width = Math.floor((bounds.maxX - CLEARANCE - origin[0]) / GRID_STEP) + 1;
  const height = Math.floor((bounds.maxZ - CLEARANCE - origin[1]) / GRID_STEP) + 1;
  const free: boolean[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const x = origin[0] + col * GRID_STEP;
      const z = origin[1] + row * GRID_STEP;
      free.push(
        blockers.every(
          (b) => x <= b.minX - CLEARANCE || x >= b.maxX + CLEARANCE || z <= b.minZ - CLEARANCE || z >= b.maxZ + CLEARANCE,
        ),
      );
    }
  }
  const grid = { origin, width, height, free };
  grids.set(cityId, grid);
  return grid;
}

function cellCentre(grid: Grid, cell: number): [number, number] {
  return [grid.origin[0] + (cell % grid.width) * GRID_STEP, grid.origin[1] + Math.floor(cell / grid.width) * GRID_STEP];
}

function nearestFreeCell(grid: Grid, point: readonly [number, number]): number {
  let best = -1;
  let bestDistance = Infinity;
  grid.free.forEach((isFree, cell) => {
    if (!isFree) return;
    const [x, z] = cellCentre(grid, cell);
    const distance = Math.hypot(x - point[0], z - point[1]);
    if (distance < bestDistance) {
      best = cell;
      bestDistance = distance;
    }
  });
  if (best < 0) throw new Error('City grid has no free cell');
  return best;
}

/**
 * Grid A* (4-connected, turn-penalised) over the city blockers, compressed into axis-aligned
 * legs. Ends with a direct approach to the target; pickup triggers within PICKUP_RADIUS even
 * when the socket sits against a blocker.
 */
export function planRoute(cityId: CityId, from: readonly [number, number], to: readonly [number, number]): Leg[] {
  const grid = gridFor(cityId);
  const startCell = nearestFreeCell(grid, from);
  const goalCell = nearestFreeCell(grid, to);
  const goal = cellCentre(grid, goalCell);
  const heuristic = (cell: number) => {
    const [x, z] = cellCentre(grid, cell);
    return (Math.abs(x - goal[0]) + Math.abs(z - goal[1])) / GRID_STEP;
  };
  // State = cell * 4 + arrival direction; the start state uses every direction at cost 0.
  const cost = new Map<number, number>();
  const parent = new Map<number, number>();
  const open: { state: number; f: number }[] = [];
  for (let dir = 0; dir < 4; dir += 1) {
    cost.set(startCell * 4 + dir, 0);
    open.push({ state: startCell * 4 + dir, f: heuristic(startCell) });
  }
  let reached = -1;
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const { state } = open.shift()!;
    const cell = Math.floor(state / 4);
    const dir = state % 4;
    if (cell === goalCell) {
      reached = state;
      break;
    }
    const col = cell % grid.width;
    const row = Math.floor(cell / grid.width);
    DIRECTIONS.forEach(([dc, dr], nextDir) => {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= grid.width || nr >= grid.height) return;
      const next = nr * grid.width + nc;
      if (!grid.free[next]) return;
      const nextState = next * 4 + nextDir;
      const g = cost.get(state)! + 1 + (cell !== startCell && nextDir !== dir ? TURN_COST : 0);
      if (g >= (cost.get(nextState) ?? Infinity)) return;
      cost.set(nextState, g);
      parent.set(nextState, state);
      open.push({ state: nextState, f: g + heuristic(next) });
    });
  }
  if (reached < 0) throw new Error(`No route in ${cityId} from ${from.join(',')} to ${to.join(',')}`);

  const cells: number[] = [];
  for (let state: number | undefined = reached; state !== undefined; state = parent.get(state)) {
    cells.unshift(Math.floor(state / 4));
  }
  const points = cells.map((cell) => cellCentre(grid, cell));
  const legs: Leg[] = [];
  const push = (leg: Leg) => {
    const last = legs.at(-1);
    if (last && last.axis === leg.axis) legs[legs.length - 1] = leg;
    else legs.push(leg);
  };
  // Snap onto the grid lane from wherever the player stands (start cell is within one step).
  const first = points[0]!;
  const second = points[1];
  const firstAxis: Leg['axis'] = second && second[0] !== first[0] ? 'z' : 'x';
  push({ axis: firstAxis, value: firstAxis === 'x' ? first[0] : first[1] });
  push({ axis: firstAxis === 'x' ? 'z' : 'x', value: firstAxis === 'x' ? first[1] : first[0] });
  for (let index = 1; index < points.length; index += 1) {
    const [px, pz] = points[index - 1]!;
    const [x, z] = points[index]!;
    if (x !== px) push({ axis: 'x', value: x });
    if (z !== pz) push({ axis: 'z', value: z });
  }
  const goalLeg: Leg['axis'] = Math.abs(to[0] - goal[0]) >= Math.abs(to[1] - goal[1]) ? 'x' : 'z';
  push({ axis: goalLeg, value: goalLeg === 'x' ? to[0] : to[1] });
  push({ axis: goalLeg === 'x' ? 'z' : 'x', value: goalLeg === 'x' ? to[1] : to[0] });
  return legs;
}

async function isCollected(page: Page, title: string): Promise<boolean> {
  if (await page.getByRole('button', { name: 'Retry', exact: true }).isVisible()) return true;
  const card = page.locator('li', { hasText: title }).first();
  if (!(await card.isVisible())) return false;
  return /line-through/.test((await card.getAttribute('class')) ?? '');
}

const AXIS_KEYS = { x: ['ArrowLeft', 'ArrowRight'], z: ['ArrowUp', 'ArrowDown'] } as const;
const ARRIVAL_TOLERANCE = 0.9;
/** Route legs are planned with 0.9 of blocker clearance; a wider miss is recovered by re-planning. */
const MAX_ARRIVAL_TOLERANCE = 2.1;
/** Upper bound on how far the player may keep moving after a key release (latency + deceleration). */
const MAX_CARRY = 6;
/** Stop walking this far inside the pickup radius so the collector's own frame sees the overlap. */
const PICKUP_MARGIN = 0.5;
/** Floor for the walking deadline; walkToAndCollect stretches it for long routes at very slow frame rates. */
const WALK_DEADLINE_MS = 300_000;
/** Deadline headroom over the route's pure walking time: map reads, re-plans and corrections. */
const WALK_DEADLINE_FACTOR = 4;
const COLLECT_POLL_MS = 20_000;
const MAX_HOLD_MS = 8_000;
const MIN_PROGRESS = 0.15;
const MAX_STALLS = 8;

/** Median requestAnimationFrame interval over a few frames, i.e. how fast the app is really ticking. */
export async function measureFrameMs(page: Page, frames = 6): Promise<number> {
  return page.evaluate(
    (count) =>
      new Promise<number>((done) => {
        const deltas: number[] = [];
        let last = -1;
        const tick = (now: number) => {
          if (last >= 0) deltas.push(now - last);
          last = now;
          if (deltas.length >= count) {
            deltas.sort((a, b) => a - b);
            done(deltas[Math.floor(deltas.length / 2)]!);
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

function expectedUnitsPerMs(frameMs: number): number {
  const frameS = Math.max(frameMs, 1) / 1000;
  return (PLAYER_SPEED * Math.min(frameS, MAX_FRAME_DT)) / frameS / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function routeLengthFrom(from: readonly [number, number], cityId: CityId, target: readonly [number, number]): number {
  let length = 0;
  const cursor: [number, number] = [from[0], from[1]];
  for (const leg of planRoute(cityId, from, target)) {
    const index = leg.axis === 'x' ? 0 : 1;
    length += Math.abs(leg.value - cursor[index]);
    cursor[index] = leg.value;
  }
  return length;
}

function along(position: readonly [number, number], axis: Leg['axis']): number {
  return axis === 'x' ? position[0] : position[1];
}

/**
 * Walks to an objective with the arrow keys and returns once it is collected. Closed loop on the
 * player's real XZ (read from the map marker). Each hold's displacement is modelled as
 * `carry + rate * holdMs`: `rate` starts from the measured frame rate and `carry` (input latency plus
 * deceleration, which grows as frames get slower) is learned from what every hold actually moved.
 * Holds that do not move re-measure and re-plan; a leg the player keeps overshooting gets a wider,
 * still bounded, tolerance. Stops only when the player is inside PICKUP_RADIUS, then requires the
 * game to have collected it.
 */
export async function walkToAndCollect(page: Page, objective: OracleObjective): Promise<void> {
  const cityId = objective.cityId;
  const target = objective.position;
  const started = Date.now();
  let frameMs = await measureFrameMs(page);
  let rate = expectedUnitsPerMs(frameMs);
  const routeLength = routeLengthFrom(await readPlayer(page, cityId), cityId, target);
  const deadline = started + Math.max(WALK_DEADLINE_MS, (WALK_DEADLINE_FACTOR * routeLength) / rate);
  let carry = 0;
  let legs: Leg[] | null = null;
  let pending: { axis: Leg['axis']; from: number; sign: number; ms: number; wanted: number } | null = null;
  let legId = '';
  let overshoots = 0;
  let stalls = 0;
  let distance = Infinity;
  let position: [number, number] = [NaN, NaN];

  while (Date.now() < deadline) {
    if (await isCollected(page, objective.title)) return;
    position = await readPlayer(page, cityId);
    distance = Math.hypot(position[0] - target[0], position[1] - target[1]);

    if (pending) {
      const moved = (along(position, pending.axis) - pending.from) * pending.sign;
      if (Math.abs(moved) < MIN_PROGRESS) {
        stalls += 1;
        if (stalls > MAX_STALLS) break;
        frameMs = await measureFrameMs(page);
        rate = Math.min(rate, expectedUnitsPerMs(frameMs));
        legs = null;
      } else {
        stalls = 0;
        if (pending.ms >= frameMs * 6) rate = clamp((rate + Math.max(moved - carry, 0) / pending.ms) / 2, 0.0005, PLAYER_SPEED / 1000);
        carry = clamp((carry + (moved - rate * pending.ms)) / 2, 0, MAX_CARRY);
        if (moved > pending.wanted + ARRIVAL_TOLERANCE) overshoots += 1;
      }
      pending = null;
    }

    if (distance <= PICKUP_RADIUS - PICKUP_MARGIN) break;

    legs ??= planRoute(cityId, position, target);
    const tolerance = Math.min(MAX_ARRIVAL_TOLERANCE, ARRIVAL_TOLERANCE + overshoots * 0.4);
    while (legs.length > 1 && Math.abs(legs[0]!.value - along(position, legs[0]!.axis)) <= tolerance) legs.shift();
    const leg = legs[0]!;
    const id = `${legs.length}:${leg.axis}:${leg.value}`;
    if (id !== legId) {
      legId = id;
      overshoots = 0;
    }
    const delta = leg.value - along(position, leg.axis);
    if (Math.abs(delta) <= tolerance) {
      legs = null;
      stalls += 1;
      if (stalls > MAX_STALLS) break;
      continue;
    }

    const holdMs = clamp((Math.abs(delta) - carry) / rate, frameMs, MAX_HOLD_MS);
    const sign = delta > 0 ? 1 : -1;
    const key = AXIS_KEYS[leg.axis][sign > 0 ? 1 : 0];
    pending = { axis: leg.axis, from: along(position, leg.axis), sign, ms: holdMs, wanted: Math.abs(delta) };
    await page.keyboard.down(key);
    await page.waitForTimeout(holdMs);
    await page.keyboard.up(key);
    // Let the explorer decelerate and the 100 ms store sync publish the final position.
    await page.waitForTimeout(Math.max(150, frameMs * 4));
  }

  await expect
    .poll(() => isCollected(page, objective.title), {
      timeout: COLLECT_POLL_MS,
      message: `${objective.title} not collected; player at ${position.map((v) => v.toFixed(1)).join(',')}, ${distance.toFixed(2)} from target (stalls ${stalls})`,
    })
    .toBe(true);
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
  const adjustedText =
    (await page.locator('span').filter({ hasText: /^Adjusted \d+:\d{2}\.\d$/ }).textContent()) ?? '';
  const breakdown = (await page.getByText(/^Active /).textContent()) ?? '';
  const match = /Active (\S+) · hints (\S+) · travel (\S+)/.exec(breakdown);
  if (!match) throw new Error(`Unexpected breakdown: ${breakdown}`);
  return {
    medal,
    adjustedMs: parseClock(adjustedText),
    activeMs: parseClock(match[1]!),
    hintMs: parseClock(match[2]!),
    travelMs: parseClock(match[3]!),
    practice: await page.getByText(/^Practice run —/).isVisible(),
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
