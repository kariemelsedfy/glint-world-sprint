/**
 * Paris scenery. Owner: A3. Scenery only — no rules, pickups, players, timers or camera work.
 *
 * Everything is derived from `definition`: blockers become buildings / water / landmarks,
 * roads become boulevards, sockets get a legible pavement pad. Cosmetic variation (facade
 * tones, roof colors, tree and lamp placement) uses an independent seeded RNG and never
 * moves a blocker or props into a socket's clear zone. Repeated props are instanced.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  InstancedMesh,
  LineBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
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
const UNIT_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 8);
const UNIT_SPHERE = new SphereGeometry(1, 10, 8);
const SQUARE_CONE = new ConeGeometry(Math.SQRT1_2, 1, 4);
const SQUARE_CONE_EDGES = new EdgesGeometry(SQUARE_CONE);
const TAPERED_SHAFT = new CylinderGeometry(0.45, 1.1, 1, 4);
const UNIT_PLANE = new PlaneGeometry(1, 1);
const SOCKET_RING = new RingGeometry(1.7, 2.3, 32);

const WHITE = new MeshLambertMaterial({ color: '#ffffff' });
const GROUND_MATERIAL = new MeshLambertMaterial({ color: '#cfe3c8' });
const PLAZA_MATERIAL = new MeshLambertMaterial({ color: '#eadfc9' });
const SIDEWALK_MATERIAL = new MeshLambertMaterial({ color: '#f3ede0' });
const ROAD_MATERIAL = new MeshLambertMaterial({ color: '#d8d2c3' });
const WATER_MATERIAL = new MeshLambertMaterial({ color: '#4fb9e4' });
const QUAY_MATERIAL = new MeshLambertMaterial({ color: '#d6c7a8' });
const BRIDGE_MATERIAL = new MeshLambertMaterial({ color: '#e6dcc6' });
const IRON_MATERIAL = new MeshLambertMaterial({ color: '#5a4536' });
const GLASS_MATERIAL = new MeshStandardMaterial({
  color: '#8fdcf0',
  transparent: true,
  opacity: 0.6,
  roughness: 0.15,
  metalness: 0.1,
  side: DoubleSide,
});
const GLASS_EDGE_MATERIAL = new LineBasicMaterial({ color: '#2f6f86' });
const SOCKET_PAD_MATERIAL = new MeshLambertMaterial({ color: '#fff6e5' });
const SOCKET_DISC_MATERIAL = new MeshLambertMaterial({ color: '#d9cdb4' });

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
  readonly color: string;
}

interface InstancesProps {
  readonly geometry: BoxGeometry | CylinderGeometry | SphereGeometry;
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
      scratchObject.rotation.set(item.rx ?? 0, item.ry ?? 0, 0);
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

interface BuildingBatches {
  readonly bodies: InstanceItem[];
  readonly plinths: InstanceItem[];
  readonly roofs: InstanceItem[];
  readonly chimneys: InstanceItem[];
  readonly windows: InstanceItem[];
}

function buildFacades(segments: readonly FacadeSegment[], rng: Rng, quality: Quality): BuildingBatches {
  const batches: BuildingBatches = { bodies: [], plinths: [], roofs: [], chimneys: [], windows: [] };
  for (const segment of segments) {
    const { rect, height, stone, roof, outer } = segment;
    batches.bodies.push(boxItem(rect, 0, height, stone));
    batches.plinths.push(boxItem(grow(rect, 0.08), 0, PLINTH_HEIGHT, PLINTH_TONE));
    batches.roofs.push(boxItem(grow(rect, -0.5), height, ROOF_HEIGHT, roof));
    batches.roofs.push(boxItem(grow(rect, -1.4), height + ROOF_HEIGHT, 0.5, roof));
    if (quality === 'low') continue;

    const chimneyCount = 1 + rng.int(2);
    for (let index = 0; index < chimneyCount; index += 1) {
      batches.chimneys.push({
        x: rect.minX + 1.5 + rng.next() * Math.max(0.1, width(rect) - 3),
        y: height + ROOF_HEIGHT + 0.6,
        z: rect.minZ + 1.5 + rng.next() * Math.max(0.1, depth(rect) - 3),
        sx: 0.7,
        sy: 1.4,
        sz: 0.7,
        color: CHIMNEY_TONE,
      });
    }

    for (let y = 2.6; y <= height - 1.6; y += 3) {
      const rowY = y + 0.8;
      if (rect.minZ <= outer.minZ + 0.01 || rect.maxZ >= outer.maxZ - 0.01) {
        for (let x = rect.minX + 1.4; x <= rect.maxX - 1.4; x += 2.6) {
          if (rect.minZ <= outer.minZ + 0.01) {
            batches.windows.push({ x, y: rowY, z: rect.minZ - 0.04, sx: 1.1, sy: 1.6, sz: 0.1, color: WINDOW_TONE });
          }
          if (rect.maxZ >= outer.maxZ - 0.01) {
            batches.windows.push({ x, y: rowY, z: rect.maxZ + 0.04, sx: 1.1, sy: 1.6, sz: 0.1, color: WINDOW_TONE });
          }
        }
      }
      if (rect.minX <= outer.minX + 0.01 || rect.maxX >= outer.maxX - 0.01) {
        for (let z = rect.minZ + 1.4; z <= rect.maxZ - 1.4; z += 2.6) {
          if (rect.minX <= outer.minX + 0.01) {
            batches.windows.push({ x: rect.minX - 0.04, y: rowY, z, sx: 0.1, sy: 1.6, sz: 1.1, color: WINDOW_TONE });
          }
          if (rect.maxX >= outer.maxX - 0.01) {
            batches.windows.push({ x: rect.maxX + 0.04, y: rowY, z, sx: 0.1, sy: 1.6, sz: 1.1, color: WINDOW_TONE });
          }
        }
      }
    }
  }
  return batches;
}

interface PropBatches {
  readonly trunks: InstanceItem[];
  readonly crowns: InstanceItem[];
  readonly lampPosts: InstanceItem[];
  readonly lampGlows: InstanceItem[];
}

function isClearForProps(
  definition: CityDefinition,
  x: number,
  z: number,
  keepOffRoads: boolean,
): boolean {
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

function buildProps(definition: CityDefinition, rng: Rng, quality: Quality): PropBatches {
  const batches: PropBatches = { trunks: [], crowns: [], lampPosts: [], lampGlows: [] };
  const placed: [number, number][] = [];
  const target = quality === 'low' ? 28 : 80;
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
    batches.trunks.push({ x, y: trunkHeight / 2, z, sx: 0.55, sy: trunkHeight, sz: 0.55, color: TRUNK_TONE });
    batches.crowns.push({
      x,
      y: trunkHeight + crown * 0.85,
      z,
      sx: crown,
      sy: crown * 1.1,
      sz: crown,
      color: rng.pick(LEAF_TONES),
    });
  }

  if (quality === 'low') return batches;

  for (const road of definition.roads) {
    const horizontal = width(road) >= depth(road);
    const length = horizontal ? width(road) : depth(road);
    for (let along = 9; along < length; along += 18) {
      for (const side of [-1, 1] as const) {
        const x = horizontal ? road.minX + along : centerX(road) + side * (width(road) / 2 + 0.8);
        const z = horizontal ? centerZ(road) + side * (depth(road) / 2 + 0.8) : road.minZ + along;
        if (!isClearForProps(definition, x, z, false)) continue;
        batches.lampPosts.push({ x, y: 1.4, z, sx: 0.3, sy: 2.8, sz: 0.3, color: LAMP_POST_TONE });
        batches.lampGlows.push({ x, y: 3.1, z, sx: 0.7, sy: 0.7, sz: 0.7, color: LAMP_GLOW_TONE });
      }
    }
  }
  return batches;
}

// ---------------------------------------------------------------------------
// Flat surfaces
// ---------------------------------------------------------------------------

function FlatRect({
  rect,
  y,
  material,
}: {
  readonly rect: RectXZ;
  readonly y: number;
  readonly material: MeshLambertMaterial;
}) {
  return (
    <mesh
      geometry={UNIT_PLANE}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[centerX(rect), y, centerZ(rect)]}
      scale={[width(rect), depth(rect), 1]}
    />
  );
}

function River({ segments, bridges }: { readonly segments: readonly Blocker[]; readonly bridges: readonly RectXZ[] }) {
  const quays = useMemo<InstanceItem[]>(
    () =>
      segments.flatMap((segment) => [
        boxItem({ minX: segment.minX, maxX: segment.minX + 0.6, minZ: segment.minZ, maxZ: segment.maxZ }, 0, 0.5, '#d6c7a8'),
        boxItem({ minX: segment.maxX - 0.6, maxX: segment.maxX, minZ: segment.minZ, maxZ: segment.maxZ }, 0, 0.5, '#d6c7a8'),
      ]),
    [segments],
  );
  return (
    <group>
      {segments.map((segment) => (
        <FlatRect key={segment.id} rect={segment} y={0.03} material={WATER_MATERIAL} />
      ))}
      <Instances geometry={UNIT_BOX} items={quays} />
      {bridges.map((bridge, index) => (
        <group key={`bridge-${index}`}>
          <mesh
            geometry={UNIT_BOX}
            material={BRIDGE_MATERIAL}
            position={[centerX(bridge), 0.12, centerZ(bridge)]}
            scale={[width(bridge) + 2, 0.24, depth(bridge)]}
          />
          <mesh
            geometry={UNIT_BOX}
            material={QUAY_MATERIAL}
            position={[centerX(bridge), 0.55, bridge.minZ + 0.3]}
            scale={[width(bridge) + 2, 0.9, 0.5]}
          />
          <mesh
            geometry={UNIT_BOX}
            material={QUAY_MATERIAL}
            position={[centerX(bridge), 0.55, bridge.maxZ - 0.3]}
            scale={[width(bridge) + 2, 0.9, 0.5]}
          />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

const UP = new Vector3(0, 1, 0);

function Strut({ from, to, thickness }: { readonly from: Vec3; readonly to: Vec3; readonly thickness: number }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const direction = b.clone().sub(a);
    const size = direction.length();
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(UP, direction.normalize()),
      length: size,
    };
  }, [from, to]);
  return (
    <mesh
      geometry={UNIT_BOX}
      material={IRON_MATERIAL}
      position={position}
      quaternion={quaternion}
      scale={[thickness, length, thickness]}
    />
  );
}

function EiffelTower({ landmark, quality }: { readonly landmark: Landmark; readonly quality: Quality }) {
  const [cx, cz] = landmark.center;
  const half = Math.min(width(landmark.footprint), depth(landmark.footprint)) / 2;
  const legSpread = half - 1.2;
  const platform1Y = 12;
  const platform2Y = 22;
  const shaftTop = 32;
  const corners: readonly (readonly [number, number])[] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const detailed = quality !== 'low';

  return (
    <group position={[cx, 0, cz]}>
      {corners.map(([sx, sz], index) => (
        <group key={`leg-${index}`}>
          <Strut from={[sx * legSpread, 0, sz * legSpread]} to={[sx * 2.4, platform1Y, sz * 2.4]} thickness={1.7} />
          <Strut from={[sx * 2.4, platform1Y, sz * 2.4]} to={[sx * 1.1, platform2Y, sz * 1.1]} thickness={1.0} />
          <mesh
            geometry={UNIT_BOX}
            material={IRON_MATERIAL}
            position={[sx * legSpread, 0.5, sz * legSpread]}
            scale={[2.6, 1, 2.6]}
          />
        </group>
      ))}
      {detailed &&
        corners.map(([sx, sz], index) => {
          const next = corners[(index + 1) % corners.length]!;
          const mid = 0.55;
          const t = 0.42;
          const ax = (sx * legSpread) * (1 - t) + sx * 2.4 * t;
          const az = (sz * legSpread) * (1 - t) + sz * 2.4 * t;
          const bx = (next[0] * legSpread) * (1 - t) + next[0] * 2.4 * t;
          const bz = (next[1] * legSpread) * (1 - t) + next[1] * 2.4 * t;
          return (
            <group key={`brace-${index}`}>
              <Strut from={[ax, platform1Y * t, az]} to={[bx, platform1Y * t, bz]} thickness={0.45} />
              <Strut from={[ax, platform1Y * t, az]} to={[(ax + bx) / 2, platform1Y * (t + mid * 0.5), (az + bz) / 2]} thickness={0.3} />
              <Strut from={[bx, platform1Y * t, bz]} to={[(ax + bx) / 2, platform1Y * (t + mid * 0.5), (az + bz) / 2]} thickness={0.3} />
            </group>
          );
        })}
      <mesh geometry={UNIT_BOX} material={IRON_MATERIAL} position={[0, platform1Y, 0]} scale={[7.2, 1.1, 7.2]} />
      <mesh geometry={UNIT_BOX} material={IRON_MATERIAL} position={[0, platform1Y + 1.1, 0]} scale={[5.8, 1.0, 5.8]} />
      <mesh geometry={UNIT_BOX} material={IRON_MATERIAL} position={[0, platform2Y, 0]} scale={[3.6, 0.9, 3.6]} />
      <mesh
        geometry={TAPERED_SHAFT}
        material={IRON_MATERIAL}
        position={[0, (platform2Y + shaftTop) / 2, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[1, shaftTop - platform2Y, 1]}
      />
      <mesh geometry={UNIT_BOX} material={IRON_MATERIAL} position={[0, shaftTop + 0.4, 0]} scale={[2.2, 0.8, 2.2]} />
      <mesh geometry={UNIT_CYLINDER} material={IRON_MATERIAL} position={[0, shaftTop + 2.6, 0]} scale={[0.4, 3.6, 0.4]} />
    </group>
  );
}

function Louvre({ landmark, quality }: { readonly landmark: Landmark; readonly quality: Quality }) {
  const { footprint } = landmark;
  const pyramidBase = 7;
  const pyramidHeight = 5.6;
  const px = centerX(footprint);
  const pz = footprint.maxZ - 6;
  return (
    <group>
      <FlatRect rect={grow(footprint, 6)} y={0.012} material={PLAZA_MATERIAL} />
      <mesh
        geometry={SQUARE_CONE}
        material={GLASS_MATERIAL}
        position={[px, pyramidHeight / 2, pz]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[pyramidBase, pyramidHeight, pyramidBase]}
      />
      {quality !== 'low' && (
        <lineSegments
          geometry={SQUARE_CONE_EDGES}
          material={GLASS_EDGE_MATERIAL}
          position={[px, pyramidHeight / 2, pz]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[pyramidBase, pyramidHeight, pyramidBase]}
        />
      )}
      <mesh
        geometry={UNIT_BOX}
        material={SOCKET_DISC_MATERIAL}
        position={[px, 0.1, pz]}
        scale={[pyramidBase + 1.2, 0.2, pyramidBase + 1.2]}
      />
    </group>
  );
}

function Cafe({ landmark, quality }: { readonly landmark: Landmark; readonly quality: Quality }) {
  const { footprint } = landmark;
  const frontZ = footprint.maxZ - 2;
  const awning = useMemo<InstanceItem[]>(() => {
    const items: InstanceItem[] = [];
    const stripeWidth = 1;
    for (let x = footprint.minX; x < footprint.maxX - 0.01; x += stripeWidth) {
      const index = Math.round((x - footprint.minX) / stripeWidth);
      items.push({
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
    return items;
  }, [footprint, frontZ]);

  const terrace = useMemo<InstanceItem[]>(() => {
    if (quality === 'low') return [];
    const items: InstanceItem[] = [];
    for (let x = footprint.minX + 1.6; x < footprint.maxX - 1; x += 3.2) {
      items.push({ x, y: 0.45, z: frontZ + 1, sx: 0.18, sy: 0.9, sz: 0.18, color: LAMP_POST_TONE });
      items.push({ x, y: 0.95, z: frontZ + 1, sx: 1.3, sy: 0.12, sz: 1.3, color: TABLE_TONE });
    }
    return items;
  }, [footprint, frontZ, quality]);

  return (
    <group>
      <FlatRect rect={grow(footprint, 5)} y={0.012} material={PLAZA_MATERIAL} />
      <Instances geometry={UNIT_BOX} items={awning} />
      <Instances geometry={UNIT_CYLINDER} items={terrace} />
      <mesh
        geometry={UNIT_BOX}
        material={IRON_MATERIAL}
        position={[centerX(footprint), 4.6, frontZ + 0.15]}
        scale={[width(footprint) * 0.7, 1.0, 0.3]}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function ParisScene({ definition, seed, quality }: CitySceneProps) {
  const { bounds, roads, blockers, landmarks, sockets } = definition;

  const layout = useMemo(() => {
    const rng = createRng(hashSeed('paris-cosmetic', seed));
    const landmarkIds = new Set(landmarks.map((landmark) => landmark.id));
    const riverSegments = blockers.filter((blocker) => blocker.id.startsWith('river'));
    const facadeBlocks = blockers.filter(
      (blocker) => !landmarkIds.has(blocker.id) && !blocker.id.startsWith('river'),
    );

    const segments: FacadeSegment[] = facadeBlocks.flatMap((blocker) => splitBlock(blocker, rng));
    for (const landmark of landmarks) {
      const { footprint } = landmark;
      if (landmark.silhouette === 'museum') {
        const wing = 3.6;
        const wings: RectXZ[] = [
          { minX: footprint.minX, maxX: footprint.maxX, minZ: footprint.minZ, maxZ: footprint.minZ + wing },
          { minX: footprint.minX, maxX: footprint.minX + wing, minZ: footprint.minZ + wing, maxZ: footprint.maxZ },
          { minX: footprint.maxX - wing, maxX: footprint.maxX, minZ: footprint.minZ + wing, maxZ: footprint.maxZ },
        ];
        for (const rect of wings) {
          segments.push({ rect, height: 5.2, stone: STONE_TONES[0], roof: ROOF_TONES[0], outer: rect });
        }
      } else if (landmark.silhouette === 'cafe') {
        const body: RectXZ = { ...footprint, maxZ: footprint.maxZ - 2 };
        segments.push({ rect: body, height: 5.4, stone: CAFE_TONE, roof: ROOF_TONES[2], outer: body });
      }
    }

    const bridges: RectXZ[] = [];
    if (riverSegments.length > 0) {
      const riverX = { minX: riverSegments[0]!.minX, maxX: riverSegments[0]!.maxX };
      for (const road of roads) {
        if (road.minX <= riverX.minX && road.maxX >= riverX.maxX) {
          const crossesWater = riverSegments.some(
            (segment) => road.minZ < segment.maxZ && road.maxZ > segment.minZ,
          );
          if (!crossesWater) bridges.push({ ...riverX, minZ: road.minZ, maxZ: road.maxZ });
        }
      }
    }

    return {
      riverSegments,
      bridges,
      buildings: buildFacades(segments, rng, quality),
      props: buildProps(definition, rng, quality),
    };
  }, [definition, seed, quality, blockers, landmarks, roads]);

  const eiffel = landmarks.find((landmark) => landmark.silhouette === 'tower');
  const louvre = landmarks.find((landmark) => landmark.silhouette === 'museum');
  const cafe = landmarks.find((landmark) => landmark.silhouette === 'cafe');

  return (
    <group>
      <FlatRect rect={bounds} y={0} material={GROUND_MATERIAL} />

      {eiffel && <FlatRect rect={grow(eiffel.footprint, 7)} y={0.012} material={PLAZA_MATERIAL} />}

      {roads.map((road, index) => (
        <FlatRect key={`sidewalk-${index}`} rect={grow(road, 1.2)} y={0.016} material={SIDEWALK_MATERIAL} />
      ))}
      {roads.map((road, index) => (
        <FlatRect key={`road-${index}`} rect={road} y={0.02} material={ROAD_MATERIAL} />
      ))}

      <River segments={layout.riverSegments} bridges={layout.bridges} />

      <Instances geometry={UNIT_BOX} items={layout.buildings.bodies} />
      <Instances geometry={UNIT_BOX} items={layout.buildings.plinths} />
      <Instances geometry={UNIT_BOX} items={layout.buildings.roofs} />
      <Instances geometry={UNIT_BOX} items={layout.buildings.chimneys} />
      <Instances geometry={UNIT_BOX} items={layout.buildings.windows} />

      <Instances geometry={UNIT_CYLINDER} items={layout.props.trunks} />
      <Instances geometry={UNIT_SPHERE} items={layout.props.crowns} />
      <Instances geometry={UNIT_CYLINDER} items={layout.props.lampPosts} />
      <Instances geometry={UNIT_BOX} items={layout.props.lampGlows} />

      {eiffel && <EiffelTower landmark={eiffel} quality={quality} />}
      {louvre && <Louvre landmark={louvre} quality={quality} />}
      {cafe && <Cafe landmark={cafe} quality={quality} />}

      {sockets.map((socket) => (
        <group key={socket.id} position={[socket.position[0], 0, socket.position[2]]}>
          <mesh
            geometry={UNIT_CYLINDER}
            material={SOCKET_DISC_MATERIAL}
            position={[0, 0.03, 0]}
            scale={[5.2, 0.06, 5.2]}
          />
          <mesh geometry={SOCKET_RING} material={SOCKET_PAD_MATERIAL} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} />
        </group>
      ))}
    </group>
  );
}
