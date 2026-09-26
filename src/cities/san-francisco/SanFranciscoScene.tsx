/**
 * San Francisco scenery. Owner: A9. Scenery only — no rules, pickups, players, timers or camera.
 *
 * Everything solid is derived from `definition.blockers`; nothing walkable is ever covered by a
 * solid-looking mesh. Hills, the bay and the far half of the Golden Gate live OUTSIDE the city
 * bounds (z < -72 / x > 72 / x < -72 / z > 72), so they are background only and the playable
 * ground stays flat. Cosmetic variation uses an independent seeded RNG.
 *
 * Render budget: one InstancedMesh per shared geometry (plane, box, cylinder, sphere, ring) with
 * a single vertex-coloured Lambert material, plus one tiny per-frame water shimmer that mutates a
 * group position directly (no React state).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import type { CitySceneProps } from '@/cities/CityScenery';
import type { Blocker, CityDefinition, Quality, RectXZ, Vec3 } from '@/shared/contracts';
import { createRng, hashSeed } from '@/shared/seed';
import type { Rng } from '@/shared/seed';

// ---------------------------------------------------------------------------
// Shared geometry and materials (module singletons)
// ---------------------------------------------------------------------------

const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 6);
const UNIT_SPHERE = new SphereGeometry(1, 7, 5);
const UNIT_PLANE = new PlaneGeometry(1, 1);
const SOCKET_RING = new RingGeometry(1.7, 2.3, 20);
const WHITE = new MeshLambertMaterial({ color: '#ffffff' });
const HAZE_MATERIAL = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.42, depthWrite: false });

// Arcade palette
const INK = '#211333';
const LAVENDER = '#B6A1E8';
const CREAM = '#FFF5E9';
const CYAN = '#22C4EA';
const HOT_PINK = '#F43FAB';
const YELLOW = '#FFD963';

const GROUND_TONE = '#e9e0d8';
const ROAD_TONE = '#8d86a3';
const ROAD_LINE_TONE = '#f7e7a8';
const SIDEWALK_TONE = '#f6efe4';
const CURB_RED = '#e8484f';
const CURB_WHITE = CREAM;
const WATER_TONE = '#35b9dd';
const WATER_DEEP_TONE = '#2593b8';
const FOAM_TONE = '#c8f2fb';
const HAZE_TONE = '#dcd3f0';
const HAZE_BANDS = ['#cbbfe8', '#c9cdef', '#c3dcf3', '#bfe4f5'] as const;
const STRAIT_MIN_Z = -62;
const STRAIT_MAX_Z = -28;
const HILL_TONES = ['#c7b4ea', '#b6a1e8', '#a48fdc'] as const;
const HILL_HOUSE_TONES = ['#f8d7e4', '#fff5e9', '#d7e9fb', '#ffe9b0'] as const;
const SHADOW_TONE = '#b9a8d6';

const ORANGE = '#f0512a';
const ORANGE_DARK = '#c33d1c';
const CABLE_TONE = '#3a2648';
const CONCRETE_TONE = '#d8d0cc';
const DECK_TONE = '#6d6382';

const PASTELS = ['#f8c8dc', '#b6a1e8', '#a8e4f0', '#ffe7a8', '#c9f0c2', '#fff5e9', '#ffc9a3', '#f7a8c9', '#9fd6c8', '#e5c8ff', '#fdd9a0', '#bfe0ff'] as const;
const TRIMS = ['#ffffff', '#fff5e9', '#7146c5', '#211333', HOT_PINK, CYAN, YELLOW] as const;
const ROOF_TONES = ['#4c3a6b', '#5a4680', '#3d2f57', '#7146c5', '#8b3a5c', '#2f6f7a'] as const;
const WINDOW_TONE = '#2a2340';
const GLASS_TONE = '#7fd5ee';
const STEP_TONE = '#d9d0cf';

const BRICK_TONE = '#b8503f';
const BRICK_DARK = '#8f3a2f';
const BARN_ROOF_TONE = '#5a4680';
const CAR_BODY_TONE = '#8e2b1e';
const CAR_ROOF_TONE = CREAM;
const RAIL_TONE = '#4d4560';
const POLE_TONE = '#3a3350';
const WIRE_TONE = '#2d2540';

const SHED_TONE = '#e8e0d0';
const SHED_ROOF_TONE = '#d9484a';
const PLANK_TONE = '#c9a26f';
const PLANK_DARK = '#a98452';
const POST_TONE = '#6b4a2e';
const BUOY_TONE = HOT_PINK;
const BOAT_TONE = CREAM;
const BOAT_TRIM_TONE = CYAN;

const LEAF_TONES = ['#4f9a6b', '#3f8a5c', '#62a874'] as const;
const TRUNK_TONE = '#6a4a33';
const LAMP_POST_TONE = INK;
const LAMP_GLOW_TONE = YELLOW;
const SOCKET_PAD_TONE = CREAM;
const SOCKET_DISC_TONE = LAVENDER;

const FLAT = -Math.PI / 2;
const SOCKET_CLEAR_RADIUS = 5;

// ---------------------------------------------------------------------------
// Instancing helper
// ---------------------------------------------------------------------------

interface InstanceItem {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
  readonly ry?: number;
  readonly rx?: number;
  readonly rz?: number;
  readonly quaternion?: Quaternion;
  readonly color: string;
}

const scratchObject = new Object3D();
const scratchColor = new Color();

function Instances({
  geometry,
  items,
  material = WHITE,
}: {
  readonly geometry: BufferGeometry;
  readonly items: readonly InstanceItem[];
  readonly material?: MeshLambertMaterial | MeshBasicMaterial;
}) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, index) => {
      scratchObject.position.set(item.x, item.y, item.z);
      if (item.quaternion) scratchObject.quaternion.copy(item.quaternion);
      else scratchObject.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0);
      scratchObject.scale.set(item.sx, item.sy, item.sz);
      scratchObject.updateMatrix();
      mesh.setMatrixAt(index, scratchObject.matrix);
      mesh.setColorAt(index, scratchColor.set(item.color));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);

  if (items.length === 0) return null;
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} frustumCulled={false} />;
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function width(rect: RectXZ): number {
  return rect.maxX - rect.minX;
}
function depth(rect: RectXZ): number {
  return rect.maxZ - rect.minZ;
}
function centerX(rect: RectXZ): number {
  return (rect.minX + rect.maxX) / 2;
}
function centerZ(rect: RectXZ): number {
  return (rect.minZ + rect.maxZ) / 2;
}
function grow(rect: RectXZ, by: number): RectXZ {
  return { minX: rect.minX - by, maxX: rect.maxX + by, minZ: rect.minZ - by, maxZ: rect.maxZ + by };
}
function shift(rect: RectXZ, dx: number, dz: number): RectXZ {
  return { minX: rect.minX + dx, maxX: rect.maxX + dx, minZ: rect.minZ + dz, maxZ: rect.maxZ + dz };
}
function contains(rect: RectXZ, x: number, z: number): boolean {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}
function boxItem(rect: RectXZ, y0: number, height: number, color: string): InstanceItem {
  return { x: centerX(rect), y: y0 + height / 2, z: centerZ(rect), sx: width(rect), sy: height, sz: depth(rect), color };
}
function flatItem(rect: RectXZ, y: number, color: string): InstanceItem {
  return { x: centerX(rect), y, z: centerZ(rect), sx: width(rect), sy: depth(rect), sz: 1, rx: FLAT, color };
}
/** Hard offset drop shadow under a footprint: the cartoon "5-7px bottom shadow" translated to 3D. */
function shadowItem(rect: RectXZ): InstanceItem {
  return flatItem(shift(grow(rect, 0.2), 0.9, 0.9), 0.014, SHADOW_TONE);
}

function top(item: InstanceItem): number {
  return item.rx === undefined && item.quaternion === undefined ? item.y + item.sy / 2 : item.y;
}
function byTopDescending(a: InstanceItem, b: InstanceItem): number {
  return top(b) - top(a);
}

const UP = new Vector3(0, 1, 0);
const scratchA = new Vector3();
const scratchB = new Vector3();

function strutItem(from: Vec3, to: Vec3, thickness: number, color: string): InstanceItem {
  const a = scratchA.set(...from);
  const b = scratchB.set(...to);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return {
    x: mid.x,
    y: mid.y,
    z: mid.z,
    sx: thickness,
    sy: length,
    sz: thickness,
    quaternion: new Quaternion().setFromUnitVectors(UP, direction.normalize()),
    color,
  };
}

interface Batches {
  readonly boxes: InstanceItem[];
  readonly cylinders: InstanceItem[];
  readonly spheres: InstanceItem[];
  readonly flats: InstanceItem[];
  readonly rings: InstanceItem[];
  readonly haze: InstanceItem[];
}

function isClearForProps(definition: CityDefinition, x: number, z: number, keepOffRoads: boolean): boolean {
  if (!contains(grow(definition.bounds, -2), x, z)) return false;
  for (const blocker of definition.blockers) if (contains(grow(blocker, 2.5), x, z)) return false;
  for (const landmark of definition.landmarks) if (contains(grow(landmark.footprint, 4), x, z)) return false;
  if (keepOffRoads) for (const road of definition.roads) if (contains(grow(road, 1.5), x, z)) return false;
  for (const socket of definition.sockets) {
    if (Math.hypot(socket.position[0] - x, socket.position[2] - z) < SOCKET_CLEAR_RADIUS) return false;
  }
  if (Math.hypot(definition.spawn[0] - x, definition.spawn[2] - z) < SOCKET_CLEAR_RADIUS) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Ground, roads, painted curbs, trolley wires
// ---------------------------------------------------------------------------

function buildStreets(definition: CityDefinition, quality: Quality, batches: Batches): void {
  const { bounds, roads } = definition;
  batches.flats.push(flatItem(bounds, 0, GROUND_TONE));

  for (const road of roads) {
    const horizontal = width(road) >= depth(road);
    if (quality !== 'low') {
      // Kerb strips: cream pavement with painted red / white kerb segments (SF's famous curb paint).
      const strips: RectXZ[] = horizontal
        ? [
            { minX: road.minX, maxX: road.maxX, minZ: road.minZ - 1.4, maxZ: road.minZ },
            { minX: road.minX, maxX: road.maxX, minZ: road.maxZ, maxZ: road.maxZ + 1.4 },
          ]
        : [
            { minX: road.minX - 1.4, maxX: road.minX, minZ: road.minZ, maxZ: road.maxZ },
            { minX: road.maxX, maxX: road.maxX + 1.4, minZ: road.minZ, maxZ: road.maxZ },
          ];
      for (const strip of strips) batches.flats.push(flatItem(strip, 0.016, SIDEWALK_TONE));
      const length = horizontal ? width(road) : depth(road);
      for (let along = 0; along < length; along += 6) {
        const paint = Math.floor(along / 6) % 5 === 0 ? CURB_RED : CURB_WHITE;
        for (const side of [-1, 1] as const) {
          const item: InstanceItem = horizontal
            ? { x: road.minX + along + 3, y: 0.15, z: centerZ(road) + side * (depth(road) / 2 + 0.15), sx: 5.6, sy: 0.3, sz: 0.3, color: paint }
            : { x: centerX(road) + side * (width(road) / 2 + 0.15), y: 0.15, z: road.minZ + along + 3, sx: 0.3, sy: 0.3, sz: 5.6, color: paint };
          batches.boxes.push(item);
        }
      }
    }
    batches.flats.push(flatItem(road, 0.02, ROAD_TONE));
    // Dashed centre line.
    const length = horizontal ? width(road) : depth(road);
    const dash = quality === 'low' ? 10 : 5;
    for (let along = 1; along < length - 2; along += dash * 2) {
      batches.flats.push(
        horizontal
          ? { x: road.minX + along + dash / 2, y: 0.03, z: centerZ(road), sx: dash, sy: 0.35, sz: 1, rx: FLAT, color: ROAD_LINE_TONE }
          : { x: centerX(road), y: 0.03, z: road.minZ + along + dash / 2, sx: 0.35, sy: dash, sz: 1, rx: FLAT, color: ROAD_LINE_TONE },
      );
    }
  }

  // Zebra crossings where roads meet.
  if (quality !== 'low') {
    for (const a of roads) {
      if (width(a) < depth(a)) continue;
      for (const b of roads) {
        if (width(b) >= depth(b)) continue;
        for (const edgeZ of [a.minZ, a.maxZ]) {
          for (let x = b.minX + 0.6; x < b.maxX - 0.4; x += 1.2) {
            batches.flats.push({ x: x + 0.3, y: 0.032, z: edgeZ + (edgeZ === a.minZ ? 1.2 : -1.2), sx: 0.6, sy: 1.8, sz: 1, rx: FLAT, color: CREAM });
          }
        }
        for (const edgeX of [b.minX, b.maxX]) {
          for (let z = a.minZ + 0.6; z < a.maxZ - 0.4; z += 1.2) {
            batches.flats.push({ x: edgeX + (edgeX === b.minX ? 1.2 : -1.2), y: 0.032, z: z + 0.3, sx: 1.8, sy: 0.6, sz: 1, rx: FLAT, color: CREAM });
          }
        }
      }
    }
  }

  // Cable-car tracks + overhead trolley wires along the main N-S street (the one through spawn).
  const mainStreet = roads.find((road) => depth(road) > width(road) && road.minX <= 0 && road.maxX >= 0);
  if (!mainStreet) return;
  for (const offset of [-1.6, 1.6]) {
    batches.flats.push({ x: centerX(mainStreet) + offset, y: 0.035, z: centerZ(mainStreet), sx: 0.3, sy: depth(mainStreet), sz: 1, rx: FLAT, color: RAIL_TONE });
  }
  batches.flats.push({ x: centerX(mainStreet), y: 0.035, z: centerZ(mainStreet), sx: 0.18, sy: depth(mainStreet), sz: 1, rx: FLAT, color: INK });
  if (quality === 'low') return;
  const wireY = 6.2;
  const poleX = width(mainStreet) / 2 + 0.7;
  for (let z = mainStreet.minZ + 4; z < mainStreet.maxZ; z += 10) {
    const clear = [-1, 1].every((side) => {
      const x = centerX(mainStreet) + side * poleX;
      if (definition.blockers.some((b) => contains(grow(b, 1), x, z))) return false;
      return !roads.some((road) => road !== mainStreet && contains(grow(road, 1.5), x, z));
    });
    if (!clear) continue;
    for (const side of [-1, 1] as const) {
      const x = centerX(mainStreet) + side * poleX;
      batches.cylinders.push({ x, y: wireY / 2, z, sx: 0.35, sy: wireY, sz: 0.35, color: POLE_TONE });
      batches.boxes.push({ x, y: wireY + 0.3, z, sx: 0.6, sy: 0.6, sz: 0.6, color: CREAM });
      batches.boxes.push({ x, y: 1.6, z, sx: 0.45, sy: 0.5, sz: 0.45, color: side < 0 ? HOT_PINK : CYAN });
    }
    // Span wire between the pair, with short hangers dropping to the two running wires.
    batches.boxes.push({ x: centerX(mainStreet), y: wireY + 0.4, z, sx: poleX * 2, sy: 0.07, sz: 0.07, color: WIRE_TONE });
    for (const side of [-1, 1] as const) {
      batches.boxes.push({ x: centerX(mainStreet) + side * 1.6, y: wireY + 0.2, z, sx: 0.06, sy: 0.4, sz: 0.06, color: WIRE_TONE });
    }
  }
  for (const side of [-1, 1] as const) {
    batches.boxes.push({ x: centerX(mainStreet) + side * 1.6, y: wireY, z: centerZ(mainStreet), sx: 0.08, sy: 0.08, sz: depth(mainStreet), color: WIRE_TONE });
  }
}

// ---------------------------------------------------------------------------
// Bay water, background hills, haze
// ---------------------------------------------------------------------------

const FAR = 260;

function buildBackground(definition: CityDefinition, rng: Rng, quality: Quality, batches: Batches): void {
  const { bounds } = definition;
  // Water: the whole bay north and east of the playable block.
  batches.flats.push(flatItem({ minX: -FAR, maxX: FAR, minZ: -FAR, maxZ: bounds.minZ }, -0.3, WATER_TONE));
  batches.flats.push(flatItem({ minX: bounds.maxX, maxX: FAR, minZ: bounds.minZ, maxZ: FAR }, -0.3, WATER_TONE));
  batches.flats.push(flatItem({ minX: -FAR, maxX: FAR, minZ: -FAR, maxZ: -150 }, -0.25, WATER_DEEP_TONE));
  // Sea wall along the north and east shore so the ground reads as a solid quay edge.
  batches.boxes.push({ x: 0, y: -0.2, z: bounds.minZ - 0.6, sx: width(bounds) + 1.2, sy: 1.0, sz: 1.2, color: CONCRETE_TONE });
  batches.boxes.push({ x: bounds.maxX + 0.6, y: -0.2, z: 0, sx: 1.2, sy: 1.0, sz: depth(bounds) + 1.2, color: CONCRETE_TONE });

  // Distant Marin headlands across the water (north-west) and the Berkeley hills (east).
  const hills: { x: number; z: number; w: number; d: number; h: number }[] = [
    { x: -120, z: -175, w: 120, d: 60, h: 14 },
    { x: -60, z: -200, w: 90, d: 50, h: 22 },
    { x: 30, z: -205, w: 110, d: 60, h: 10 },
    { x: 200, z: -60, w: 80, d: 140, h: 12 },
    { x: 205, z: 80, w: 70, d: 120, h: 18 },
  ];
  hills.forEach((hill, index) => {
    const tiers = quality === 'low' ? 2 : 3;
    for (let tier = 0; tier < tiers; tier += 1) {
      const scale = 1 - tier * 0.28;
      batches.boxes.push({
        x: hill.x,
        y: (hill.h * (tier + 1)) / tiers / 2 - 0.3,
        z: hill.z,
        sx: hill.w * scale,
        sy: (hill.h * (tier + 1)) / tiers,
        sz: hill.d * scale,
        color: HILL_TONES[(index + tier) % HILL_TONES.length]!,
      });
    }
  });

  // Stepped residential hills west and south of the playable blocks (background only, outside bounds).
  // The strait (STRAIT_MIN_Z..STRAIT_MAX_Z) stays open water so the Golden Gate can cross it westward.
  const tiers = [
    { rect: { minX: -FAR, maxX: bounds.minX - 0.5, minZ: STRAIT_MAX_Z, maxZ: FAR }, h: 3 },
    { rect: { minX: -FAR, maxX: bounds.minX - 14, minZ: STRAIT_MAX_Z + 8, maxZ: FAR }, h: 7 },
    { rect: { minX: -FAR, maxX: bounds.minX - 30, minZ: STRAIT_MAX_Z + 18, maxZ: FAR }, h: 12 },
    { rect: { minX: -FAR, maxX: bounds.minX - 0.5, minZ: -FAR, maxZ: STRAIT_MIN_Z }, h: 4 },
    { rect: { minX: -FAR, maxX: bounds.minX - 24, minZ: -FAR, maxZ: STRAIT_MIN_Z - 6 }, h: 9 },
    { rect: { minX: -FAR, maxX: bounds.minX - 50, minZ: -FAR, maxZ: STRAIT_MIN_Z - 14 }, h: 15 },
    { rect: { minX: bounds.minX - 0.5, maxX: bounds.maxX + 0.5, minZ: bounds.maxZ + 0.5, maxZ: FAR }, h: 3 },
    { rect: { minX: bounds.minX - 0.5, maxX: bounds.maxX + 0.5, minZ: bounds.maxZ + 14, maxZ: FAR }, h: 7 },
    { rect: { minX: bounds.minX - 0.5, maxX: bounds.maxX + 0.5, minZ: bounds.maxZ + 32, maxZ: FAR }, h: 12 },
  ];
  tiers.forEach((tier, index) => batches.boxes.push(boxItem(tier.rect, -0.3, tier.h, HILL_TONES[index % 3]!)));
  batches.flats.push(flatItem({ minX: -FAR, maxX: bounds.minX, minZ: STRAIT_MIN_Z, maxZ: STRAIT_MAX_Z }, -0.3, WATER_TONE));

  // Tiny pastel houses climbing the hills, plus stepped streets between them.
  const houseCount = quality === 'low' ? 30 : 90;
  for (let index = 0; index < houseCount; index += 1) {
    const west = rng.next() < 0.55;
    const x = west ? bounds.minX - 3 - rng.next() * 40 : bounds.minX + rng.next() * width(bounds);
    const z = west ? STRAIT_MAX_Z + 4 + rng.next() * 110 : bounds.maxZ + 3 + rng.next() * 42;
    const tierHeight = west
      ? x < bounds.minX - 30 ? 12 : x < bounds.minX - 14 ? 7 : 3
      : z > bounds.maxZ + 32 ? 12 : z > bounds.maxZ + 14 ? 7 : 3;
    const h = 3 + rng.next() * 3;
    const w = 3 + rng.next() * 2;
    batches.boxes.push({ x, y: tierHeight - 0.3 + h / 2, z, sx: w, sy: h, sz: w, color: rng.pick(HILL_HOUSE_TONES) });
    batches.boxes.push({ x, y: tierHeight - 0.3 + h + 0.35, z, sx: w * 0.8, sy: 0.7, sz: w * 0.8, color: rng.pick(ROOF_TONES) });
  }
  for (let z = STRAIT_MAX_Z + 14; z < 120; z += 24) {
    batches.boxes.push({ x: bounds.minX - 22, y: 4, z, sx: 44, sy: 8.5, sz: 3, color: DECK_TONE });
  }

  // Layered local haze (translucent, depthWrite off): far bands at the map edges, plus fog banks
  // rolling through the strait under and around the bridge so the towers punch out of it. No fog
  // setting is touched; this is just a handful of instanced translucent slabs.
  const straitZ = (STRAIT_MIN_Z + STRAIT_MAX_Z) / 2;
  HAZE_BANDS.forEach((tone, index) => {
    const y = 4 + index * 5;
    batches.haze.push({ x: 0, y, z: -FAR + 30 + index * 10, sx: FAR * 2.2, sy: 10, sz: 1, color: tone });
    batches.haze.push({ x: FAR - 30 - index * 10, y, z: 0, sx: 1, sy: 10, sz: FAR * 2.2, color: tone });
    batches.haze.push({ x: -FAR + 40 + index * 12, y, z: straitZ, sx: 1, sy: 10, sz: 90, color: tone });
  });
  const bankCount = quality === 'low' ? 4 : 9;
  for (let index = 0; index < bankCount; index += 1) {
    const t = index / bankCount;
    const x = bounds.minX - 8 - t * 120;
    const drift = ((index * 37) % 23) - 11;
    batches.haze.push({ x, y: 1.6 + (index % 3) * 1.1, z: straitZ + drift, sx: 26 + (index % 4) * 6, sy: 2.6 + (index % 2) * 1.4, sz: 12 + (index % 3) * 4, color: index % 2 ? HAZE_TONE : CREAM });
  }
  if (quality !== 'low') {
    for (const x of [-96, -112, -126]) {
      batches.haze.push({ x, y: 12, z: straitZ, sx: 14, sy: 9, sz: 40, color: HAZE_BANDS[2] });
    }
  }
}

// ---------------------------------------------------------------------------
// Golden Gate Bridge (hero). The chase camera pitches ~55 degrees down with a 48 degree FOV, so a
// tall tower directly ahead leaves the frame: anything at height h is only visible while it is
// closer than ~(52 - h) * 1.66 units ahead of the player. The bridge therefore runs EAST-WEST along
// the approach blocker and out over the strait west of the bounds, with squat 22-unit towers, so
// from anywhere in the bridge district at least one tower and the cables stay on screen.
// ---------------------------------------------------------------------------

const TOWER_HEIGHT = 22;
const DECK_Y = 6;
const DECK_HALF_DEPTH = 4.5;
const WEST_TOWER_X = -78;
const DECK_END_X = -132;

function buildGoldenGate(approach: Blocker, quality: Quality, batches: Batches): void {
  const cz = centerZ(approach);
  const eastTowerX = approach.minX + 12;

  // Approach plaza: concrete plinth on the blocker, toll kiosks, cypresses; the deck ramps up onto it.
  batches.flats.push(shadowItem(approach));
  batches.boxes.push(boxItem(approach, 0, 1.2, CONCRETE_TONE));
  batches.boxes.push(boxItem(grow(approach, -0.6), 1.2, 0.3, LAVENDER));
  const ramp: RectXZ = { minX: approach.minX, maxX: approach.maxX - 1, minZ: cz - DECK_HALF_DEPTH - 1, maxZ: cz + DECK_HALF_DEPTH + 1 };
  batches.boxes.push(boxItem(ramp, 1.2, DECK_Y - 1.4, DECK_TONE));
  batches.boxes.push(boxItem(grow(ramp, 0.3), DECK_Y - 0.5, 0.5, ORANGE));
  for (const side of [-1, 1] as const) {
    const z = cz + side * (DECK_HALF_DEPTH + 4.5);
    batches.boxes.push({ x: approach.maxX - 6, y: 2.9, z, sx: 3, sy: 3.4, sz: 3, color: CREAM });
    batches.boxes.push({ x: approach.maxX - 6, y: 4.9, z, sx: 4, sy: 0.6, sz: 4, color: ORANGE });
    for (const x of [approach.minX + 4, approach.maxX - 14, approach.maxX - 2.5]) {
      batches.cylinders.push({ x, y: 2.2, z: z + side * 3, sx: 0.6, sy: 2, sz: 0.6, color: TRUNK_TONE });
      batches.spheres.push({ x, y: 4.6, z: z + side * 3, sx: 1.4, sy: 2.6, sz: 1.4, color: LEAF_TONES[1] });
    }
  }

  // Deck over the strait, from the plaza edge west to the far anchorage.
  const deckLength = approach.minX - DECK_END_X;
  const deckX = (approach.minX + DECK_END_X) / 2;
  batches.boxes.push({ x: deckX, y: DECK_Y - 0.6, z: cz, sx: deckLength, sy: 1.2, sz: DECK_HALF_DEPTH * 2 + 1, color: DECK_TONE });
  batches.boxes.push({ x: deckX, y: DECK_Y - 1.7, z: cz, sx: deckLength, sy: 1.2, sz: DECK_HALF_DEPTH * 2 - 1, color: ORANGE_DARK });
  for (const side of [-1, 1] as const) {
    batches.boxes.push({ x: deckX, y: DECK_Y + 0.5, z: cz + side * (DECK_HALF_DEPTH + 0.3), sx: deckLength, sy: 1.0, sz: 0.4, color: ORANGE });
  }
  if (quality !== 'low') {
    for (let x = approach.minX - 4; x > DECK_END_X; x -= 8) {
      batches.flats.push({ x, y: DECK_Y + 0.02, z: cz, sx: 4, sy: 0.4, sz: 1, rx: FLAT, color: ROAD_LINE_TONE });
    }
  }
  // Far anchorage block on the Marin side.
  batches.boxes.push({ x: DECK_END_X - 4, y: DECK_Y / 2 - 0.3, z: cz, sx: 10, sy: DECK_Y + 0.3, sz: DECK_HALF_DEPTH * 2 + 6, color: CONCRETE_TONE });

  // Towers: two legs (one each side of the deck) joined by portal braces.
  for (const towerX of [eastTowerX, WEST_TOWER_X]) {
    const onPlaza = towerX === eastTowerX;
    const baseY = onPlaza ? 1.2 : -0.3;
    if (!onPlaza) batches.boxes.push({ x: towerX, y: 1.5, z: cz, sx: 12, sy: 4, sz: DECK_HALF_DEPTH * 2 + 8, color: CONCRETE_TONE });
    for (const side of [-1, 1] as const) {
      const z = cz + side * (DECK_HALF_DEPTH + 0.6);
      batches.boxes.push({ x: towerX, y: baseY + TOWER_HEIGHT / 2, z, sx: 3.2, sy: TOWER_HEIGHT, sz: 2.6, color: ORANGE });
      batches.boxes.push({ x: towerX, y: baseY + TOWER_HEIGHT / 2, z: z + side * 0.2, sx: 3.6, sy: TOWER_HEIGHT - 2, sz: 2.2, color: ORANGE_DARK });
      batches.boxes.push({ x: towerX, y: baseY + TOWER_HEIGHT + 0.6, z, sx: 3.8, sy: 1.2, sz: 3.2, color: ORANGE });
    }
    for (const y of [DECK_Y + 4.5, DECK_Y + 10, TOWER_HEIGHT - 1.5]) {
      batches.boxes.push({ x: towerX, y: baseY + y, z: cz, sx: 3.4, sy: 2.2, sz: DECK_HALF_DEPTH * 2 + 1, color: ORANGE });
      if (quality !== 'low') batches.boxes.push({ x: towerX + 1.75, y: baseY + y, z: cz, sx: 0.2, sy: 1.1, sz: DECK_HALF_DEPTH * 2 + 1, color: ORANGE_DARK });
    }
    batches.boxes.push({ x: towerX, y: baseY + 2.5, z: cz, sx: 3.4, sy: 5, sz: DECK_HALF_DEPTH * 2 + 1, color: ORANGE });
  }

  // Main cables: from the plaza anchorage over both towers to the Marin anchorage.
  const topY = TOWER_HEIGHT + 0.4;
  const spans: { x0: number; y0: number; x1: number; y1: number; sag: number }[] = [
    { x0: approach.maxX - 3, y0: DECK_Y, x1: eastTowerX, y1: topY + 1.2, sag: 0 },
    { x0: eastTowerX, y0: topY + 1.2, x1: WEST_TOWER_X, y1: topY - 0.3, sag: 11 },
    { x0: WEST_TOWER_X, y0: topY - 0.3, x1: DECK_END_X - 4, y1: DECK_Y, sag: 0 },
  ];
  const segments = quality === 'low' ? 6 : 12;
  for (const side of [-1, 1] as const) {
    const z = cz + side * (DECK_HALF_DEPTH + 0.6);
    for (const span of spans) {
      const points: Vec3[] = [];
      for (let index = 0; index <= segments; index += 1) {
        const t = index / segments;
        const x = span.x0 + (span.x1 - span.x0) * t;
        const y = span.y0 + (span.y1 - span.y0) * t - span.sag * 4 * t * (1 - t);
        points.push([x, y, z]);
      }
      for (let index = 0; index < points.length - 1; index += 1) {
        batches.boxes.push(strutItem(points[index]!, points[index + 1]!, 0.55, CABLE_TONE));
      }
      if (quality === 'low' || span.sag === 0) continue;
      for (let index = 1; index < points.length - 1; index += 1) {
        const [px, py, pz] = points[index]!;
        batches.boxes.push({ x: px, y: (py + DECK_Y) / 2, z: pz, sx: 0.16, sy: py - DECK_Y, sz: 0.16, color: CABLE_TONE });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pastel bay-window Victorian rows
// ---------------------------------------------------------------------------

function buildVictorianRow(block: Blocker, rng: Rng, quality: Quality, batches: Batches): void {
  batches.flats.push(shadowItem(block));
  const alongX = width(block) >= depth(block);
  const length = alongX ? width(block) : depth(block);
  const count = Math.max(2, Math.round(length / 4.5));
  const houseLength = length / count;
  for (let index = 0; index < count; index += 1) {
    const start = index * houseLength;
    const rect: RectXZ = alongX
      ? { minX: block.minX + start, maxX: block.minX + start + houseLength, minZ: block.minZ, maxZ: block.maxZ }
      : { minX: block.minX, maxX: block.maxX, minZ: block.minZ + start, maxZ: block.minZ + start + houseLength };
    const body = grow(rect, -0.15);
    const height = 6.5 + rng.int(3) * 1.4;
    const pastel = rng.pick(PASTELS);
    const trim = rng.pick(TRIMS);
    const roof = rng.pick(ROOF_TONES);
    batches.boxes.push(boxItem(body, 0, height, pastel));
    // Cornice + roof cap (highlighted top face).
    batches.boxes.push(boxItem(grow(body, 0.25), height, 0.5, trim));
    const style = rng.int(3);
    if (style === 0) {
      batches.boxes.push(boxItem(grow(body, -0.4), height + 0.5, 1.6, roof));
      batches.boxes.push({ x: centerX(body), y: height + 2.6, z: centerZ(body), sx: 1.6, sy: 1.0, sz: 1.6, color: rng.pick(HILL_HOUSE_TONES) });
    } else if (style === 1) {
      // Gabled roof: two slanted slabs meeting on a ridge that runs along Z (gable faces the street).
      const half = width(body) / 2;
      const slope = 0.7;
      const rise = half * Math.tan(slope);
      for (const side of [-1, 1] as const) {
        batches.boxes.push({
          x: centerX(body) + (side * half) / 2,
          y: height + 0.5 + rise / 2,
          z: centerZ(body),
          sx: half / Math.cos(slope) + 0.4,
          sy: 0.35,
          sz: depth(body) + 0.5,
          rz: -side * slope,
          color: roof,
        });
      }
      batches.boxes.push({ x: centerX(body), y: height + 0.5 + rise / 2, z: centerZ(body), sx: width(body) - 0.3, sy: rise, sz: depth(body) - 0.3, color: pastel });
      batches.boxes.push({ x: centerX(body), y: height + 0.5 + rise * 0.55, z: body.maxZ + 0.02, sx: 0.9, sy: 0.9, sz: 0.12, color: WINDOW_TONE });
    } else {
      // Corner turret with a domed cap, plus a low roof behind it.
      batches.boxes.push(boxItem(grow(body, -0.4), height + 0.5, 1.2, roof));
      const tx = body.maxX - 1.1;
      const tz = body.maxZ - 0.6;
      batches.cylinders.push({ x: tx, y: (height + 1.4) / 2, z: tz, sx: 2.0, sy: height + 1.4, sz: 2.0, color: pastel });
      batches.cylinders.push({ x: tx, y: height + 1.6, z: tz, sx: 2.4, sy: 0.4, sz: 2.4, color: trim });
      batches.spheres.push({ x: tx, y: height + 2.2, z: tz, sx: 1.05, sy: 1.3, sz: 1.05, color: roof });
      batches.boxes.push({ x: tx, y: height + 3.9, z: tz, sx: 0.15, sy: 1.2, sz: 0.15, color: INK });
    }

    // Bay window jutting out of the +Z face (the one the chase camera sees), two storeys tall.
    const bayWidth = Math.min(2.6, width(body) * 0.55);
    const bayX = centerX(body);
    batches.boxes.push({ x: bayX, y: 1.4 + (height - 2.2) / 2, z: body.maxZ + 0.5, sx: bayWidth, sy: height - 2.2, sz: 1.0, color: pastel });
    batches.boxes.push({ x: bayX, y: height - 0.6, z: body.maxZ + 0.6, sx: bayWidth + 0.5, sy: 0.4, sz: 1.3, color: trim });
    // Steps to the front door.
    batches.boxes.push({ x: body.minX + 1.0, y: 0.35, z: body.maxZ + 0.6, sx: 1.2, sy: 0.7, sz: 1.2, color: STEP_TONE });
    batches.boxes.push({ x: body.minX + 1.0, y: 1.9, z: body.maxZ + 0.02, sx: 1.0, sy: 2.2, sz: 0.1, color: WINDOW_TONE });
    if (quality === 'low') continue;
    if (rng.next() < 0.5) {
      batches.boxes.push({ x: body.minX + 1.0, y: 3.25, z: body.maxZ + 0.55, sx: 1.6, sy: 0.12, sz: 1.1, rx: 0.35, color: rng.next() < 0.5 ? HOT_PINK : CYAN });
    }
    for (let y = 2.4; y < height - 1.4; y += 2.6) {
      batches.boxes.push({ x: bayX, y: y + 0.8, z: body.maxZ + 1.02, sx: bayWidth - 0.8, sy: 1.4, sz: 0.08, color: GLASS_TONE });
      batches.boxes.push({ x: bayX - bayWidth / 2 - 0.02, y: y + 0.8, z: body.maxZ + 0.5, sx: 0.08, sy: 1.4, sz: 0.6, color: GLASS_TONE });
      batches.boxes.push({ x: bayX + bayWidth / 2 + 0.02, y: y + 0.8, z: body.maxZ + 0.5, sx: 0.08, sy: 1.4, sz: 0.6, color: GLASS_TONE });
      if (index === 0) batches.boxes.push({ x: body.minX - 0.04, y: y + 0.8, z: centerZ(body), sx: 0.08, sy: 1.4, sz: 1.0, color: GLASS_TONE });
      if (index === count - 1) batches.boxes.push({ x: body.maxX + 0.04, y: y + 0.8, z: centerZ(body), sx: 0.08, sy: 1.4, sz: 1.0, color: GLASS_TONE });
    }
    // Trim band between storeys, corner pilasters, cornice brackets and a chimney.
    batches.boxes.push({ x: centerX(body), y: 2.0, z: body.maxZ + 0.04, sx: width(body), sy: 0.25, sz: 0.1, color: trim });
    for (const cx of [body.minX + 0.15, body.maxX - 0.15]) {
      batches.boxes.push({ x: cx, y: height / 2, z: body.maxZ + 0.06, sx: 0.3, sy: height, sz: 0.12, color: trim });
    }
    for (let bx = body.minX + 0.6; bx < body.maxX - 0.3; bx += 1.1) {
      batches.boxes.push({ x: bx, y: height - 0.3, z: body.maxZ + 0.3, sx: 0.25, sy: 0.5, sz: 0.5, color: trim });
    }
    if (rng.next() < 0.6) {
      batches.boxes.push({ x: body.minX + 0.9, y: height + 1.6, z: body.minZ + 1.2, sx: 0.8, sy: 2.4, sz: 0.8, color: rng.next() < 0.5 ? BRICK_TONE : trim });
    }
    // Second-colour band on the bay window sill for the "painted lady" look.
    batches.boxes.push({ x: bayX, y: 1.35, z: body.maxZ + 0.6, sx: bayWidth + 0.3, sy: 0.3, sz: 1.2, color: rng.pick(TRIMS) });
  }
}

// ---------------------------------------------------------------------------
// Cable-car barn, wharf sheds, hill terrace, bay pier
// ---------------------------------------------------------------------------

function buildCableBarn(block: Blocker, quality: Quality, batches: Batches): void {
  batches.flats.push(shadowItem(block));
  const forecourtDepth = 5;
  const barn: RectXZ = { ...block, minZ: block.minZ + forecourtDepth };
  const forecourt: RectXZ = { ...block, maxZ: block.minZ + forecourtDepth };
  const height = 9;
  batches.boxes.push(boxItem(barn, 0, height, BRICK_TONE));
  batches.boxes.push(boxItem(grow(barn, 0.3), height, 0.6, CREAM));
  batches.boxes.push(boxItem(grow(barn, -0.6), height + 0.6, 1.6, BARN_ROOF_TONE));
  batches.boxes.push(boxItem(grow(barn, -2.5), height + 2.2, 1.2, CREAM));
  // Big arched doorway (dark) with a yellow signboard above it, on the -Z (forecourt) face.
  batches.boxes.push({ x: centerX(barn), y: 3, z: barn.minZ - 0.04, sx: 6, sy: 6, sz: 0.1, color: WINDOW_TONE });
  batches.cylinders.push({ x: centerX(barn), y: 6, z: barn.minZ - 0.04, sx: 6, sy: 0.1, sz: 6, rx: Math.PI / 2, color: WINDOW_TONE });
  batches.boxes.push({ x: centerX(barn), y: 7.9, z: barn.minZ - 0.2, sx: 9, sy: 1.2, sz: 0.3, color: YELLOW });
  batches.boxes.push({ x: centerX(barn), y: 7.9, z: barn.minZ - 0.36, sx: 8.6, sy: 0.7, sz: 0.06, color: INK });
  // Smokestack.
  batches.cylinders.push({ x: barn.maxX - 2, y: height + 4, z: barn.maxZ - 3, sx: 1.6, sy: 8, sz: 1.6, color: BRICK_DARK });
  batches.cylinders.push({ x: barn.maxX - 2, y: height + 8.2, z: barn.maxZ - 3, sx: 1.9, sy: 0.5, sz: 1.9, color: INK });

  // Forecourt: paving, rails, and a parked cable car (inside the blocker, so it is collidable).
  batches.flats.push(flatItem(forecourt, 0.018, STEP_TONE));
  const carX = centerX(barn);
  const carZ = centerZ(forecourt);
  for (const offset of [-1.2, 1.2]) {
    batches.flats.push({ x: carX + offset, y: 0.03, z: carZ, sx: 0.25, sy: forecourtDepth, sz: 1, rx: FLAT, color: RAIL_TONE });
  }
  batches.boxes.push({ x: carX, y: 0.5, z: carZ, sx: 2.6, sy: 0.6, sz: 4.4, color: INK });
  batches.boxes.push({ x: carX, y: 1.9, z: carZ, sx: 2.8, sy: 2.2, sz: 4.6, color: CAR_BODY_TONE });
  batches.boxes.push({ x: carX, y: 3.15, z: carZ, sx: 3.2, sy: 0.4, sz: 5.0, color: CAR_ROOF_TONE });
  batches.boxes.push({ x: carX, y: 3.55, z: carZ, sx: 2.2, sy: 0.5, sz: 3.6, color: CAR_BODY_TONE });
  batches.boxes.push({ x: carX, y: 2.2, z: carZ, sx: 2.9, sy: 1.0, sz: 3.2, color: GLASS_TONE });
  batches.boxes.push({ x: carX, y: 1.2, z: carZ, sx: 2.9, sy: 0.25, sz: 4.7, color: YELLOW });
  if (quality === 'low') return;
  for (const z of [carZ - 1.6, carZ + 1.6]) {
    for (const x of [carX - 1.35, carX + 1.35]) {
      batches.cylinders.push({ x, y: 0.5, z, sx: 0.9, sy: 0.4, sz: 0.9, rz: Math.PI / 2, color: INK });
    }
  }
  // Barn side windows facing +Z (camera side).
  for (let x = barn.minX + 2; x < barn.maxX - 1; x += 2.6) {
    batches.boxes.push({ x, y: 5.5, z: barn.maxZ + 0.04, sx: 1.4, sy: 2.6, sz: 0.1, color: GLASS_TONE });
    batches.boxes.push({ x, y: 6.9, z: barn.maxZ + 0.06, sx: 1.6, sy: 0.2, sz: 0.1, color: CREAM });
  }
}

function buildWharfSheds(block: Blocker, quality: Quality, batches: Batches): void {
  batches.flats.push(shadowItem(block));
  batches.flats.push(flatItem(block, 0.018, PLANK_TONE));
  const shedDepth = (depth(block) - 2) / 2;
  const sheds: RectXZ[] = [
    { minX: block.minX, maxX: block.maxX, minZ: block.minZ, maxZ: block.minZ + shedDepth },
    { minX: block.minX, maxX: block.maxX, minZ: block.maxZ - shedDepth, maxZ: block.maxZ },
  ];
  sheds.forEach((shed, index) => {
    const height = 4.5;
    batches.boxes.push(boxItem(shed, 0, height, SHED_TONE));
    batches.boxes.push(boxItem(grow(shed, 0.2), height, 0.4, INK));
    // Pitched roof from two slanted slabs.
    const half = depth(shed) / 2;
    const slope = 0.62;
    const slabLength = half / Math.cos(slope) + 0.4;
    const rise = half * Math.tan(slope);
    for (const side of [-1, 1] as const) {
      batches.boxes.push({
        x: centerX(shed),
        y: height + 0.4 + rise / 2,
        z: centerZ(shed) + (side * half) / 2,
        sx: width(shed) + 0.6,
        sy: 0.35,
        sz: slabLength,
        rx: side * slope,
        color: index === 0 ? SHED_ROOF_TONE : CYAN,
      });
    }
    batches.boxes.push({ x: centerX(shed), y: height + 0.4 + rise, z: centerZ(shed), sx: width(shed) + 0.8, sy: 0.4, sz: 0.5, color: INK });
    batches.boxes.push({ x: centerX(shed), y: 2.2, z: shed.maxZ + 0.04, sx: width(shed) * 0.5, sy: 3.6, sz: 0.1, color: WINDOW_TONE });
    if (quality === 'low') return;
    for (let x = shed.minX + 1.5; x < shed.maxX; x += 3) {
      batches.boxes.push({ x, y: height + 0.4 + rise * 0.55, z: shed.maxZ + 0.4, sx: 1.2, sy: 1.0, sz: 0.2, color: CREAM });
    }
  });
  // Pier sign on the street face, bollards along the plank edge, crate stacks, a couple of gulls.
  batches.cylinders.push({ x: centerX(block), y: 3.6, z: block.maxZ + 1.2, sx: 0.3, sy: 7.2, sz: 0.3, color: POST_TONE });
  batches.boxes.push({ x: centerX(block), y: 7.6, z: block.maxZ + 1.2, sx: 7, sy: 2.2, sz: 0.4, color: CREAM });
  batches.boxes.push({ x: centerX(block), y: 7.6, z: block.maxZ + 1.45, sx: 5.6, sy: 1.0, sz: 0.1, color: HOT_PINK });
  batches.boxes.push({ x: centerX(block), y: 8.9, z: block.maxZ + 1.2, sx: 7.4, sy: 0.3, sz: 0.6, color: INK });
  if (quality === 'low') return;
  for (let x = block.minX + 1; x <= block.maxX - 1; x += 3) {
    batches.cylinders.push({ x, y: 0.45, z: block.maxZ - 0.5, sx: 0.5, sy: 0.9, sz: 0.5, color: INK });
    batches.cylinders.push({ x, y: 0.45, z: block.minZ + 0.5, sx: 0.5, sy: 0.9, sz: 0.5, color: INK });
  }
  for (const [cx, cz, h] of [[block.minX + 1.2, centerZ(block) + 1.6, 1.4], [block.minX + 2.6, centerZ(block) + 1.6, 0.9], [block.maxX - 1.5, centerZ(block) - 1.6, 1.2]] as const) {
    batches.boxes.push({ x: cx, y: h / 2, z: cz, sx: 1.2, sy: h, sz: 1.2, color: PLANK_TONE });
  }
  for (const [gx, gz] of [[block.minX + 4, block.minZ + 1], [block.maxX - 5, block.maxZ - 2]] as const) {
    batches.spheres.push({ x: gx, y: 6.4, z: gz, sx: 0.5, sy: 0.4, sz: 0.7, color: CREAM });
    batches.boxes.push({ x: gx, y: 6.4, z: gz, sx: 1.6, sy: 0.08, sz: 0.3, color: CREAM });
  }
  // Crab pots and barrels in the alley between the sheds.
  for (let x = block.minX + 2; x < block.maxX - 1; x += 3.5) {
    batches.cylinders.push({ x, y: 0.6, z: centerZ(block), sx: 1.1, sy: 1.2, sz: 1.1, color: x % 7 < 3.5 ? POST_TONE : YELLOW });
  }
}

function buildHillTerrace(block: Blocker, rng: Rng, quality: Quality, batches: Batches): void {
  batches.flats.push(shadowItem(block));
  // Stepped tiers climbing toward +X, each carrying a row of houses: a hill you can see but never walk.
  const tiers = 3;
  const tierWidth = width(block) / tiers;
  for (let tier = 0; tier < tiers; tier += 1) {
    const rect: RectXZ = { minX: block.minX + tier * tierWidth, maxX: block.maxX, minZ: block.minZ, maxZ: block.maxZ };
    const h = 1.5 + tier * 1.5;
    batches.boxes.push(boxItem(rect, 0, h, HILL_TONES[tier]!));
    batches.boxes.push(boxItem({ ...rect, maxX: rect.minX + tierWidth }, h, 0.2, LEAF_TONES[2]));
    // Stair strip.
    batches.boxes.push({ x: rect.minX + 0.5, y: h - 0.5, z: centerZ(rect), sx: 1.0, sy: 1.0, sz: 3, color: STEP_TONE });
    const houses = quality === 'low' ? 2 : 3;
    for (let index = 0; index < houses; index += 1) {
      const hx = rect.minX + tierWidth / 2;
      const hz = block.minZ + 3 + (index * (depth(block) - 6)) / Math.max(1, houses - 1);
      const hh = 3.2 + rng.next() * 1.4;
      batches.boxes.push({ x: hx, y: h + hh / 2, z: hz, sx: 3.2, sy: hh, sz: 3.2, color: rng.pick(PASTELS) });
      batches.boxes.push({ x: hx, y: h + hh + 0.3, z: hz, sx: 2.6, sy: 0.6, sz: 2.6, color: rng.pick(ROOF_TONES) });
      batches.boxes.push({ x: hx, y: h + 1.4, z: hz + 1.64, sx: 0.9, sy: 1.2, sz: 0.1, color: WINDOW_TONE });
    }
  }
}

function buildBayPier(block: Blocker, quality: Quality, batches: Batches): void {
  // A small harbour inlet inside the blocker with a plank pier down the middle: water you cannot enter.
  batches.boxes.push(boxItem(grow(block, 0.1), 0, 0.5, CONCRETE_TONE));
  batches.flats.push(flatItem(grow(block, -0.8), 0.51, WATER_TONE));
  const pier: RectXZ = { minX: block.minX, maxX: block.maxX - 2, minZ: centerZ(block) - 2, maxZ: centerZ(block) + 2 };
  batches.boxes.push(boxItem(pier, 0.5, 0.6, PLANK_TONE));
  for (let x = pier.minX + 2; x < pier.maxX; x += 3) {
    for (const z of [pier.minZ + 0.4, pier.maxZ - 0.4]) {
      batches.cylinders.push({ x, y: 1.2, z, sx: 0.5, sy: 1.6, sz: 0.5, color: POST_TONE });
    }
    batches.boxes.push({ x, y: 1.1, z: centerZ(pier), sx: 0.1, sy: 0.02, sz: 4, color: PLANK_DARK });
  }
  // Two little sailboats.
  for (const [bx, bz, ry] of [
    [block.minX + 5, block.minZ + 3, 0.4],
    [block.maxX - 5, block.maxZ - 3.5, -0.9],
  ] as const) {
    batches.boxes.push({ x: bx, y: 0.9, z: bz, sx: 1.4, sy: 0.8, sz: 3.4, ry, color: BOAT_TONE });
    batches.boxes.push({ x: bx, y: 1.32, z: bz, sx: 1.5, sy: 0.12, sz: 3.6, ry, color: BOAT_TRIM_TONE });
    batches.cylinders.push({ x: bx, y: 3.2, z: bz, sx: 0.16, sy: 4.4, sz: 0.16, color: POST_TONE });
    if (quality !== 'low') batches.boxes.push({ x: bx, y: 3.4, z: bz, sx: 0.08, sy: 3.2, sz: 1.6, ry, color: CREAM });
  }
  batches.spheres.push({ x: centerX(block), y: 0.9, z: block.maxZ - 2.2, sx: 0.5, sy: 0.6, sz: 0.5, color: BUOY_TONE });
  batches.spheres.push({ x: block.minX + 3, y: 0.9, z: block.maxZ - 3, sx: 0.5, sy: 0.6, sz: 0.5, color: YELLOW });
  // Fishing boat with a wheelhouse, lifebuoy rings on the pier posts, a lamp at the pier head.
  const fx = block.maxX - 9;
  const fz = block.minZ + 3.2;
  batches.boxes.push({ x: fx, y: 0.95, z: fz, sx: 2.0, sy: 0.9, sz: 4.6, ry: 0.15, color: CYAN });
  batches.boxes.push({ x: fx, y: 1.42, z: fz, sx: 2.1, sy: 0.14, sz: 4.8, ry: 0.15, color: CREAM });
  batches.boxes.push({ x: fx, y: 2.1, z: fz + 1.0, sx: 1.4, sy: 1.2, sz: 1.4, ry: 0.15, color: CREAM });
  batches.boxes.push({ x: fx, y: 2.8, z: fz + 1.0, sx: 1.6, sy: 0.2, sz: 1.6, ry: 0.15, color: HOT_PINK });
  if (quality !== 'low') {
    for (const x of [pier.minX + 5, pier.minX + 11]) {
      batches.rings.push({ x, y: 1.6, z: pier.maxZ + 0.05, sx: 0.28, sy: 0.28, sz: 0.28, rx: 0, color: ORANGE });
    }
    batches.cylinders.push({ x: pier.maxX - 0.8, y: 2.3, z: centerZ(pier), sx: 0.2, sy: 3.4, sz: 0.2, color: LAMP_POST_TONE });
    batches.spheres.push({ x: pier.maxX - 0.8, y: 4.2, z: centerZ(pier), sx: 0.5, sy: 0.5, sz: 0.5, color: LAMP_GLOW_TONE });
  }
}

// ---------------------------------------------------------------------------
// Props: street trees, lamps, socket pads
// ---------------------------------------------------------------------------

function buildProps(definition: CityDefinition, rng: Rng, quality: Quality, batches: Batches): void {
  const placed: [number, number][] = [];
  const target = quality === 'low' ? 16 : 44;
  const { bounds } = definition;
  for (let attempt = 0; attempt < target * 8 && placed.length < target; attempt += 1) {
    const x = bounds.minX + rng.next() * width(bounds);
    const z = bounds.minZ + rng.next() * depth(bounds);
    if (!isClearForProps(definition, x, z, true)) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 5)) continue;
    placed.push([x, z]);
    const crown = 1.4 + rng.next() * 0.8;
    const trunkHeight = 1.4 + rng.next() * 0.6;
    batches.cylinders.push({ x, y: trunkHeight / 2, z, sx: 0.5, sy: trunkHeight, sz: 0.5, color: TRUNK_TONE });
    batches.spheres.push({ x, y: trunkHeight + crown * 0.85, z, sx: crown, sy: crown * 1.1, sz: crown, color: rng.pick(LEAF_TONES) });
  }
  if (quality === 'low') return;
  for (const road of definition.roads) {
    const horizontal = width(road) >= depth(road);
    if (!horizontal) continue;
    for (let along = 9; along < width(road); along += 18) {
      for (const side of [-1, 1] as const) {
        const x = road.minX + along;
        const z = centerZ(road) + side * (depth(road) / 2 + 0.8);
        if (!isClearForProps(definition, x, z, false)) continue;
        batches.cylinders.push({ x, y: 1.6, z, sx: 0.3, sy: 3.2, sz: 0.3, color: LAMP_POST_TONE });
        batches.boxes.push({ x, y: 3.5, z, sx: 0.8, sy: 0.8, sz: 0.8, color: LAMP_GLOW_TONE });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Water shimmer: a few foam bars that drift on the bay, moved by mutating one group (no React state)
// ---------------------------------------------------------------------------

const FOAM_BARS: readonly InstanceItem[] = [
  { x: -30, y: -0.2, z: -95, sx: 18, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: 20, y: -0.2, z: -110, sx: 26, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: -80, y: -0.2, z: -130, sx: 22, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: 60, y: -0.2, z: -85, sx: 16, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: 100, y: -0.2, z: -20, sx: 20, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: 120, y: -0.2, z: 40, sx: 24, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: -10, y: -0.2, z: -160, sx: 30, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: -95, y: -0.2, z: -52, sx: 14, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: -118, y: -0.2, z: -36, sx: 18, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
  { x: -84, y: -0.2, z: -32, sx: 10, sy: 0.5, sz: 1, rx: FLAT, color: FOAM_TONE },
];

const RIPPLE_BARS: readonly InstanceItem[] = Array.from({ length: 28 }, (_, index) => {
  const row = Math.floor(index / 7);
  const col = index % 7;
  const inStrait = row >= 2;
  return {
    x: inStrait ? -80 - col * 12 - (row % 2) * 6 : -110 + col * 38 + (row % 2) * 12,
    y: -0.22,
    z: inStrait ? -58 + (row - 2) * 16 + (col % 3) * 4 : -90 - row * 30 - (col % 2) * 9,
    sx: 6 + (col % 3) * 3,
    sy: 0.35,
    sz: 1,
    rx: FLAT,
    color: col % 2 ? WATER_DEEP_TONE : FOAM_TONE,
  };
});

// Two instanced layers drift on different phases; the only per-frame work is two group transforms.
function BayShimmer() {
  const foam = useRef<Group>(null);
  const ripple = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const foamGroup = foam.current;
    if (foamGroup) {
      foamGroup.position.x = Math.sin(t * 0.35) * 2.5;
      foamGroup.position.z = Math.cos(t * 0.27) * 1.5;
      foamGroup.scale.x = 1 + Math.sin(t * 0.8) * 0.06;
    }
    const rippleGroup = ripple.current;
    if (rippleGroup) {
      rippleGroup.position.x = Math.cos(t * 0.5 + 1.3) * 1.8;
      rippleGroup.position.z = Math.sin(t * 0.41) * 2.2;
      rippleGroup.position.y = Math.sin(t * 1.1) * 0.03;
    }
  });
  return (
    <>
      <group ref={foam}>
        <Instances geometry={UNIT_PLANE} items={FOAM_BARS} />
      </group>
      <group ref={ripple}>
        <Instances geometry={UNIT_PLANE} items={RIPPLE_BARS} />
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function SanFranciscoScene({ definition, seed, quality }: CitySceneProps) {
  const { blockers, sockets } = definition;

  const layout = useMemo(() => {
    const rng = createRng(hashSeed('san-francisco-cosmetic', seed));
    const batches: Batches = { boxes: [], cylinders: [], spheres: [], flats: [], rings: [], haze: [] };

    buildBackground(definition, rng, quality, batches);
    buildStreets(definition, quality, batches);

    for (const blocker of blockers) {
      if (blocker.id === 'bridge-approach') buildGoldenGate(blocker, quality, batches);
      else if (blocker.id === 'cable-barn') buildCableBarn(blocker, quality, batches);
      else if (blocker.id === 'wharf-sheds') buildWharfSheds(blocker, quality, batches);
      else if (blocker.id === 'hill-terrace') buildHillTerrace(blocker, rng, quality, batches);
      else if (blocker.id === 'bay-pier') buildBayPier(blocker, quality, batches);
      else buildVictorianRow(blocker, rng, quality, batches);
    }

    buildProps(definition, rng, quality, batches);

    for (const socket of sockets) {
      const [x, , z] = socket.position;
      batches.cylinders.push({ x, y: 0.03, z, sx: 5.2, sy: 0.06, sz: 5.2, color: SOCKET_DISC_TONE });
      batches.rings.push({ x, y: 0.08, z, sx: 1, sy: 1, sz: 1, rx: FLAT, color: SOCKET_PAD_TONE });
    }

    for (const batch of Object.values(batches)) batch.sort(byTopDescending);
    return batches;
  }, [definition, seed, quality, blockers, sockets]);

  return (
    <group>
      <Instances geometry={UNIT_PLANE} items={layout.flats} />
      <Instances geometry={UNIT_BOX} items={layout.boxes} />
      <Instances geometry={UNIT_CYLINDER} items={layout.cylinders} />
      <Instances geometry={UNIT_SPHERE} items={layout.spheres} />
      <Instances geometry={SOCKET_RING} items={layout.rings} />
      <Instances geometry={UNIT_BOX} items={layout.haze} material={HAZE_MATERIAL} />
      <BayShimmer />
    </group>
  );
}
