/**
 * Paris scenery. Owner: A3. Scenery only — no rules, pickups, players, timers or camera work.
 *
 * Everything is derived from `definition`: blockers become buildings / water / landmarks,
 * roads become boulevards, sockets get a legible pavement pad. Cosmetic variation (facade
 * tones, roof colors, tree and lamp placement) uses an independent seeded RNG and never
 * moves a blocker or props into a socket's clear zone.
 *
 * Render budget: the whole city is a handful of InstancedMesh draws (one per shared
 * geometry), all with vertex-lit Lambert materials, no transparency and no per-frame work.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  EdgesGeometry,
  InstancedMesh,
  LineBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import type { CitySceneProps } from '@/cities/CityScenery';
import type { Blocker, CityDefinition, Landmark, Quality, RectXZ, Vec3 } from '@/shared/contracts';
import { createRng, hashSeed } from '@/shared/seed';
import type { Rng } from '@/shared/seed';

// ---------------------------------------------------------------------------
// Shared geometry and materials (module singletons: one allocation per page load)
// ---------------------------------------------------------------------------

const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 6);
const UNIT_SPHERE = new SphereGeometry(1, 7, 5);
const SQUARE_CONE = new ConeGeometry(Math.SQRT1_2, 1, 4);
const SQUARE_CONE_EDGES = new EdgesGeometry(SQUARE_CONE);
const TAPERED_SHAFT = new CylinderGeometry(0.45, 1.1, 1, 4);
const UNIT_PLANE = new PlaneGeometry(1, 1);
const SOCKET_RING = new RingGeometry(1.7, 2.3, 20);

/** Single vertex-colored material shared by every instanced batch. */
const WHITE = new MeshLambertMaterial({ color: '#ffffff' });
const IRON_MATERIAL = new MeshLambertMaterial({ color: '#5a4536' });
const GLASS_MATERIAL = new MeshLambertMaterial({ color: '#a6e0f2' });
const GLASS_EDGE_MATERIAL = new LineBasicMaterial({ color: '#2f6f86' });

const GROUND_TONE = '#cfe3c8';
const PLAZA_TONE = '#eadfc9';
const SIDEWALK_TONE = '#f3ede0';
const ROAD_TONE = '#d8d2c3';
const WATER_TONE = '#4fb9e4';
const QUAY_TONE = '#d6c7a8';
const BRIDGE_TONE = '#e6dcc6';
const IRON_TONE = '#5a4536';
const SOCKET_PAD_TONE = '#fff6e5';
const SOCKET_DISC_TONE = '#d9cdb4';
const STONE_TONES = ['#f6dfc1', '#efd3ae', '#f3e3cc', '#e9cfa9', '#f8e8d2'] as const;
const ROOF_TONES = ['#48667d', '#3f5b70', '#52708a', '#455f74'] as const;
const LEAF_TONES = ['#6fbf73', '#5faf68', '#86c97a', '#4fa35e'] as const;
const PLINTH_TONE = '#d3b891';
const WINDOW_TONE = '#2a3d52';
const CHIMNEY_TONE = '#c8a98a';
const TRUNK_TONE = '#7a5a3a';
const LAMP_POST_TONE = '#26303b';
const LAMP_GLOW_TONE = '#ffc857';
const AWNING_RED = '#d9484a';
const AWNING_WHITE = '#fff6e5';
const CAFE_TONE = '#f8e6cf';
const TABLE_TONE = '#fff6e5';

const ROOF_HEIGHT = 2.2;
const PLINTH_HEIGHT = 0.8;
const SOCKET_CLEAR_RADIUS = 5;
const FLAT = -Math.PI / 2;

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
  readonly quaternion?: Quaternion;
  readonly color: string;
}

interface InstancesProps {
  readonly geometry: BufferGeometry;
  readonly items: readonly InstanceItem[];
}

const scratchObject = new Object3D();
const scratchColor = new Color();

function Instances({ geometry, items }: InstancesProps) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, index) => {
      scratchObject.position.set(item.x, item.y, item.z);
      if (item.quaternion) scratchObject.quaternion.copy(item.quaternion);
      else scratchObject.rotation.set(item.rx ?? 0, item.ry ?? 0, 0);
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
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, WHITE, items.length]}
      frustumCulled={false}
    />
  );
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
function contains(rect: RectXZ, x: number, z: number): boolean {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

function boxItem(rect: RectXZ, y0: number, height: number, color: string): InstanceItem {
  return {
    x: centerX(rect),
    y: y0 + height / 2,
    z: centerZ(rect),
    sx: width(rect),
    sy: height,
    sz: depth(rect),
    color,
  };
}

/** A flat XZ rectangle drawn with the shared unit plane. */
function flatItem(rect: RectXZ, y: number, color: string): InstanceItem {
  return { x: centerX(rect), y, z: centerZ(rect), sx: width(rect), sy: depth(rect), sz: 1, rx: FLAT, color };
}

const UP = new Vector3(0, 1, 0);
/** Two kerb strips beside a road, so pavement never sits underneath the road surface itself. */
function sidewalkStrips(road: RectXZ, by: number): readonly RectXZ[] {
  return width(road) >= depth(road)
    ? [
        { minX: road.minX - by, maxX: road.maxX + by, minZ: road.minZ - by, maxZ: road.minZ },
        { minX: road.minX - by, maxX: road.maxX + by, minZ: road.maxZ, maxZ: road.maxZ + by },
      ]
    : [
        { minX: road.minX - by, maxX: road.minX, minZ: road.minZ - by, maxZ: road.maxZ + by },
        { minX: road.maxX, maxX: road.maxX + by, minZ: road.minZ - by, maxZ: road.maxZ + by },
      ];
}

/**
 * Instance order is draw order. The camera looks down, so drawing the highest items first lets the
 * depth test reject the ground and building bodies underneath before they are shaded.
 */
function top(item: InstanceItem): number {
  return item.rx === undefined && item.quaternion === undefined ? item.y + item.sy / 2 : item.y;
}
function byTopDescending(a: InstanceItem, b: InstanceItem): number {
  return top(b) - top(a);
}

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

interface FacadeSegment {
  readonly rect: RectXZ;
  readonly height: number;
  readonly stone: string;
  readonly roof: string;
  /** Faces of the segment that lie on the outer boundary of its parent footprint. */
  readonly outer: RectXZ;
}

/** Splits a blocker footprint into a row of Haussmann-style houses of varying height. */
function splitBlock(blocker: RectXZ, rng: Rng, fixedHeight?: number): FacadeSegment[] {
  const alongX = width(blocker) >= depth(blocker);
  const length = alongX ? width(blocker) : depth(blocker);
  const count = Math.max(1, Math.min(4, Math.round(length / 5) - rng.int(2)));
  const segments: FacadeSegment[] = [];
  let cursor = 0;
  for (let index = 0; index < count; index += 1) {
    const remaining = count - index;
    const share = index === count - 1 ? length - cursor : (length - cursor) / remaining + (rng.next() - 0.5) * 2;
    const start = cursor;
    const end = index === count - 1 ? length : Math.min(length - (remaining - 1) * 3, start + Math.max(3, share));
    cursor = end;
    const rect: RectXZ = alongX
      ? { minX: blocker.minX + start, maxX: blocker.minX + end, minZ: blocker.minZ, maxZ: blocker.maxZ }
      : { minX: blocker.minX, maxX: blocker.maxX, minZ: blocker.minZ + start, maxZ: blocker.minZ + end };
    segments.push({
      rect,
      height: fixedHeight ?? 7 + rng.int(5),
      stone: rng.pick(STONE_TONES),
      roof: rng.pick(ROOF_TONES),
      outer: blocker,
    });
  }
  return segments;
}

/** All box-shaped scenery in one batch; boxes are by far the most common shape. */
function buildFacades(segments: readonly FacadeSegment[], rng: Rng, quality: Quality, boxes: InstanceItem[]): void {
  for (const segment of segments) {
    const { rect, height, stone, roof, outer } = segment;
    boxes.push(boxItem(rect, 0, height, stone));
    boxes.push(boxItem(grow(rect, -0.5), height, ROOF_HEIGHT, roof));
    if (quality === 'low') continue;
    boxes.push(boxItem(grow(rect, 0.08), 0, PLINTH_HEIGHT, PLINTH_TONE));
    boxes.push(boxItem(grow(rect, -1.4), height + ROOF_HEIGHT, 0.5, roof));

    const chimneyCount = 1 + rng.int(2);
    for (let index = 0; index < chimneyCount; index += 1) {
      boxes.push({
        x: rect.minX + 1.5 + rng.next() * Math.max(0.1, width(rect) - 3),
        y: height + ROOF_HEIGHT + 0.6,
        z: rect.minZ + 1.5 + rng.next() * Math.max(0.1, depth(rect) - 3),
        sx: 0.7,
        sy: 1.4,
        sz: 0.7,
        color: CHIMNEY_TONE,
      });
    }

    // The chase camera always looks toward -Z, so the -Z facade is never on screen: skip its windows.
    for (let y = 2.6; y <= height - 1.6; y += 3) {
      const rowY = y + 0.8;
      if (rect.maxZ >= outer.maxZ - 0.01) {
        for (let x = rect.minX + 1.4; x <= rect.maxX - 1.4; x += 2.6) {
          boxes.push({ x, y: rowY, z: rect.maxZ + 0.04, sx: 1.1, sy: 1.6, sz: 0.1, color: WINDOW_TONE });
        }
      }
      if (rect.minX <= outer.minX + 0.01 || rect.maxX >= outer.maxX - 0.01) {
        for (let z = rect.minZ + 1.4; z <= rect.maxZ - 1.4; z += 2.6) {
          if (rect.minX <= outer.minX + 0.01) {
            boxes.push({ x: rect.minX - 0.04, y: rowY, z, sx: 0.1, sy: 1.6, sz: 1.1, color: WINDOW_TONE });
          }
          if (rect.maxX >= outer.maxX - 0.01) {
            boxes.push({ x: rect.maxX + 0.04, y: rowY, z, sx: 0.1, sy: 1.6, sz: 1.1, color: WINDOW_TONE });
          }
        }
      }
    }
  }
}

function isClearForProps(definition: CityDefinition, x: number, z: number, keepOffRoads: boolean): boolean {
  const limits = grow(definition.bounds, -2);
  if (!contains(limits, x, z)) return false;
  for (const blocker of definition.blockers) {
    if (contains(grow(blocker, 2.5), x, z)) return false;
  }
  for (const landmark of definition.landmarks) {
    if (contains(grow(landmark.footprint, 5), x, z)) return false;
  }
  if (keepOffRoads) {
    for (const road of definition.roads) {
      if (contains(grow(road, 1.5), x, z)) return false;
    }
  }
  for (const socket of definition.sockets) {
    if (Math.hypot(socket.position[0] - x, socket.position[2] - z) < SOCKET_CLEAR_RADIUS) return false;
  }
  if (Math.hypot(definition.spawn[0] - x, definition.spawn[2] - z) < SOCKET_CLEAR_RADIUS) return false;
  return true;
}

interface Batches {
  readonly boxes: InstanceItem[];
  readonly cylinders: InstanceItem[];
  readonly spheres: InstanceItem[];
  readonly flats: InstanceItem[];
  readonly rings: InstanceItem[];
}

function buildProps(definition: CityDefinition, rng: Rng, quality: Quality, batches: Batches): void {
  const placed: [number, number][] = [];
  const target = quality === 'low' ? 24 : 64;
  const attempts = target * 8;
  const { bounds } = definition;

  for (let attempt = 0; attempt < attempts && placed.length < target; attempt += 1) {
    const x = bounds.minX + rng.next() * width(bounds);
    const z = bounds.minZ + rng.next() * depth(bounds);
    if (!isClearForProps(definition, x, z, true)) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4)) continue;
    placed.push([x, z]);
    const crown = 1.5 + rng.next() * 0.9;
    const trunkHeight = 1.4 + rng.next() * 0.6;
    batches.cylinders.push({ x, y: trunkHeight / 2, z, sx: 0.55, sy: trunkHeight, sz: 0.55, color: TRUNK_TONE });
    batches.spheres.push({
      x,
      y: trunkHeight + crown * 0.85,
      z,
      sx: crown,
      sy: crown * 1.1,
      sz: crown,
      color: rng.pick(LEAF_TONES),
    });
  }

  if (quality === 'low') return;

  for (const road of definition.roads) {
    const horizontal = width(road) >= depth(road);
    const length = horizontal ? width(road) : depth(road);
    for (let along = 9; along < length; along += 18) {
      for (const side of [-1, 1] as const) {
        const x = horizontal ? road.minX + along : centerX(road) + side * (width(road) / 2 + 0.8);
        const z = horizontal ? centerZ(road) + side * (depth(road) / 2 + 0.8) : road.minZ + along;
        if (!isClearForProps(definition, x, z, false)) continue;
        batches.cylinders.push({ x, y: 1.4, z, sx: 0.3, sy: 2.8, sz: 0.3, color: LAMP_POST_TONE });
        batches.boxes.push({ x, y: 3.1, z, sx: 0.7, sy: 0.7, sz: 0.7, color: LAMP_GLOW_TONE });
      }
    }
  }
}

function buildRiver(segments: readonly Blocker[], bridges: readonly RectXZ[], batches: Batches): void {
  for (const segment of segments) {
    batches.flats.push(flatItem(segment, 0.03, WATER_TONE));
    batches.boxes.push(boxItem({ ...segment, maxX: segment.minX + 0.6 }, 0, 0.5, QUAY_TONE));
    batches.boxes.push(boxItem({ ...segment, minX: segment.maxX - 0.6 }, 0, 0.5, QUAY_TONE));
  }
  for (const bridge of bridges) {
    const w = width(bridge) + 2;
    batches.boxes.push({ x: centerX(bridge), y: 0.12, z: centerZ(bridge), sx: w, sy: 0.24, sz: depth(bridge), color: BRIDGE_TONE });
    batches.boxes.push({ x: centerX(bridge), y: 0.55, z: bridge.minZ + 0.3, sx: w, sy: 0.9, sz: 0.5, color: QUAY_TONE });
    batches.boxes.push({ x: centerX(bridge), y: 0.55, z: bridge.maxZ - 0.3, sx: w, sy: 0.9, sz: 0.5, color: QUAY_TONE });
  }
}

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

const EIFFEL_PLATFORM_1 = 12;
const EIFFEL_PLATFORM_2 = 22;
const EIFFEL_SHAFT_TOP = 32;
const CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

function buildEiffel(landmark: Landmark, quality: Quality, boxes: InstanceItem[]): void {
  const [cx, cz] = landmark.center;
  const half = Math.min(width(landmark.footprint), depth(landmark.footprint)) / 2;
  const legSpread = half - 1.2;
  const at = (x: number, y: number, z: number): Vec3 => [cx + x, y, cz + z];
  const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
    boxes.push({ x: cx + x, y, z: cz + z, sx, sy, sz, color: IRON_TONE });

  for (const [sx, sz] of CORNERS) {
    boxes.push(strutItem(at(sx * legSpread, 0, sz * legSpread), at(sx * 2.4, EIFFEL_PLATFORM_1, sz * 2.4), 1.7, IRON_TONE));
    boxes.push(strutItem(at(sx * 2.4, EIFFEL_PLATFORM_1, sz * 2.4), at(sx * 1.1, EIFFEL_PLATFORM_2, sz * 1.1), 1.0, IRON_TONE));
    box(sx * legSpread, 0.5, sz * legSpread, 2.6, 1, 2.6);
  }
  if (quality !== 'low') {
    CORNERS.forEach(([sx, sz], index) => {
      const next = CORNERS[(index + 1) % CORNERS.length]!;
      const t = 0.42;
      const ax = sx * legSpread * (1 - t) + sx * 2.4 * t;
      const az = sz * legSpread * (1 - t) + sz * 2.4 * t;
      const bx = next[0] * legSpread * (1 - t) + next[0] * 2.4 * t;
      const bz = next[1] * legSpread * (1 - t) + next[1] * 2.4 * t;
      const y = EIFFEL_PLATFORM_1 * t;
      const apexY = EIFFEL_PLATFORM_1 * (t + 0.275);
      boxes.push(strutItem(at(ax, y, az), at(bx, y, bz), 0.45, IRON_TONE));
      boxes.push(strutItem(at(ax, y, az), at((ax + bx) / 2, apexY, (az + bz) / 2), 0.3, IRON_TONE));
      boxes.push(strutItem(at(bx, y, bz), at((ax + bx) / 2, apexY, (az + bz) / 2), 0.3, IRON_TONE));
    });
    box(0, EIFFEL_PLATFORM_1 + 1.1, 0, 5.8, 1.0, 5.8);
  }
  box(0, EIFFEL_PLATFORM_1, 0, 7.2, 1.1, 7.2);
  box(0, EIFFEL_PLATFORM_2, 0, 3.6, 0.9, 3.6);
  box(0, EIFFEL_SHAFT_TOP + 0.4, 0, 2.2, 0.8, 2.2);
  box(0, EIFFEL_SHAFT_TOP + 2.6, 0, 0.4, 3.6, 0.4);
}

function EiffelShaft({ landmark }: { readonly landmark: Landmark }) {
  const [cx, cz] = landmark.center;
  return (
    <mesh
      geometry={TAPERED_SHAFT}
      material={IRON_MATERIAL}
      position={[cx, (EIFFEL_PLATFORM_2 + EIFFEL_SHAFT_TOP) / 2, cz]}
      rotation={[0, Math.PI / 4, 0]}
      scale={[1, EIFFEL_SHAFT_TOP - EIFFEL_PLATFORM_2, 1]}
    />
  );
}

const PYRAMID_BASE = 7;
const PYRAMID_HEIGHT = 5.6;

function pyramidCenter(landmark: Landmark): readonly [number, number] {
  return [centerX(landmark.footprint), landmark.footprint.maxZ - 6];
}

function LouvrePyramid({ landmark, quality }: { readonly landmark: Landmark; readonly quality: Quality }) {
  const [px, pz] = pyramidCenter(landmark);
  const transform = {
    position: [px, PYRAMID_HEIGHT / 2, pz] as [number, number, number],
    rotation: [0, Math.PI / 4, 0] as [number, number, number],
    scale: [PYRAMID_BASE, PYRAMID_HEIGHT, PYRAMID_BASE] as [number, number, number],
  };
  return (
    <group>
      <mesh geometry={SQUARE_CONE} material={GLASS_MATERIAL} {...transform} />
      {quality !== 'low' && <lineSegments geometry={SQUARE_CONE_EDGES} material={GLASS_EDGE_MATERIAL} {...transform} />}
    </group>
  );
}

function buildCafe(landmark: Landmark, quality: Quality, batches: Batches): void {
  const { footprint } = landmark;
  const frontZ = footprint.maxZ - 2;
  batches.flats.push(flatItem(grow(footprint, 5), 0.012, PLAZA_TONE));
  const stripeWidth = quality === 'low' ? 2 : 1;
  for (let x = footprint.minX; x < footprint.maxX - 0.01; x += stripeWidth) {
    const index = Math.round((x - footprint.minX) / stripeWidth);
    batches.boxes.push({
      x: x + stripeWidth / 2,
      y: 3.35,
      z: frontZ + 1,
      sx: stripeWidth,
      sy: 0.16,
      sz: 2.2,
      rx: 0.28,
      color: index % 2 === 0 ? AWNING_RED : AWNING_WHITE,
    });
  }
  batches.boxes.push({ x: centerX(footprint), y: 4.6, z: frontZ + 0.15, sx: width(footprint) * 0.7, sy: 1.0, sz: 0.3, color: IRON_TONE });
  if (quality === 'low') return;
  for (let x = footprint.minX + 1.6; x < footprint.maxX - 1; x += 3.2) {
    batches.cylinders.push({ x, y: 0.45, z: frontZ + 1, sx: 0.18, sy: 0.9, sz: 0.18, color: LAMP_POST_TONE });
    batches.cylinders.push({ x, y: 0.95, z: frontZ + 1, sx: 1.3, sy: 0.12, sz: 1.3, color: TABLE_TONE });
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function ParisScene({ definition, seed, quality }: CitySceneProps) {
  const { bounds, roads, blockers, landmarks, sockets } = definition;

  const layout = useMemo(() => {
    const rng = createRng(hashSeed('paris-cosmetic', seed));
    const batches: Batches = { boxes: [], cylinders: [], spheres: [], flats: [], rings: [] };
    const landmarkIds = new Set(landmarks.map((landmark) => landmark.id));
    const riverSegments = blockers.filter((blocker) => blocker.id.startsWith('river'));
    const facadeBlocks = blockers.filter((blocker) => !landmarkIds.has(blocker.id) && !blocker.id.startsWith('river'));

    batches.flats.push(flatItem(bounds, 0, GROUND_TONE));
    if (quality !== 'low') {
      for (const road of roads) {
        for (const strip of sidewalkStrips(road, 1.2)) batches.flats.push(flatItem(strip, 0.016, SIDEWALK_TONE));
      }
    }
    for (const road of roads) batches.flats.push(flatItem(road, 0.02, ROAD_TONE));

    const segments: FacadeSegment[] = facadeBlocks.flatMap((blocker) => splitBlock(blocker, rng));
    for (const landmark of landmarks) {
      const { footprint } = landmark;
      if (landmark.silhouette === 'tower') {
        batches.flats.push(flatItem(grow(footprint, 7), 0.012, PLAZA_TONE));
        buildEiffel(landmark, quality, batches.boxes);
      } else if (landmark.silhouette === 'museum') {
        const wing = 3.6;
        const wings: RectXZ[] = [
          { minX: footprint.minX, maxX: footprint.maxX, minZ: footprint.minZ, maxZ: footprint.minZ + wing },
          { minX: footprint.minX, maxX: footprint.minX + wing, minZ: footprint.minZ + wing, maxZ: footprint.maxZ },
          { minX: footprint.maxX - wing, maxX: footprint.maxX, minZ: footprint.minZ + wing, maxZ: footprint.maxZ },
        ];
        for (const rect of wings) {
          segments.push({ rect, height: 5.2, stone: STONE_TONES[0], roof: ROOF_TONES[0], outer: rect });
        }
        batches.flats.push(flatItem(grow(footprint, 6), 0.012, PLAZA_TONE));
        const [px, pz] = pyramidCenter(landmark);
        batches.boxes.push({ x: px, y: 0.1, z: pz, sx: PYRAMID_BASE + 1.2, sy: 0.2, sz: PYRAMID_BASE + 1.2, color: SOCKET_DISC_TONE });
      } else if (landmark.silhouette === 'cafe') {
        const body: RectXZ = { ...footprint, maxZ: footprint.maxZ - 2 };
        segments.push({ rect: body, height: 5.4, stone: CAFE_TONE, roof: ROOF_TONES[2], outer: body });
        buildCafe(landmark, quality, batches);
      }
    }

    const bridges: RectXZ[] = [];
    if (riverSegments.length > 0) {
      const riverX = { minX: riverSegments[0]!.minX, maxX: riverSegments[0]!.maxX };
      for (const road of roads) {
        if (road.minX <= riverX.minX && road.maxX >= riverX.maxX) {
          const crossesWater = riverSegments.some((segment) => road.minZ < segment.maxZ && road.maxZ > segment.minZ);
          if (!crossesWater) bridges.push({ ...riverX, minZ: road.minZ, maxZ: road.maxZ });
        }
      }
    }
    buildRiver(riverSegments, bridges, batches);
    buildFacades(segments, rng, quality, batches.boxes);
    buildProps(definition, rng, quality, batches);

    for (const socket of sockets) {
      const [x, , z] = socket.position;
      batches.cylinders.push({ x, y: 0.03, z, sx: 5.2, sy: 0.06, sz: 5.2, color: SOCKET_DISC_TONE });
      batches.rings.push({ x, y: 0.08, z, sx: 1, sy: 1, sz: 1, rx: FLAT, color: SOCKET_PAD_TONE });
    }

    for (const batch of Object.values(batches)) batch.sort(byTopDescending);
    return batches;
  }, [definition, seed, quality, bounds, blockers, landmarks, roads, sockets]);

  const eiffel = landmarks.find((landmark) => landmark.silhouette === 'tower');
  const louvre = landmarks.find((landmark) => landmark.silhouette === 'museum');

  return (
    <group>
      <Instances geometry={UNIT_PLANE} items={layout.flats} />
      <Instances geometry={UNIT_BOX} items={layout.boxes} />
      <Instances geometry={UNIT_CYLINDER} items={layout.cylinders} />
      <Instances geometry={UNIT_SPHERE} items={layout.spheres} />
      <Instances geometry={SOCKET_RING} items={layout.rings} />
      {eiffel && <EiffelShaft landmark={eiffel} />}
      {louvre && <LouvrePyramid landmark={louvre} quality={quality} />}
    </group>
  );
}
