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
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
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

/**
 * Bakes a chunky "toy" face shading into a geometry's vertex colours: top faces bright, front
 * faces mid, sides darker. Instance colours multiply on top, so one material serves every batch.
 */
function bakeFaceShading<G extends BufferGeometry>(geometry: G, flat = false): G {
  const normal = geometry.getAttribute('normal');
  const shade = new Float32Array(normal.count * 3);
  for (let index = 0; index < normal.count; index += 1) {
    const ny = normal.getY(index);
    const nz = normal.getZ(index);
    const nx = normal.getX(index);
    const factor = flat
      ? 1
      : 0.86 + 0.14 * Math.max(0, ny) + 0.08 * Math.max(0, nz) + 0.04 * Math.max(0, nx) - 0.2 * Math.max(0, -ny);
    shade[index * 3] = factor;
    shade[index * 3 + 1] = factor;
    shade[index * 3 + 2] = factor;
  }
  geometry.setAttribute('color', new BufferAttribute(shade, 3));
  return geometry;
}

const UNIT_BOX = bakeFaceShading(new BoxGeometry(1, 1, 1));
const UNIT_CYLINDER = bakeFaceShading(new CylinderGeometry(0.5, 0.5, 1, 6));
const UNIT_SPHERE = bakeFaceShading(new SphereGeometry(1, 7, 5));
/** Square-based pyramid, unit footprint, axis aligned (Louvre, parasols, conifer trees). */
const SQUARE_CONE = bakeFaceShading(new ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4));
/** Square frustum, unit footprint at the base, 0.55 at the top (mansard roofs, Eiffel shaft). */
const FRUSTUM = bakeFaceShading(new CylinderGeometry(0.55 * Math.SQRT1_2, Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4));
const UNIT_PLANE = bakeFaceShading(new PlaneGeometry(1, 1), true);

/** Single material shared by every instanced batch: vertex shading x instance colour. */
const WHITE = new MeshLambertMaterial({ color: '#ffffff', vertexColors: true });

// Arcade palette (docs/DECISIONS.md D14): ink, lavender, deep purple, cream, cyan, hot pink, yellow.
const INK = '#211333';
const LAVENDER = '#b6a1e8';
const DEEP_PURPLE = '#7146c5';
const CREAM = '#fff5e9';
const CYAN = '#22c4ea';
const HOT_PINK = '#f43fab';
const YELLOW = '#ffd963';

const PLAZA_TONE = '#f1e4d0';
const COURTYARD_TONE = '#e6d6c0';
const SIDEWALK_TONE = CREAM;
const ROAD_TONE = '#cdc3e3';
const ROAD_LINE_TONE = '#e8e0f7';
const WATER_TONE = CYAN;
const QUAY_TONE = '#e9dcc4';
const BRIDGE_TONE = '#f3e8d6';
const IRON_TONE = '#3a2a55';
const SOCKET_PAD_TONE = YELLOW;
const SOCKET_DISC_TONE = LAVENDER;
const SHADOW_TONE = '#8b7fa8';
const STONE_TONES = [CREAM, '#f9e8d3', '#ffeedd', '#f5dfc6', '#fbefe0', '#f6e6d8'] as const;
const ROOF_TONES = ['#4b3a78', '#5a4590', '#3f2f66', '#6a52a8', DEEP_PURPLE] as const;
const LEAF_TONES = ['#63c47a', '#4fb56b', '#7ed48c', '#3fa864', '#8fd97a'] as const;
const BACKDROP_TONES = ['#c9b8f0', LAVENDER, '#a893dc', '#d5c8f4'] as const;
const PLINTH_TONE = '#d9c6b0';
const WINDOW_TONE = INK;
const TRIM_TONE = '#f0d9c2';
const CHIMNEY_TONE = '#e3c9ad';
const TRUNK_TONE = '#5a3f5e';
const LAMP_POST_TONE = INK;
const LAMP_GLOW_TONE = YELLOW;
const AWNING_TONES = [HOT_PINK, CYAN, YELLOW] as const;
const CAFE_TONE = '#fff0e0';
const TABLE_TONE = CREAM;
const PYRAMID_TONE = '#9fe4f5';
const PLANE_TRUNK_TONE = '#d9ccb4';
const PLANE_LEAF_TONES = ['#8fd97a', '#a3e08a', '#7bcf72'] as const;
const KIOSK_TONE = '#2f8a6a';
const BALCONY_TONE = INK;
const LOUVRE_STONE = '#f9e8d3';
const LOUVRE_ROOF = '#3f2f66';

type RoofStyle = 'mansard' | 'steep' | 'parapet';
const ROOF_STYLES: readonly RoofStyle[] = ['mansard', 'mansard', 'steep', 'parapet'];

const ROOF_HEIGHT = 2.4;
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

/** Hard cartoon drop shadow: the footprint pushed toward +X/+Z (light sits at +X, up, +Z). */
const SHADOW_OFFSET = 1.4;
function shadowOf(rect: RectXZ): RectXZ {
  return {
    minX: rect.minX + SHADOW_OFFSET,
    maxX: rect.maxX + SHADOW_OFFSET,
    minZ: rect.minZ + SHADOW_OFFSET * 0.6,
    maxZ: rect.maxZ + SHADOW_OFFSET * 0.6,
  };
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
  readonly style: RoofStyle;
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
      style: rng.pick(ROOF_STYLES),
      outer: blocker,
    });
  }
  return segments;
}

/** All box-shaped scenery in one batch; boxes are by far the most common shape. */
function buildFacades(segments: readonly FacadeSegment[], rng: Rng, quality: Quality, batches: Batches): void {
  const { boxes, frustums, flats } = batches;
  for (const segment of segments) {
    const { rect, height, stone, roof, style, outer } = segment;
    boxes.push(boxItem(rect, 0, height, stone));
    const eaves = grow(rect, 0.35);
    let roofTop = height + ROOF_HEIGHT;
    if (style === 'parapet') {
      // Flat roof behind a low parapet, with a small attic box set back from the street.
      roofTop = height + 0.6;
      boxes.push(boxItem(eaves, height, 0.6, roof));
      boxes.push(boxItem(grow(rect, -1.2), height, 1.4, stone));
      roofTop = height + 1.4;
    } else if (style === 'steep') {
      const steep = ROOF_HEIGHT * 1.5;
      batches.cones.push({ x: centerX(eaves), y: height + steep / 2, z: centerZ(eaves), sx: width(eaves), sy: steep, sz: depth(eaves), color: roof });
      roofTop = height + steep;
    } else {
      // Mansard: a square frustum with a flat cap.
      frustums.push(boxItem(eaves, height, ROOF_HEIGHT, roof));
      boxes.push({
        x: centerX(eaves),
        y: height + ROOF_HEIGHT + 0.12,
        z: centerZ(eaves),
        sx: width(eaves) * 0.55 + 0.3,
        sy: 0.3,
        sz: depth(eaves) * 0.55 + 0.3,
        color: roof,
      });
    }
    flats.push(flatItem(shadowOf(rect), 0.008, SHADOW_TONE));
    if (quality === 'low') continue;
    boxes.push(boxItem(grow(rect, 0.08), 0, PLINTH_HEIGHT, PLINTH_TONE));
    boxes.push(boxItem(grow(rect, 0.3), height - 0.5, 0.5, TRIM_TONE));

    const chimneyCount = style === 'steep' ? 1 : 1 + rng.int(2);
    for (let index = 0; index < chimneyCount; index += 1) {
      const cx = rect.minX + 1.5 + rng.next() * Math.max(0.1, width(rect) - 3);
      const cz = rect.minZ + 1.5 + rng.next() * Math.max(0.1, depth(rect) - 3);
      const chimneyY = style === 'steep' ? height + 1.2 : roofTop - 0.2;
      boxes.push({ x: cx, y: chimneyY + 0.7, z: cz, sx: 0.8, sy: 1.4, sz: 0.8, color: CHIMNEY_TONE });
      batches.cylinders.push({ x: cx - 0.2, y: chimneyY + 1.7, z: cz, sx: 0.3, sy: 0.6, sz: 0.3, color: IRON_TONE });
      batches.cylinders.push({ x: cx + 0.2, y: chimneyY + 1.7, z: cz, sx: 0.3, sy: 0.6, sz: 0.3, color: IRON_TONE });
    }

    // Haussmann balcony: a continuous ledge with an ink railing on the second floor of the street face.
    if (rect.maxZ >= outer.maxZ - 0.01 && height >= 8) {
      const ledgeY = 2.6 + 3;
      boxes.push({ x: centerX(rect), y: ledgeY, z: rect.maxZ + 0.35, sx: width(rect) - 0.4, sy: 0.18, sz: 0.7, color: TRIM_TONE });
      boxes.push({ x: centerX(rect), y: ledgeY + 0.5, z: rect.maxZ + 0.66, sx: width(rect) - 0.4, sy: 0.8, sz: 0.08, color: BALCONY_TONE });
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
  readonly cones: InstanceItem[];
  readonly frustums: InstanceItem[];
  readonly flats: InstanceItem[];
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
    const leaf = rng.pick(LEAF_TONES);
    batches.cylinders.push({ x, y: trunkHeight / 2, z, sx: 0.55, sy: trunkHeight, sz: 0.55, color: TRUNK_TONE });
    if (rng.next() < 0.35) {
      const coneHeight = crown * 2.4;
      batches.cones.push({ x, y: trunkHeight + coneHeight / 2 - 0.2, z, sx: crown * 1.6, sy: coneHeight, sz: crown * 1.6, color: leaf });
    } else {
      batches.spheres.push({ x, y: trunkHeight + crown * 0.85, z, sx: crown, sy: crown * 1.1, sz: crown, color: leaf });
    }
    if (quality !== 'low') {
      const shadow = crown * 2.2;
      batches.cylinders.push({ x: x + 0.9, y: 0.006, z: z + 0.5, sx: shadow, sy: 0.012, sz: shadow, color: SHADOW_TONE });
    }
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
        // Plane trees alternate with lamps along every avenue: tall pale trunk, broad flat crown.
        if (Math.round(along / 18) % 2 === 1) {
          const leaf = rng.pick(PLANE_LEAF_TONES);
          batches.cylinders.push({ x, y: 1.6, z, sx: 0.5, sy: 3.2, sz: 0.5, color: PLANE_TRUNK_TONE });
          batches.spheres.push({ x, y: 4.2, z, sx: 2.6, sy: 1.6, sz: 2.6, color: leaf });
          batches.spheres.push({ x: x + 0.8, y: 4.9, z: z - 0.4, sx: 1.6, sy: 1.2, sz: 1.6, color: leaf });
          batches.cylinders.push({ x: x + 1.1, y: 0.006, z: z + 0.6, sx: 4.6, sy: 0.012, sz: 4.6, color: SHADOW_TONE });
          continue;
        }
        batches.cylinders.push({ x, y: 1.5, z, sx: 0.3, sy: 3.0, sz: 0.3, color: LAMP_POST_TONE });
        batches.boxes.push({ x, y: 0.2, z, sx: 0.8, sy: 0.4, sz: 0.8, color: LAMP_POST_TONE });
        batches.boxes.push({ x, y: 3.3, z, sx: 0.8, sy: 0.8, sz: 0.8, color: LAMP_GLOW_TONE });
        batches.cones.push({ x, y: 3.9, z, sx: 1.0, sy: 0.4, sz: 1.0, color: LAMP_POST_TONE });
      }
    }
  }

  buildKiosks(definition, rng, batches);
  buildTerraces(definition, rng, batches);
}

/** Green newspaper kiosks on a few plaza corners: hexagonal body, cone roof, yellow finial. */
function buildKiosks(definition: CityDefinition, rng: Rng, batches: Batches): void {
  let placed = 0;
  for (let attempt = 0; attempt < 120 && placed < 5; attempt += 1) {
    const road = definition.roads[rng.int(definition.roads.length)]!;
    const horizontal = width(road) >= depth(road);
    const side = rng.next() < 0.5 ? -1 : 1;
    const x = horizontal ? road.minX + rng.next() * width(road) : centerX(road) + side * (width(road) / 2 + 2.6);
    const z = horizontal ? centerZ(road) + side * (depth(road) / 2 + 2.6) : road.minZ + rng.next() * depth(road);
    if (!isClearForProps(definition, x, z, true)) continue;
    placed += 1;
    batches.cylinders.push({ x, y: 1.3, z, sx: 2.2, sy: 2.6, sz: 2.2, color: KIOSK_TONE });
    batches.cylinders.push({ x, y: 2.7, z, sx: 2.8, sy: 0.2, sz: 2.8, color: INK });
    batches.cones.push({ x, y: 3.3, z, sx: 2.9, sy: 1.0, sz: 2.9, color: KIOSK_TONE });
    batches.spheres.push({ x, y: 3.95, z, sx: 0.3, sy: 0.3, sz: 0.3, color: YELLOW });
    batches.boxes.push({ x, y: 1.4, z: z + 1.08, sx: 1.2, sy: 1.2, sz: 0.1, color: YELLOW });
    batches.cylinders.push({ x: x + 1.0, y: 0.006, z: z + 0.6, sx: 3.6, sy: 0.012, sz: 3.6, color: SHADOW_TONE });
  }
}

/** Pavement terraces (awning + tables) on the street face of some ordinary blocks. */
function buildTerraces(definition: CityDefinition, rng: Rng, batches: Batches): void {
  const landmarkIds = new Set(definition.landmarks.map((landmark) => landmark.id));
  for (const blocker of definition.blockers) {
    if (landmarkIds.has(blocker.id) || blocker.id.startsWith('river')) continue;
    if (width(blocker) < 8 || rng.next() > 0.45) continue;
    const x0 = blocker.minX + 1.5 + rng.next() * Math.max(0, width(blocker) - 9);
    const z = blocker.maxZ + 1.1;
    const ok = [x0, x0 + 6].every((x) => {
      if (definition.roads.some((road) => contains(grow(road, 0.5), x, z))) return false;
      if (definition.sockets.some((socket) => Math.hypot(socket.position[0] - x, socket.position[2] - z) < SOCKET_CLEAR_RADIUS)) return false;
      return Math.hypot(definition.spawn[0] - x, definition.spawn[2] - z) >= SOCKET_CLEAR_RADIUS;
    });
    if (!ok) continue;
    const awning = rng.pick(AWNING_TONES);
    for (let x = x0; x < x0 + 6; x += 1) {
      batches.boxes.push({ x: x + 0.5, y: 3.1, z: blocker.maxZ + 0.9, sx: 1, sy: 0.14, sz: 1.8, rx: 0.3, color: Math.round(x - x0) % 2 === 0 ? awning : CREAM });
    }
    for (let x = x0 + 1.2; x < x0 + 6; x += 2.4) {
      batches.cylinders.push({ x, y: 0.45, z, sx: 0.16, sy: 0.9, sz: 0.16, color: INK });
      batches.cylinders.push({ x, y: 0.95, z, sx: 1.1, sy: 0.1, sz: 1.1, color: TABLE_TONE });
      batches.boxes.push({ x: x - 0.85, y: 0.5, z, sx: 0.45, sy: 0.1, sz: 0.45, color: INK });
      batches.boxes.push({ x: x + 0.85, y: 0.5, z, sx: 0.45, sy: 0.1, sz: 0.45, color: INK });
    }
  }
}

function buildRiver(segments: readonly Blocker[], bridges: readonly RectXZ[], quality: Quality, batches: Batches): void {
  for (const segment of segments) {
    batches.flats.push(flatItem(segment, 0.03, WATER_TONE));
    batches.flats.push(flatItem({ ...segment, minX: segment.minX + 2, maxX: segment.minX + 2.5 }, 0.032, '#7fdcf2'));
    // Quays: a lower stone walkway inside the river blocker, a parapet wall at street level, bollards.
    for (const side of [-1, 1] as const) {
      const walk: RectXZ = side < 0 ? { ...segment, maxX: segment.minX + 2 } : { ...segment, minX: segment.maxX - 2 };
      const wall: RectXZ = side < 0 ? { ...segment, maxX: segment.minX + 0.6 } : { ...segment, minX: segment.maxX - 0.6 };
      batches.boxes.push(boxItem(walk, 0, 0.3, QUAY_TONE));
      batches.boxes.push(boxItem(wall, 0, 0.9, BRIDGE_TONE));
      if (quality === 'low') continue;
      const x = side < 0 ? segment.minX + 1.4 : segment.maxX - 1.4;
      for (let z = segment.minZ + 3; z < segment.maxZ - 2; z += 6) {
        batches.cylinders.push({ x, y: 0.6, z, sx: 0.4, sy: 0.6, sz: 0.4, color: IRON_TONE });
      }
      for (let z = segment.minZ + 6; z < segment.maxZ - 4; z += 12) {
        const leaf = PLANE_LEAF_TONES[Math.round(z / 12) % PLANE_LEAF_TONES.length]!;
        batches.cylinders.push({ x, y: 1.5, z, sx: 0.45, sy: 3.0, sz: 0.45, color: PLANE_TRUNK_TONE });
        batches.spheres.push({ x, y: 3.9, z, sx: 2.2, sy: 1.4, sz: 2.2, color: leaf });
      }
    }
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
const EIFFEL_PLATFORM_2 = 23;
const EIFFEL_SHAFT_TOP = 40;
const CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

function buildEiffel(landmark: Landmark, quality: Quality, batches: Batches): void {
  const { boxes } = batches;
  const [cx, cz] = landmark.center;
  batches.flats.push(flatItem(shadowOf(grow(landmark.footprint, -1)), 0.009, SHADOW_TONE));
  batches.frustums.push({
    x: cx,
    y: (EIFFEL_PLATFORM_2 + EIFFEL_SHAFT_TOP) / 2,
    z: cz,
    sx: 2.4,
    sy: EIFFEL_SHAFT_TOP - EIFFEL_PLATFORM_2,
    sz: 2.4,
    color: IRON_TONE,
  });
  const half = Math.min(width(landmark.footprint), depth(landmark.footprint)) / 2;
  const legSpread = half - 0.6;
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
    // Lattice X-bracing on the upper shaft so the silhouette reads as ironwork, not a post.
    for (let y = EIFFEL_PLATFORM_2 + 1; y < EIFFEL_SHAFT_TOP - 3; y += 4) {
      const t0 = (y - EIFFEL_PLATFORM_2) / (EIFFEL_SHAFT_TOP - EIFFEL_PLATFORM_2);
      const t1 = (y + 4 - EIFFEL_PLATFORM_2) / (EIFFEL_SHAFT_TOP - EIFFEL_PLATFORM_2);
      const r0 = 1.3 - 0.55 * t0;
      const r1 = 1.3 - 0.55 * t1;
      for (const [sx, sz] of CORNERS) {
        boxes.push(strutItem(at(sx * r0, y, sz * r0), at(-sx * r1, y + 4, sz * r1), 0.22, IRON_TONE));
      }
    }
    box(0, EIFFEL_PLATFORM_1 + 9, 0, 4.4, 0.6, 4.4);
  }
  box(0, EIFFEL_PLATFORM_1, 0, 7.2, 1.1, 7.2);
  box(0, EIFFEL_PLATFORM_2, 0, 3.8, 0.9, 3.8);
  box(0, EIFFEL_SHAFT_TOP + 0.4, 0, 2.6, 0.8, 2.6);
  box(0, EIFFEL_SHAFT_TOP + 1.4, 0, 1.4, 1.2, 1.4);
  box(0, EIFFEL_SHAFT_TOP + 4.0, 0, 0.4, 4.4, 0.4);
  boxes.push({ x: cx, y: EIFFEL_SHAFT_TOP + 6.5, z: cz, sx: 1.0, sy: 1.0, sz: 1.0, color: YELLOW });
}

const PYRAMID_BASE = 7;
const PYRAMID_HEIGHT = 5.6;

function pyramidCenter(landmark: Landmark): readonly [number, number] {
  return [centerX(landmark.footprint), landmark.footprint.maxZ - 6];
}

function buildLouvreCourtyard(landmark: Landmark, quality: Quality, batches: Batches): void {
  const [px, pz] = pyramidCenter(landmark);
  batches.flats.push(flatItem(grow(landmark.footprint, 6), 0.012, PLAZA_TONE));
  batches.flats.push(flatItem({ minX: px - 8, maxX: px + 8, minZ: pz - 6, maxZ: pz + 7 }, 0.014, COURTYARD_TONE));
  batches.boxes.push({ x: px, y: 0.1, z: pz, sx: PYRAMID_BASE + 1.2, sy: 0.2, sz: PYRAMID_BASE + 1.2, color: LAVENDER });
  batches.cones.push({ x: px, y: PYRAMID_HEIGHT / 2, z: pz, sx: PYRAMID_BASE, sy: PYRAMID_HEIGHT, sz: PYRAMID_BASE, color: PYRAMID_TONE });
  batches.flats.push(flatItem(shadowOf({ minX: px - 3, maxX: px + 3, minZ: pz - 3, maxZ: pz + 3 }), 0.013, SHADOW_TONE));
  // Three small satellite pyramids and a reflecting-pool strip, as in the Cour Napoléon.
  for (const [sx, sz] of [[-1, 0], [1, 0], [0, 1]] as const) {
    batches.cones.push({ x: px + sx * 6, y: 0.9, z: pz + sz * 5.5, sx: 1.8, sy: 1.8, sz: 1.8, color: PYRAMID_TONE });
  }
  batches.flats.push(flatItem({ minX: px - 5, maxX: px + 5, minZ: pz + 4.4, maxZ: pz + 5.6 }, 0.016, CYAN));
  if (quality === 'low') return;
  // Cyan ridge lines make the pyramid read as glass at distance without a second material.
  const half = PYRAMID_BASE / 2;
  const apex: Vec3 = [px, PYRAMID_HEIGHT, pz];
  for (const [sx, sz] of CORNERS) {
    batches.boxes.push(strutItem([px + sx * half, 0, pz + sz * half], apex, 0.28, IRON_TONE));
  }
  batches.boxes.push({ x: px, y: 0.3, z: pz, sx: PYRAMID_BASE + 0.3, sy: 0.3, sz: PYRAMID_BASE + 0.3, color: IRON_TONE });
}

/**
 * Louvre massing: a U of long low wings around the courtyard, a taller central pavilion with a
 * dome on the north wing, square corner pavilions with steep roofs, and a pilaster rhythm inside.
 */
function buildLouvreWings(footprint: RectXZ, quality: Quality, batches: Batches): void {
  const wing = 3.6;
  const wingHeight = 6;
  const pavilion = 4.6;
  const north: RectXZ = { minX: footprint.minX, maxX: footprint.maxX, minZ: footprint.minZ, maxZ: footprint.minZ + wing };
  const west: RectXZ = { minX: footprint.minX, maxX: footprint.minX + wing, minZ: footprint.minZ + wing, maxZ: footprint.maxZ };
  const east: RectXZ = { minX: footprint.maxX - wing, maxX: footprint.maxX, minZ: footprint.minZ + wing, maxZ: footprint.maxZ };
  for (const rect of [north, west, east]) {
    batches.boxes.push(boxItem(rect, 0, wingHeight, LOUVRE_STONE));
    batches.frustums.push(boxItem(grow(rect, 0.3), wingHeight, 1.8, LOUVRE_ROOF));
    batches.flats.push(flatItem(shadowOf(rect), 0.011, SHADOW_TONE));
  }
  const corners: RectXZ[] = [
    { minX: footprint.minX, maxX: footprint.minX + pavilion, minZ: footprint.minZ, maxZ: footprint.minZ + pavilion },
    { minX: footprint.maxX - pavilion, maxX: footprint.maxX, minZ: footprint.minZ, maxZ: footprint.minZ + pavilion },
    { minX: footprint.minX, maxX: footprint.minX + pavilion, minZ: footprint.maxZ - pavilion, maxZ: footprint.maxZ },
    { minX: footprint.maxX - pavilion, maxX: footprint.maxX, minZ: footprint.maxZ - pavilion, maxZ: footprint.maxZ },
  ];
  for (const rect of corners) {
    batches.boxes.push(boxItem(rect, 0, wingHeight + 1.6, LOUVRE_STONE));
    batches.frustums.push(boxItem(grow(rect, 0.3), wingHeight + 1.6, 2.6, LOUVRE_ROOF));
    batches.boxes.push({ x: centerX(rect), y: wingHeight + 4.5, z: centerZ(rect), sx: 1.4, sy: 0.6, sz: 1.4, color: LOUVRE_ROOF });
  }
  const cx = centerX(footprint);
  const central: RectXZ = { minX: cx - 3.4, maxX: cx + 3.4, minZ: footprint.minZ - 0.4, maxZ: footprint.minZ + wing + 1.2 };
  batches.boxes.push(boxItem(central, 0, wingHeight + 2.4, LOUVRE_STONE));
  batches.frustums.push(boxItem(grow(central, 0.3), wingHeight + 2.4, 1.6, LOUVRE_ROOF));
  batches.spheres.push({ x: cx, y: wingHeight + 4.4, z: centerZ(central), sx: 2.4, sy: 1.8, sz: 2.4, color: LOUVRE_ROOF });
  batches.boxes.push({ x: cx, y: wingHeight + 6.6, z: centerZ(central), sx: 0.3, sy: 1.4, sz: 0.3, color: YELLOW });
  if (quality === 'low') return;
  for (const rect of [north, west, east, ...corners, central]) {
    batches.boxes.push(boxItem(grow(rect, 0.1), 0, 1.0, PLINTH_TONE));
    batches.boxes.push(boxItem(grow(rect, 0.35), wingHeight - 0.5, 0.5, TRIM_TONE));
  }
  // Pilasters and tall arched windows on the courtyard faces.
  for (let x = north.minX + pavilion + 1; x < north.maxX - pavilion; x += 2.2) {
    batches.boxes.push({ x, y: wingHeight / 2, z: north.maxZ + 0.12, sx: 0.4, sy: wingHeight, sz: 0.24, color: TRIM_TONE });
    batches.boxes.push({ x: x + 1.1, y: 3.2, z: north.maxZ + 0.05, sx: 0.9, sy: 3.2, sz: 0.1, color: WINDOW_TONE });
  }
  for (let z = west.minZ + 1; z < footprint.maxZ - pavilion; z += 2.2) {
    batches.boxes.push({ x: west.maxX + 0.12, y: wingHeight / 2, z, sx: 0.24, sy: wingHeight, sz: 0.4, color: TRIM_TONE });
    batches.boxes.push({ x: east.minX - 0.12, y: wingHeight / 2, z, sx: 0.24, sy: wingHeight, sz: 0.4, color: TRIM_TONE });
    batches.boxes.push({ x: west.maxX + 0.05, y: 3.2, z: z + 1.1, sx: 0.1, sy: 3.2, sz: 0.9, color: WINDOW_TONE });
    batches.boxes.push({ x: east.minX - 0.05, y: 3.2, z: z + 1.1, sx: 0.1, sy: 3.2, sz: 0.9, color: WINDOW_TONE });
  }
  for (let x = footprint.minX + 1.5; x < footprint.maxX - 1; x += 2.6) {
    batches.boxes.push({ x, y: 3.4, z: footprint.minZ - 0.05, sx: 1.0, sy: 2.6, sz: 0.1, color: WINDOW_TONE });
  }
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
      color: index % 2 === 0 ? HOT_PINK : CREAM,
    });
  }
  batches.boxes.push({ x: centerX(footprint), y: 4.6, z: frontZ + 0.15, sx: width(footprint) * 0.7, sy: 1.0, sz: 0.3, color: INK });
  batches.boxes.push({ x: centerX(footprint), y: 4.6, z: frontZ + 0.32, sx: width(footprint) * 0.5, sy: 0.5, sz: 0.1, color: YELLOW });
  if (quality === 'low') return;
  // Terrace: table + two chairs + parasol, all inside the blocker's 2-unit apron (never on a route).
  let parasol = 0;
  for (let x = footprint.minX + 1.6; x < footprint.maxX - 1; x += 3.2) {
    const z = frontZ + 1;
    batches.cylinders.push({ x, y: 0.45, z, sx: 0.18, sy: 0.9, sz: 0.18, color: LAMP_POST_TONE });
    batches.cylinders.push({ x, y: 0.95, z, sx: 1.3, sy: 0.12, sz: 1.3, color: TABLE_TONE });
    for (const side of [-1, 1] as const) {
      batches.boxes.push({ x: x + side * 1.0, y: 0.5, z, sx: 0.5, sy: 0.12, sz: 0.5, color: INK });
      batches.boxes.push({ x: x + side * 1.2, y: 0.85, z, sx: 0.1, sy: 0.8, sz: 0.5, color: INK });
    }
    if (parasol % 2 === 1) {
      batches.cylinders.push({ x, y: 1.6, z, sx: 0.12, sy: 1.4, sz: 0.12, color: LAMP_POST_TONE });
      batches.cones.push({ x, y: 2.45, z, sx: 2.6, sy: 0.7, sz: 2.6, color: AWNING_TONES[parasol % AWNING_TONES.length]! });
    }
    parasol += 1;
  }
}

/** Low blocks just outside the playable bounds: a soft lavender skyline for background depth. */
function buildBackdrop(bounds: RectXZ, rng: Rng, quality: Quality, batches: Batches): void {
  const step = quality === 'low' ? 16 : 9;
  const ring = grow(bounds, 9);
  const push = (x: number, z: number, tall: boolean) => {
    const w = 5 + rng.next() * 5;
    const h = tall ? 4 + rng.next() * 9 : 2 + rng.next() * 3;
    const color = rng.pick(BACKDROP_TONES);
    batches.boxes.push({ x, y: h / 2, z, sx: w, sy: h, sz: w, color });
    if (quality !== 'low') batches.frustums.push({ x, y: h + 0.8, z, sx: w + 0.4, sy: 1.6, sz: w + 0.4, color: '#8f7cc4' });
  };
  for (let x = ring.minX; x <= ring.maxX; x += step) {
    push(x + (rng.next() - 0.5) * 3, ring.minZ - rng.next() * 4, true);
    // The camera sits at +Z, so the south ring is foreground: keep it low so it frames, not hides.
    push(x + (rng.next() - 0.5) * 3, ring.maxZ + rng.next() * 4, false);
  }
  for (let z = ring.minZ + step; z < ring.maxZ; z += step) {
    push(ring.minX - rng.next() * 4, z + (rng.next() - 0.5) * 3, true);
    push(ring.maxX + rng.next() * 4, z + (rng.next() - 0.5) * 3, true);
  }
  batches.flats.push(flatItem(grow(bounds, 40), -0.02, '#d9cff2'));
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function ParisScene({ definition, seed, quality }: CitySceneProps) {
  const { bounds, roads, blockers, landmarks, sockets } = definition;

  const layout = useMemo(() => {
    const rng = createRng(hashSeed('paris-cosmetic', seed));
    const batches: Batches = { boxes: [], cylinders: [], spheres: [], cones: [], frustums: [], flats: [] };
    const landmarkIds = new Set(landmarks.map((landmark) => landmark.id));
    const riverSegments = blockers.filter((blocker) => blocker.id.startsWith('river'));
    const facadeBlocks = blockers.filter((blocker) => !landmarkIds.has(blocker.id) && !blocker.id.startsWith('river'));

    batches.flats.push(flatItem(bounds, 0, definition.groundColor));
    if (quality !== 'low') {
      for (const road of roads) {
        for (const strip of sidewalkStrips(road, 1.2)) batches.flats.push(flatItem(strip, 0.016, SIDEWALK_TONE));
      }
    }
    for (const road of roads) {
      batches.flats.push(flatItem(road, 0.02, ROAD_TONE));
      if (quality !== 'low') {
        const horizontal = width(road) >= depth(road);
        const line: RectXZ = horizontal
          ? { ...road, minZ: centerZ(road) - 0.25, maxZ: centerZ(road) + 0.25 }
          : { ...road, minX: centerX(road) - 0.25, maxX: centerX(road) + 0.25 };
        batches.flats.push(flatItem(line, 0.022, ROAD_LINE_TONE));
      }
    }

    const segments: FacadeSegment[] = facadeBlocks.flatMap((blocker) => splitBlock(blocker, rng));
    for (const landmark of landmarks) {
      const { footprint } = landmark;
      if (landmark.silhouette === 'tower') {
        batches.flats.push(flatItem(grow(footprint, 7), 0.012, PLAZA_TONE));
        batches.flats.push(flatItem(grow(footprint, 1), 0.014, COURTYARD_TONE));
        buildEiffel(landmark, quality, batches);
      } else if (landmark.silhouette === 'museum') {
        buildLouvreWings(footprint, quality, batches);
        buildLouvreCourtyard(landmark, quality, batches);
      } else if (landmark.silhouette === 'cafe') {
        const body: RectXZ = { ...footprint, maxZ: footprint.maxZ - 2 };
        segments.push({ rect: body, height: 5.4, stone: CAFE_TONE, roof: ROOF_TONES[2], style: 'mansard', outer: body });
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
    buildRiver(riverSegments, bridges, quality, batches);
    buildFacades(segments, rng, quality, batches);
    buildProps(definition, rng, quality, batches);
    buildBackdrop(bounds, rng, quality, batches);

    for (const socket of sockets) {
      const [x, , z] = socket.position;
      // Socket pad: lavender apron, yellow ring, cream centre — three stacked discs, one batch.
      batches.cylinders.push({ x, y: 0.03, z, sx: 5.2, sy: 0.06, sz: 5.2, color: SOCKET_DISC_TONE });
      batches.cylinders.push({ x, y: 0.08, z, sx: 4.4, sy: 0.04, sz: 4.4, color: SOCKET_PAD_TONE });
      batches.cylinders.push({ x, y: 0.11, z, sx: 3.2, sy: 0.02, sz: 3.2, color: CREAM });
    }

    for (const batch of Object.values(batches)) batch.sort(byTopDescending);
    return batches;
  }, [definition, seed, quality, bounds, blockers, landmarks, roads, sockets]);

  return (
    <group>
      <Instances geometry={UNIT_PLANE} items={layout.flats} />
      <Instances geometry={UNIT_BOX} items={layout.boxes} />
      <Instances geometry={FRUSTUM} items={layout.frustums} />
      <Instances geometry={SQUARE_CONE} items={layout.cones} />
      <Instances geometry={UNIT_CYLINDER} items={layout.cylinders} />
      <Instances geometry={UNIT_SPHERE} items={layout.spheres} />
    </group>
  );
}
