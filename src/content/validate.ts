/**
 * Content validation. Owner: A6.
 *
 * Every check reads the city definition's own collision geometry (blockers, bounds, spawn) —
 * never a second guessed map. The validator is conservative: it reports anything doubtful
 * for review instead of silently accepting a socket the player might not reach.
 */
import { FINE_SEARCH_RADIUS, PICKUP_RADIUS, PLAYER_RADIUS } from '@/shared/contracts';
import type {
  CityDefinition,
  CityId,
  LevelDefinition,
  RectXZ,
  SearchRegion,
  SpawnSocket,
  TargetDefinition,
  Vec2,
} from '@/shared/contracts';

/** Preferred clear ground from a socket anchor to any blocker or the city edge. */
export const SOCKET_CLEARANCE = Math.max(3, PLAYER_RADIUS + PICKUP_RADIUS);
/** Flood-fill grid step in world units. Must not exceed the player's diameter. */
export const REACH_GRID_STEP = 1;
/** Beyond this the landmark named in the clue no longer describes where the item sits. */
export const MAX_LANDMARK_DISTANCE = FINE_SEARCH_RADIUS;
/** Clues and hints must stay readable mid-run. */
export const MAX_CLUE_LENGTH = 90;
export const MAX_HINT_LENGTH = 110;

/**
 * `error`: the target is unreachable, unfindable or a reference is broken — never ship.
 * `warning`: the target is findable but the placement or wording deserves a human look
 * (tight clearance, a patch spilling past its district, a clue that leaks a paid hint).
 */
export type IssueSeverity = 'error' | 'warning';

export interface ContentIssue {
  readonly severity: IssueSeverity;
  readonly scope: 'city' | 'target' | 'level' | 'catalog';
  readonly id: string;
  readonly message: string;
}

export function errorsOf(issues: readonly ContentIssue[]): ContentIssue[] {
  return issues.filter((issue) => issue.severity === 'error');
}

export function warningsOf(issues: readonly ContentIssue[]): ContentIssue[] {
  return issues.filter((issue) => issue.severity === 'warning');
}

export interface ReachabilityMap {
  readonly cityId: CityId;
  readonly step: number;
  isWalkable(x: number, z: number): boolean;
  isReachable(x: number, z: number): boolean;
}

type Reporter = (severity: IssueSeverity, message: string) => void;

function reporter(issues: ContentIssue[], scope: ContentIssue['scope'], id: string): Reporter {
  return (severity, message) => {
    issues.push({ severity, scope, id, message });
  };
}

function expand(rect: RectXZ, by: number): RectXZ {
  return { minX: rect.minX - by, maxX: rect.maxX + by, minZ: rect.minZ - by, maxZ: rect.maxZ + by };
}

function strictlyInside(rect: RectXZ, x: number, z: number): boolean {
  return x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ;
}

function distanceToRect(rect: RectXZ, x: number, z: number): number {
  const dx = Math.max(rect.minX - x, 0, x - rect.maxX);
  const dz = Math.max(rect.minZ - z, 0, z - rect.maxZ);
  return Math.hypot(dx, dz);
}

function distanceToEdge(bounds: RectXZ, x: number, z: number): number {
  return Math.min(x - bounds.minX, bounds.maxX - x, z - bounds.minZ, bounds.maxZ - z);
}

export function regionContains(region: SearchRegion, point: Vec2): boolean {
  return Math.hypot(region.center[0] - point[0], region.center[1] - point[1]) <= region.radius;
}

/** True when `inner` lies entirely within `outer`. */
export function regionWithin(inner: SearchRegion, outer: SearchRegion): boolean {
  const centerGap = Math.hypot(inner.center[0] - outer.center[0], inner.center[1] - outer.center[1]);
  return centerGap + inner.radius <= outer.radius + 1e-9;
}

const reachCache = new WeakMap<CityDefinition, ReachabilityMap>();

/**
 * Breadth-first flood fill from the city spawn over a grid of `REACH_GRID_STEP` cells.
 * A cell is walkable when its centre is outside every blocker expanded by the player radius
 * and inside the bounds shrunk by the same radius — the exact rule `moveCircle` enforces.
 * Orthogonal moves between two walkable centres cannot clip a solid, because every expanded
 * solid is wider than one grid step, so the fill never over-reports reachability.
 */
export function buildReachabilityMap(city: CityDefinition, radius = PLAYER_RADIUS): ReachabilityMap {
  const cached = reachCache.get(city);
  if (cached && radius === PLAYER_RADIUS) return cached;

  const step = REACH_GRID_STEP;
  const limits = expand(city.bounds, -radius);
  const solids = city.blockers.map((blocker) => expand(blocker, radius));
  const cols = Math.floor((city.bounds.maxX - city.bounds.minX) / step) + 1;
  const rows = Math.floor((city.bounds.maxZ - city.bounds.minZ) / step) + 1;

  const toCell = (x: number, z: number): [number, number] => [
    Math.round((x - city.bounds.minX) / step),
    Math.round((z - city.bounds.minZ) / step),
  ];
  const toWorld = (col: number, row: number): [number, number] => [
    city.bounds.minX + col * step,
    city.bounds.minZ + row * step,
  ];
  const inGrid = (col: number, row: number): boolean => col >= 0 && col < cols && row >= 0 && row < rows;

  const walkable = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const [x, z] = toWorld(col, row);
      const insideLimits = x >= limits.minX && x <= limits.maxX && z >= limits.minZ && z <= limits.maxZ;
      const blocked = solids.some((solid) => strictlyInside(solid, x, z));
      walkable[row * cols + col] = insideLimits && !blocked ? 1 : 0;
    }
  }

  const reached = new Uint8Array(cols * rows);
  const [spawnCol, spawnRow] = toCell(city.spawn[0], city.spawn[2]);
  if (inGrid(spawnCol, spawnRow) && walkable[spawnRow * cols + spawnCol]) {
    const queue: number[] = [spawnRow * cols + spawnCol];
    reached[queue[0]!] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head]!;
      const col = index % cols;
      const row = (index - col) / cols;
      const neighbours: readonly (readonly [number, number])[] = [
        [col + 1, row],
        [col - 1, row],
        [col, row + 1],
        [col, row - 1],
      ];
      for (const [nextCol, nextRow] of neighbours) {
        if (!inGrid(nextCol, nextRow)) continue;
        const nextIndex = nextRow * cols + nextCol;
        if (!walkable[nextIndex] || reached[nextIndex]) continue;
        reached[nextIndex] = 1;
        queue.push(nextIndex);
      }
    }
  }

  const lookup = (table: Uint8Array, x: number, z: number): boolean => {
    const [col, row] = toCell(x, z);
    return inGrid(col, row) && table[row * cols + col] === 1;
  };

  const map: ReachabilityMap = {
    cityId: city.id,
    step,
    isWalkable: (x, z) => lookup(walkable, x, z),
    isReachable: (x, z) => lookup(reached, x, z),
  };
  if (radius === PLAYER_RADIUS) reachCache.set(city, map);
  return map;
}

/**
 * Placement checks for one socket: bounds, clearance, reachability of the anchor and of the
 * whole pickup disc, plus containment in the district's broad / narrowed regions and the fine patch.
 */
export function validateSocketPlacement(city: CityDefinition, socket: SpawnSocket): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const report = reporter(issues, 'city', `${city.id}/${socket.id}`);
  const [x, y, z] = socket.position;
  const point: Vec2 = [x, z];

  if (y !== 0) report('error', `anchor y=${y}; the socket must be the ground anchor (y=0), not the hover height`);

  const edgeGap = distanceToEdge(city.bounds, x, z);
  if (edgeGap <= PLAYER_RADIUS) report('error', `anchor is outside the walkable bounds (edge gap ${edgeGap.toFixed(1)}u)`);
  else if (edgeGap < SOCKET_CLEARANCE) {
    report('warning', `only ${edgeGap.toFixed(1)}u from the city edge (prefer ${SOCKET_CLEARANCE})`);
  }

  for (const blocker of city.blockers) {
    const gap = distanceToRect(blocker, x, z);
    if (gap <= PLAYER_RADIUS) report('error', `anchor is inside blocker ${blocker.id} expanded by the player radius`);
    else if (gap < SOCKET_CLEARANCE) {
      report('warning', `only ${gap.toFixed(1)}u from blocker ${blocker.id} (prefer ${SOCKET_CLEARANCE})`);
    }
  }

  const reach = buildReachabilityMap(city);
  if (!reach.isWalkable(x, z)) report('error', 'anchor cell is not walkable with the player radius');
  else if (!reach.isReachable(x, z)) report('error', 'anchor is walkable but not reachable from the city spawn');

  const ring = 8;
  const standOff = PICKUP_RADIUS - PLAYER_RADIUS;
  for (let i = 0; i < ring; i += 1) {
    const angle = (i / ring) * Math.PI * 2;
    const px = x + Math.cos(angle) * standOff;
    const pz = z + Math.sin(angle) * standOff;
    if (!reach.isReachable(px, pz)) {
      report('error', `pickup disc is obstructed around (${px.toFixed(1)}, ${pz.toFixed(1)})`);
      break;
    }
  }

  const district = city.districts.find((candidate) => candidate.id === socket.districtId);
  if (!district) {
    report('error', `references unknown district ${socket.districtId}`);
  } else {
    if (!regionContains(district.broadSearch, point)) report('error', `outside broad region of ${district.id}`);
    if (!regionContains(district.narrowedSearch, point)) report('error', `outside narrowed region of ${district.id}`);
    if (!regionWithin(district.narrowedSearch, district.broadSearch)) {
      report('error', `narrowed region of ${district.id} spills outside its broad region`);
    }
  }

  const fine: SearchRegion = { center: socket.fineSearchCenter, radius: FINE_SEARCH_RADIUS };
  const fineOffset = Math.hypot(socket.fineSearchCenter[0] - x, socket.fineSearchCenter[1] - z);
  if (!regionContains(fine, point)) report('error', `outside its fine patch (offset ${fineOffset.toFixed(1)}u)`);
  if (fineOffset < 2) report('warning', `fine patch centre is only ${fineOffset.toFixed(1)}u from the socket, revealing it`);
  if (district && !regionWithin(fine, district.broadSearch)) {
    report('warning', `fine patch spills outside broad region of ${district.id}`);
  }

  return issues;
}

export function validateCity(city: CityDefinition): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const reach = buildReachabilityMap(city);
  if (!reach.isReachable(city.spawn[0], city.spawn[2])) {
    issues.push({ severity: 'error', scope: 'city', id: city.id, message: 'spawn is inside a blocker or outside bounds' });
  }
  const seen = new Set<string>();
  for (const socket of city.sockets) {
    if (seen.has(socket.id)) {
      issues.push({ severity: 'error', scope: 'city', id: `${city.id}/${socket.id}`, message: 'duplicate socket id' });
    }
    seen.add(socket.id);
    issues.push(...validateSocketPlacement(city, socket));
  }
  return issues;
}

function mentions(text: string, ...needles: readonly string[]): boolean {
  const haystack = text.toLowerCase();
  return needles.some((needle) => needle.length > 0 && haystack.includes(needle.toLowerCase()));
}

function hasTemplateField(text: string): boolean {
  return /[{}<>]|\$\{/.test(text);
}

const FINE_PATCH_WORDS = ['patch', 'ground', 'beside', 'outside', 'edge', 'base', 'foot', 'legs', 'wall', 'sand'];

const COMPASS = ['north-east', 'north-west', 'south-east', 'south-west', 'north', 'south', 'east', 'west'] as const;
type Compass = (typeof COMPASS)[number];

/** Eight-way bearing from `from` to `to`. North is -Z, east is +X. */
export function bearingLabel(from: Vec2, to: Vec2): Compass {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const angle = Math.atan2(-dz, dx);
  const sector = Math.round(angle / (Math.PI / 4));
  const labels: readonly Compass[] = ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'];
  return labels[((sector % 8) + 8) % 8]!;
}

function compassWords(text: string): Compass[] {
  const lower = text.toLowerCase();
  const found: Compass[] = [];
  for (const word of COMPASS) {
    if (new RegExp(`\\b${word}\\b`).test(lower) && !found.some((seen) => seen.includes(word))) found.push(word);
  }
  return found;
}

function compassAgrees(stated: Compass, actual: Compass): boolean {
  return stated === actual || actual.split('-').includes(stated);
}

/**
 * Content checks for one target: references, every candidate socket placed correctly, and hint
 * tiers that escalate truthfully (city → district / landmark name → fine patch) without leaking
 * a later tier into an earlier one or into the free clue.
 */
export function validateTarget(target: TargetDefinition, cityLookup: (id: CityId) => CityDefinition): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const report = reporter(issues, 'target', target.id);

  const city = cityLookup(target.cityId);
  const district = city.districts.find((candidate) => candidate.id === target.districtId);
  const landmark = city.landmarks.find((candidate) => candidate.id === target.landmarkId);
  if (!district) report('error', `unknown district ${target.districtId} in ${city.id}`);
  if (!landmark) report('error', `unknown landmark ${target.landmarkId} in ${city.id}`);

  if (target.socketIds.length === 0) report('error', 'no candidate sockets');
  if (new Set(target.socketIds).size !== target.socketIds.length) report('error', 'duplicate socket ids');
  for (const socketId of target.socketIds) {
    const socket = city.sockets.find((candidate) => candidate.id === socketId);
    if (!socket) {
      report('error', `unknown socket ${socketId} in ${city.id}`);
      continue;
    }
    if (socket.districtId !== target.districtId) {
      report('error', `socket ${socketId} belongs to district ${socket.districtId}, not ${target.districtId}`);
    }
    for (const issue of validateSocketPlacement(city, socket)) report(issue.severity, issue.message);
    if (landmark) {
      const gap = distanceToRect(landmark.footprint, socket.position[0], socket.position[2]);
      if (gap > MAX_LANDMARK_DISTANCE) {
        report('warning', `socket ${socketId} is ${gap.toFixed(1)}u from landmark ${landmark.id}; keep tier-3 wording honest`);
      }
    }
  }

  for (const text of [target.clueTitle, target.clueText, target.revealName, ...target.hintText]) {
    if (text.trim().length === 0) report('error', 'empty text field');
    if (hasTemplateField(text)) report('error', `unreplaced template field in "${text}"`);
  }
  if (target.clueText.length > MAX_CLUE_LENGTH) {
    report('error', `clue is ${target.clueText.length} chars (max ${MAX_CLUE_LENGTH})`);
  }
  for (const hint of target.hintText) {
    if (hint.length > MAX_HINT_LENGTH) report('error', `hint is ${hint.length} chars (max ${MAX_HINT_LENGTH})`);
  }

  const [cityHint, districtHint, nearbyHint] = target.hintText;
  const placeNames = [district?.label ?? '', landmark?.label ?? ''];
  if (mentions(target.clueText, city.label)) report('error', 'free clue names the city, making the tier-1 hint worthless');
  if (mentions(target.clueText, ...placeNames)) {
    report('warning', 'free clue names the district or landmark, making the tier-2 hint worthless');
  }
  if (!mentions(cityHint, city.label)) report('error', `tier-1 hint must name the city "${city.label}"`);
  if (mentions(cityHint, ...placeNames)) report('error', 'tier-1 hint leaks the tier-2 landmark');
  if (!mentions(districtHint, ...placeNames)) report('error', 'tier-2 hint must name the district or landmark');
  if (district) {
    const actual = bearingLabel([city.spawn[0], city.spawn[2]], district.broadSearch.center);
    for (const stated of compassWords(districtHint)) {
      if (!compassAgrees(stated, actual)) {
        report('error', `tier-2 hint says "${stated}" but ${district.id} lies ${actual} of the spawn`);
      }
    }
  }
  if (!mentions(nearbyHint, ...FINE_PATCH_WORDS)) {
    report('error', 'tier-3 hint must describe where the fine patch lies around the landmark');
  }
  if (new Set(target.hintText.map((hint) => hint.trim().toLowerCase())).size !== 3) report('error', 'hint tiers repeat each other');
  if (nearbyHint.length <= districtHint.length) report('error', 'tier-3 hint adds no information over tier 2');

  return issues;
}

export function validateLevel(level: LevelDefinition, definitions: readonly TargetDefinition[]): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const report = reporter(issues, 'level', level.id);
  if (!Number.isInteger(level.seed) || level.seed < 0 || level.seed > 0xffffffff) report('error', 'seed is not unsigned 32-bit');
  if (!Number.isInteger(level.version) || level.version < 1) report('error', 'version must be a positive integer');
  if (level.targetIds.length < 2 || level.targetIds.length > 3) {
    report('error', `trial must have two or three targets, has ${level.targetIds.length}`);
  }
  if (new Set(level.targetIds).size !== level.targetIds.length) report('error', 'repeats a target');
  const cities = new Set<CityId>();
  for (const targetId of level.targetIds) {
    const target = definitions.find((candidate) => candidate.id === targetId);
    if (!target) report('error', `unknown target ${targetId}`);
    else cities.add(target.cityId);
  }
  if (cities.size < 2) report('error', 'trial must span at least two cities');
  const { gold, silver, bronze } = level.medalSeconds;
  if (!(gold > 0 && gold < silver && silver < bronze)) report('error', 'medal thresholds must strictly increase');
  return issues;
}

export function validateContent(
  levels: readonly LevelDefinition[],
  definitions: readonly TargetDefinition[],
  cityLookup: (id: CityId) => CityDefinition,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const catalog = (id: string, message: string): void => {
    issues.push({ severity: 'error', scope: 'catalog', id, message });
  };

  const cities = new Map<CityId, CityDefinition>();
  for (const target of definitions) {
    if (!cities.has(target.cityId)) cities.set(target.cityId, cityLookup(target.cityId));
  }
  for (const city of cities.values()) issues.push(...validateCity(city));

  if (new Set(definitions.map((target) => target.id)).size !== definitions.length) catalog('targets', 'duplicate target ids');
  const clues = new Set<string>();
  for (const target of definitions) {
    issues.push(...validateTarget(target, cityLookup));
    const key = target.clueText.trim().toLowerCase();
    if (clues.has(key)) {
      issues.push({ severity: 'error', scope: 'target', id: target.id, message: 'clue duplicates another target' });
    }
    clues.add(key);
  }

  if (new Set(levels.map((level) => level.id)).size !== levels.length) catalog('levels', 'duplicate level ids');
  if (new Set(levels.map((level) => level.seed)).size !== levels.length) catalog('levels', 'two trials share a seed');
  const used = new Map<string, string>();
  for (const level of levels) {
    issues.push(...validateLevel(level, definitions));
    for (const targetId of level.targetIds) {
      const other = used.get(targetId);
      if (other) issues.push({ severity: 'error', scope: 'level', id: level.id, message: `reuses ${targetId} from ${other}` });
      used.set(targetId, level.id);
    }
  }
  if (levels.length === 3 && used.size !== 6) catalog('levels', `three trials cover ${used.size} distinct targets, need 6`);

  const cityMessages = new Set(issues.filter((issue) => issue.scope === 'city').map((issue) => issue.message));
  return issues.filter((issue) => issue.scope !== 'target' || !cityMessages.has(issue.message));
}

export function formatIssues(issues: readonly ContentIssue[]): string {
  return issues.map((issue) => `${issue.severity} [${issue.scope}] ${issue.id}: ${issue.message}`).join('\n');
}

/** Throws on any error-severity issue; warnings are returned for review. */
export function assertContentValid(
  levels: readonly LevelDefinition[],
  definitions: readonly TargetDefinition[],
  cityLookup: (id: CityId) => CityDefinition,
): ContentIssue[] {
  const issues = validateContent(levels, definitions, cityLookup);
  const errors = errorsOf(issues);
  if (errors.length > 0) throw new Error(`Content validation failed:\n${formatIssues(errors)}`);
  return warningsOf(issues);
}
