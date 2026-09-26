import { describe, expect, it } from 'vitest';
import { FINE_SEARCH_RADIUS } from '@/shared/contracts';
import type { CityDefinition, CityId, LevelDefinition, SpawnSocket, TargetDefinition } from '@/shared/contracts';
import { getCity, CITY_IDS } from '@/cities';
import {
  LEVELS,
  TARGETS,
  buildReachabilityMap,
  errorsOf,
  formatIssues,
  resolveObjectives,
  validateContent,
  validateSocketPlacement,
  validateTarget,
  warningsOf,
} from '@/content';

/**
 * Findable-but-imperfect placements in the current A3/A4 city data. Listed so the suite fails
 * when a new warning appears or when a city owner fixes one (remove it here then).
 */
const KNOWN_WARNINGS: readonly string[] = [
  'warning [city] giza/sphinx-a: fine patch spills outside broad region of sphinx',
  'warning [city] giza/sphinx-c: fine patch spills outside broad region of sphinx',
  'warning [city] giza/market-a: fine patch spills outside broad region of market',
  'warning [city] giza/market-c: fine patch spills outside broad region of market',
  'warning [city] rome/arena-c: fine patch spills outside broad region of arena',
  'warning [city] rome/trastevere-a: fine patch spills outside broad region of trastevere',
  'warning [city] rome/trastevere-c: fine patch spills outside broad region of trastevere',
  'warning [city] san-francisco/bridge-c: only 2.0u from blocker bridge-approach (prefer 3)',
  'warning [city] san-francisco/bridge-c: fine patch spills outside broad region of bridge',
  'warning [city] san-francisco/cable-c: fine patch spills outside broad region of cable',
  'warning [city] san-francisco/wharf-a: fine patch spills outside broad region of wharf',
  'warning [city] san-francisco/wharf-b: only 2.0u from blocker wharf-sheds (prefer 3)',
  'warning [city] berlin/gate-c: fine patch spills outside broad region of gate',
  'warning [city] berlin/tower-c: fine patch spills outside broad region of tower',
  'warning [city] berlin/gallery-a: fine patch spills outside broad region of gallery',
  'warning [city] berlin/gallery-c: fine patch spills outside broad region of gallery',
  'warning [target] giza-crown: socket pyramid-b is 14.0u from landmark great-pyramid; keep tier-3 wording honest',
];

/** Golden socket choices for the committed seeds. A change here means a content version bump. */
const GOLDEN: Readonly<Record<string, readonly string[]>> = {
  icons: ['louvre-c', 'pyramid-b'],
  'sky-sun': ['tower-a', 'sphinx-a'],
  'small-wonders': ['cafe-c', 'market-b'],
  'twin-capitals': ['arena-a', 'gate-c'],
  'bay-and-forum': ['bridge-a', 'piazza-a'],
  'wall-and-bay': ['tower-b', 'cable-b'],
};

function mockCity(overrides: Partial<CityDefinition> = {}): CityDefinition {
  return {
    id: 'paris',
    label: 'Paris',
    globeAnchor: { latDeg: 0, lonDeg: 0 },
    bounds: { minX: -40, maxX: 40, minZ: -40, maxZ: 40 },
    spawn: [0, 0, 0],
    groundColor: '#000',
    accentColor: '#fff',
    roads: [],
    blockers: [{ id: 'block', minX: 10, maxX: 20, minZ: -5, maxZ: 5 }],
    districts: [
      {
        id: 'd',
        label: 'Test district',
        broadSearch: { center: [20, 0], radius: 30 },
        narrowedSearch: { center: [20, 0], radius: 20 },
      },
    ],
    landmarks: [
      { id: 'lm', label: 'Test landmark', center: [15, 0], footprint: { minX: 10, maxX: 20, minZ: -5, maxZ: 5 }, silhouette: 'museum' },
    ],
    sockets: [{ id: 's-ok', districtId: 'd', position: [25, 0, 0], fineSearchCenter: [29, 3] }],
    ...overrides,
  };
}

function withSocket(city: CityDefinition, socket: SpawnSocket): CityDefinition {
  return { ...city, sockets: [...city.sockets, socket] };
}

const mockTarget: TargetDefinition = {
  id: 'paris-smile',
  cityId: 'paris',
  landmarkId: 'lm',
  districtId: 'd',
  clueTitle: 'Title',
  clueText: 'A clue with imagery only.',
  revealName: 'Thing',
  iconKind: 'portrait',
  hintText: ['Travel to Paris.', 'Search the Test district, east of the crossroads.', 'Look on the open ground beside the landmark walls, never inside the building.'],
  socketIds: ['s-ok'],
};

const mockLevel: LevelDefinition = {
  id: 'icons',
  title: 'Mock',
  version: 1,
  seed: 1,
  targetIds: ['paris-smile'],
  medalSeconds: { gold: 1, silver: 2, bronze: 3 },
};

function lookupFor(city: CityDefinition): (id: CityId) => CityDefinition {
  return () => city;
}

describe('shipped content', () => {
  it('has no validation errors and only the documented warnings', () => {
    const issues = validateContent(LEVELS, TARGETS, getCity);
    expect(formatIssues(errorsOf(issues))).toBe('');
    expect(formatIssues(warningsOf(issues)).split('\n').filter(Boolean).sort()).toEqual([...KNOWN_WARNINGS].sort());
  });

  it('keeps every candidate socket, not only the chosen one, reachable and inside its regions', () => {
    for (const cityId of CITY_IDS) {
      const city = getCity(cityId);
      const reach = buildReachabilityMap(city);
      expect(reach.isReachable(city.spawn[0], city.spawn[2])).toBe(true);
      for (const target of TARGETS.filter((candidate) => candidate.cityId === cityId)) {
        for (const socketId of target.socketIds) {
          const socket = city.sockets.find((candidate) => candidate.id === socketId)!;
          expect(socket, `${target.id} → ${socketId}`).toBeDefined();
          expect(formatIssues(errorsOf(validateSocketPlacement(city, socket)))).toBe('');
          expect(reach.isReachable(socket.position[0], socket.position[2])).toBe(true);
        }
      }
    }
  });

  it('resolves the committed seeds to the golden sockets, independent of definition order', () => {
    for (const level of LEVELS) {
      const objectives = resolveObjectives(level, TARGETS);
      expect(objectives.map((objective) => objective.socketId)).toEqual(GOLDEN[level.id]);
      expect(resolveObjectives(level, [...TARGETS].reverse())).toEqual(objectives);
      expect(resolveObjectives({ ...level, targetIds: [...level.targetIds].reverse() }, TARGETS).map((o) => o.socketId)).toEqual(
        [...GOLDEN[level.id]!].reverse(),
      );
      for (const objective of objectives) {
        expect(objective.fineSearch.radius).toBe(FINE_SEARCH_RADIUS);
        expect(Math.hypot(objective.position[0] - objective.fineSearch.center[0], objective.position[2] - objective.fineSearch.center[1]))
          .toBeLessThanOrEqual(FINE_SEARCH_RADIUS);
      }
    }
  });

  it('spans two cities in each trial and uses every shipped target exactly once', () => {
    expect(LEVELS).toHaveLength(6);
    const seen = new Set<string>();
    for (const level of LEVELS) {
      const cities = new Set(resolveObjectives(level, TARGETS).map((objective) => objective.cityId));
      expect(cities.size, level.id).toBe(2);
      for (const id of level.targetIds) seen.add(id);
    }
    expect(seen.size).toBe(TARGETS.length);
    expect(new Set(LEVELS.map((level) => level.seed)).size).toBe(LEVELS.length);
  });

  it('escalates hints: city, then district or landmark name, then a longer fine-patch description', () => {
    for (const target of TARGETS) {
      const city = getCity(target.cityId);
      const district = city.districts.find((candidate) => candidate.id === target.districtId)!;
      const landmark = city.landmarks.find((candidate) => candidate.id === target.landmarkId)!;
      const [tier1, tier2, tier3] = target.hintText;
      expect(tier1).toContain(city.label);
      expect(tier1.toLowerCase()).not.toContain(landmark.label.toLowerCase());
      expect(`${tier2}`.toLowerCase()).toMatch(new RegExp(`${district.label.toLowerCase()}|${landmark.label.toLowerCase()}`));
      expect(tier3.length).toBeGreaterThan(tier2.length);
      expect(target.clueText.toLowerCase()).not.toContain(city.label.toLowerCase());
      expect(target.clueText.toLowerCase()).not.toContain(landmark.label.toLowerCase());
    }
  });
});

describe('validator catches unfair or unreachable placements', () => {
  it('accepts the mock baseline', () => {
    expect(formatIssues(errorsOf(validateTarget(mockTarget, lookupFor(mockCity()))))).toBe('');
  });

  it('flags a socket sealed off from the spawn by blockers', () => {
    const city = withSocket(
      mockCity({
        blockers: [
          { id: 'n', minX: 20, maxX: 34, minZ: -8, maxZ: -6 },
          { id: 's', minX: 20, maxX: 34, minZ: 6, maxZ: 8 },
          { id: 'w', minX: 20, maxX: 22, minZ: -8, maxZ: 8 },
          { id: 'e', minX: 32, maxX: 34, minZ: -8, maxZ: 8 },
        ],
      }),
      { id: 's-boxed', districtId: 'd', position: [27, 0, 0], fineSearchCenter: [30, 3] },
    );
    const messages = formatIssues(errorsOf(validateSocketPlacement(city, city.sockets[1]!)));
    expect(messages).toContain('not reachable from the city spawn');
  });

  it('flags a socket inside a blocker and one with an obstructed pickup disc', () => {
    const inside = mockCity({ sockets: [{ id: 's', districtId: 'd', position: [15, 0, 0], fineSearchCenter: [18, 3] }] });
    expect(formatIssues(errorsOf(validateSocketPlacement(inside, inside.sockets[0]!)))).toContain('inside blocker block');

    const tight = mockCity({ sockets: [{ id: 's', districtId: 'd', position: [21, 0, 0], fineSearchCenter: [25, 3] }] });
    const issues = validateSocketPlacement(tight, tight.sockets[0]!);
    expect(formatIssues(issues)).toContain('only 1.0u from blocker block');
    expect(formatIssues(errorsOf(issues))).toContain('pickup disc is obstructed');
  });

  it('flags a socket outside the advertised search regions', () => {
    const far = mockCity({ sockets: [{ id: 's', districtId: 'd', position: [-30, 0, 0], fineSearchCenter: [-26, 3] }] });
    const messages = formatIssues(errorsOf(validateSocketPlacement(far, far.sockets[0]!)));
    expect(messages).toContain('outside broad region of d');
    expect(messages).toContain('outside narrowed region of d');

    const badPatch = mockCity({ sockets: [{ id: 's', districtId: 'd', position: [25, 0, 0], fineSearchCenter: [25, 20] }] });
    expect(formatIssues(errorsOf(validateSocketPlacement(badPatch, badPatch.sockets[0]!)))).toContain('outside its fine patch');
  });

  it('makes resolveObjectives fail loudly instead of shipping an unreachable target', () => {
    const sealed = mockCity({
      blockers: [{ id: 'ring', minX: 22, maxX: 28, minZ: -3, maxZ: 3 }],
      sockets: [{ id: 's-ok', districtId: 'd', position: [25, 0, 0], fineSearchCenter: [29, 3] }],
    });
    expect(() => resolveObjectives(mockLevel, [mockTarget], lookupFor(sealed))).toThrow(/inside blocker ring/);
    expect(() => resolveObjectives(mockLevel, [mockTarget], lookupFor(mockCity()))).not.toThrow();
  });

  it('flags hint tiers that leak, lie about direction or fail to escalate', () => {
    const lookup = lookupFor(mockCity());
    const leakCity = { ...mockTarget, clueText: 'Go to Paris and look.' };
    expect(formatIssues(validateTarget(leakCity, lookup))).toContain('free clue names the city');

    const wrongDirection = { ...mockTarget, hintText: [mockTarget.hintText[0], 'Search the Test district, west of the crossroads.', mockTarget.hintText[2]] as const };
    expect(formatIssues(validateTarget(wrongDirection, lookup))).toContain('says "west" but d lies east');

    const noName = { ...mockTarget, hintText: [mockTarget.hintText[0], 'Search somewhere.', mockTarget.hintText[2]] as const };
    expect(formatIssues(validateTarget(noName, lookup))).toContain('tier-2 hint must name the district or landmark');

    const flat = { ...mockTarget, hintText: [mockTarget.hintText[0], mockTarget.hintText[1], 'Ground.'] as const };
    expect(formatIssues(validateTarget(flat, lookup))).toContain('adds no information over tier 2');

    const template = { ...mockTarget, clueText: 'Find the {item}.' };
    expect(formatIssues(validateTarget(template, lookup))).toContain('unreplaced template field');
  });

  it('rejects trials that stay in one city or reuse targets', () => {
    const oneCity: LevelDefinition = { ...mockLevel, targetIds: ['paris-smile', 'paris-iron'] };
    const issues = formatIssues(validateContent([oneCity], TARGETS, getCity));
    expect(issues).toContain('trial must span at least two cities');

    const reused = formatIssues(validateContent([LEVELS[0]!, { ...LEVELS[1]!, targetIds: ['paris-smile', 'giza-guardian'] }], TARGETS, getCity));
    expect(reused).toContain('reuses paris-smile from icons');
  });
});
