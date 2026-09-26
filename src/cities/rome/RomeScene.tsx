/**
 * Rome scenery. Owner: A8. Scenery only — no rules, pickups, players, timers or camera work.
 *
 * Everything is derived from `definition`: the `colosseum`, `fountain` and `trattoria` blockers
 * become landmarks, `insula-*` become terracotta-roofed houses, `forum-ruin` a field of broken
 * columns and `cypress-row` a line of cypresses. Roads become cobbled lanes and sockets get a
 * pavement pad. Cosmetic variation uses a seeded RNG and never moves a blocker or props into a
 * socket's clear zone. Walk-through decoration (trees, tables, lamps) is only ever placed
 * outside blockers, so nothing solid exists beyond what the definition declares.
 *
 * Render budget: a handful of InstancedMesh draws (one per shared geometry) plus two single
 * meshes for the Colosseum's partial upper wall, all vertex-lit Lambert, no transparency.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Material,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
} from 'three';
import type { CitySceneProps } from '@/cities/CityScenery';
import type { Blocker, CityDefinition, Landmark, Quality, RectXZ } from '@/shared/contracts';
import { createRng, hashSeed } from '@/shared/seed';
import type { Rng } from '@/shared/seed';

// ---------------------------------------------------------------------------
// Shared geometry and materials (module singletons: one allocation per page load)
// ---------------------------------------------------------------------------

const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 8);
const UNIT_SPHERE = new SphereGeometry(1, 7, 5);
const UNIT_CONE = new ConeGeometry(0.5, 1, 7);
const HIP_ROOF = new ConeGeometry(Math.SQRT1_2, 1, 4);
const UNIT_PLANE = new PlaneGeometry(1, 1);
const SOCKET_RING = new RingGeometry(1.7, 2.3, 20);
/** Open-ended thin shell used for the Colosseum tiers and the fountain basins. */
const SHELL = new CylinderGeometry(0.5, 0.5, 1, 40, 1, true);
/** Flat annulus for Colosseum tier floors (inner radius is 60% of the outer). */
const TIER_FLOOR = new RingGeometry(0.3, 0.5, 40);
/** Broken upper wall: about 55% of the circumference survives. */
const ATTIC_SWEEP = Math.PI * 1.1;
const ATTIC_SHELL = new CylinderGeometry(0.5, 0.5, 1, 24, 1, true, 0, ATTIC_SWEEP);
const ATTIC_FLOOR = new RingGeometry(0.42, 0.5, 24, 1, 0, ATTIC_SWEEP);

const WHITE = new MeshLambertMaterial({ color: '#ffffff' });
const WHITE_DOUBLE = new MeshLambertMaterial({ color: '#ffffff', side: DoubleSide });
const TRAVERTINE_MATERIAL = new MeshLambertMaterial({ color: '#e9d4ad', side: DoubleSide });

const GROUND_TONE = '#d9c4a3';
const COBBLE_TONE = '#b7a88d';
const KERB_TONE = '#e6d8bd';
const PIAZZA_TONE = '#e5d2b0';
const TRAVERTINE = '#e9d4ad';
const TRAVERTINE_DARK = '#cdb489';
const TRAVERTINE_LIGHT = '#f6e7c8';
const ARCH_SHADOW = '#6b4a3a';
const ARENA_SAND = '#e6c690';
const SOCKET_PAD_TONE = '#fff5e9';
const SOCKET_DISC_TONE = '#cdb489';
const PLASTER_TONES = ['#e8a35c', '#d97f4a', '#f0bd7c', '#c9683f', '#f2d19b', '#e08c5a'] as const;
const ROOF_TONES = ['#b8512f', '#c25f38', '#a8492a', '#cf6a3e'] as const;
const SHUTTER_TONE = '#3f6b4f';
const WINDOW_TONE = '#3a2a3f';
const TRIM_TONE = '#f9ecd6';
const CYPRESS_TONES = ['#2f5d3a', '#3a6d44', '#274f32'] as const;
const PINE_TONES = ['#5f8f4d', '#6f9e57'] as const;
const TRUNK_TONE = '#6d4b30';
const LAMP_POST_TONE = '#2b2530';
const LAMP_GLOW_TONE = '#ffd963';
const UMBRELLA_TONES = ['#f43fab', '#ffd963', '#22c4ea'] as const;
const TABLE_TONE = '#fff5e9';
const WATER_TONE = '#22c4ea';
const WATER_DEEP = '#1a9fc4';
const BRONZE_TONE = '#5b6b4a';
const AWNING_GREEN = '#3f8f5a';
const AWNING_WHITE = '#fff5e9';

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
  readonly rz?: number;
  readonly color: string;
}

interface InstancesProps {
  readonly geometry: BufferGeometry;
  readonly items: readonly InstanceItem[];
  readonly material?: Material;
}

const scratchObject = new Object3D();
const scratchColor = new Color();

function Instances({ geometry, items, material = WHITE }: InstancesProps) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, index) => {
      scratchObject.position.set(item.x, item.y, item.z);
      scratchObject.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0);
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
      args={[geometry, material, items.length]}
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
  return { x: centerX(rect), y: y0 + height / 2, z: centerZ(rect), sx: width(rect), sy: height, sz: depth(rect), color };
}

function flatItem(rect: RectXZ, y: number, color: string): InstanceItem {
  return { x: centerX(rect), y, z: centerZ(rect), sx: width(rect), sy: depth(rect), sz: 1, rx: FLAT, color };
}

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

/** Draw the highest items first so the depth test rejects what lies underneath. */
function top(item: InstanceItem): number {
  return item.rx === undefined && item.rz === undefined ? item.y + item.sy / 2 : item.y;
}
function byTopDescending(a: InstanceItem, b: InstanceItem): number {
  return top(b) - top(a);
}

interface Batches {
  readonly boxes: InstanceItem[];
  readonly cylinders: InstanceItem[];
  readonly spheres: InstanceItem[];
  readonly cones: InstanceItem[];
  readonly roofs: InstanceItem[];
  readonly flats: InstanceItem[];
  readonly rings: InstanceItem[];
  readonly shells: InstanceItem[];
  readonly tierFloors: InstanceItem[];
}

// ---------------------------------------------------------------------------
// Houses (insulae) and the trattoria
// ---------------------------------------------------------------------------

interface House {
  readonly rect: RectXZ;
  readonly height: number;
  readonly plaster: string;
  readonly roof: string;
  readonly outer: RectXZ;
}

/** Splits a blocker into a terrace of narrow houses of varying height, never leaving the rect. */
function splitBlock(blocker: RectXZ, rng: Rng): House[] {
  const alongX = width(blocker) >= depth(blocker);
  const length = alongX ? width(blocker) : depth(blocker);
  const count = Math.max(2, Math.min(4, Math.round(length / 5) - rng.int(2)));
  const houses: House[] = [];
  let cursor = 0;
  for (let index = 0; index < count; index += 1) {
    const remaining = count - index;
    const share = (length - cursor) / remaining + (rng.next() - 0.5) * 2;
    const start = cursor;
    const end = index === count - 1 ? length : Math.min(length - (remaining - 1) * 3, start + Math.max(3, share));
    cursor = end;
    const rect: RectXZ = alongX
      ? { minX: blocker.minX + start, maxX: blocker.minX + end, minZ: blocker.minZ, maxZ: blocker.maxZ }
      : { minX: blocker.minX, maxX: blocker.maxX, minZ: blocker.minZ + start, maxZ: blocker.minZ + end };
    houses.push({ rect, height: 6 + rng.int(4), plaster: rng.pick(PLASTER_TONES), roof: rng.pick(ROOF_TONES), outer: blocker });
  }
  return houses;
}

function buildHouses(houses: readonly House[], rng: Rng, quality: Quality, batches: Batches): void {
  for (const house of houses) {
    const { rect, height, plaster, roof, outer } = house;
    batches.boxes.push(boxItem(rect, 0, height, plaster));
    // Pantile roof: shallow hipped pyramid slightly overhanging the walls, plus a ridge cap.
    const eaves = grow(rect, 0.5);
    batches.roofs.push({
      x: centerX(eaves),
      y: height + 1.1,
      z: centerZ(eaves),
      sx: width(eaves),
      sy: 2.2,
      sz: depth(eaves),
      ry: Math.PI / 4,
      color: roof,
    });
    batches.boxes.push(boxItem(eaves, height - 0.3, 0.35, TRIM_TONE));
    if (quality === 'low') continue;

    // Ground-floor arches on the +Z face (the chase camera looks toward -Z, so +Z faces are seen).
    const frontZ = rect.maxZ + 0.06;
    if (rect.maxZ >= outer.maxZ - 0.01) {
      for (let x = rect.minX + 1.6; x <= rect.maxX - 1.6; x += 3.2) {
        batches.boxes.push({ x, y: 1.3, z: frontZ, sx: 1.6, sy: 2.6, sz: 0.12, color: ARCH_SHADOW });
        batches.cylinders.push({ x, y: 2.6, z: frontZ, sx: 1.6, sy: 0.12, sz: 1.6, rx: Math.PI / 2, color: ARCH_SHADOW });
      }
    }
    // Windows with shutters on upper floors, on every outer face except -Z.
    for (let y = 4.4; y <= height - 1.2; y += 2.8) {
      if (rect.maxZ >= outer.maxZ - 0.01) {
        for (let x = rect.minX + 1.6; x <= rect.maxX - 1.6; x += 3.2) {
          batches.boxes.push({ x, y, z: frontZ, sx: 1.0, sy: 1.5, sz: 0.1, color: WINDOW_TONE });
          batches.boxes.push({ x: x - 0.75, y, z: frontZ, sx: 0.4, sy: 1.5, sz: 0.14, color: SHUTTER_TONE });
          batches.boxes.push({ x: x + 0.75, y, z: frontZ, sx: 0.4, sy: 1.5, sz: 0.14, color: SHUTTER_TONE });
        }
      }
      for (const side of [-1, 1] as const) {
        const onOuter = side < 0 ? rect.minX <= outer.minX + 0.01 : rect.maxX >= outer.maxX - 0.01;
        if (!onOuter) continue;
        const x = side < 0 ? rect.minX - 0.06 : rect.maxX + 0.06;
        for (let z = rect.minZ + 1.6; z <= rect.maxZ - 1.6; z += 3.2) {
          batches.boxes.push({ x, y, z, sx: 0.1, sy: 1.5, sz: 1.0, color: WINDOW_TONE });
          batches.boxes.push({ x, y, z: z - 0.75, sx: 0.14, sy: 1.5, sz: 0.4, color: SHUTTER_TONE });
          batches.boxes.push({ x, y, z: z + 0.75, sx: 0.14, sy: 1.5, sz: 0.4, color: SHUTTER_TONE });
        }
      }
    }
    if (rng.next() < 0.6) {
      batches.boxes.push({
        x: rect.minX + 1 + rng.next() * Math.max(0.1, width(rect) - 2),
        y: height + 2.3,
        z: rect.minZ + 1 + rng.next() * Math.max(0.1, depth(rect) - 2),
        sx: 0.7,
        sy: 1.2,
        sz: 0.7,
        color: TRAVERTINE_DARK,
      });
    }
  }
}

function buildTrattoria(landmark: Landmark, quality: Quality, batches: Batches): void {
  const { footprint } = landmark;
  const height = 6.5;
  batches.flats.push(flatItem(grow(footprint, 6), 0.012, PIAZZA_TONE));
  batches.boxes.push(boxItem(footprint, 0, height, PLASTER_TONES[4]));
  const eaves = grow(footprint, 0.5);
  batches.roofs.push({ x: centerX(eaves), y: height + 1.2, z: centerZ(eaves), sx: width(eaves), sy: 2.4, sz: depth(eaves), ry: Math.PI / 4, color: ROOF_TONES[1] });
  batches.boxes.push(boxItem(eaves, height - 0.3, 0.35, TRIM_TONE));

  // Striped awning along the +Z front, hanging just off the facade.
  const frontZ = footprint.maxZ;
  const stripe = quality === 'low' ? 2 : 1;
  for (let x = footprint.minX; x < footprint.maxX - 0.01; x += stripe) {
    const index = Math.round((x - footprint.minX) / stripe);
    batches.boxes.push({ x: x + stripe / 2, y: 3.4, z: frontZ + 1.1, sx: stripe, sy: 0.14, sz: 2.2, rx: 0.3, color: index % 2 === 0 ? AWNING_GREEN : AWNING_WHITE });
  }
  for (let x = footprint.minX + 1.5; x <= footprint.maxX - 1.5; x += 3) {
    batches.boxes.push({ x, y: 1.4, z: frontZ + 0.06, sx: 1.6, sy: 2.8, sz: 0.12, color: ARCH_SHADOW });
    batches.cylinders.push({ x, y: 2.8, z: frontZ + 0.06, sx: 1.6, sy: 0.12, sz: 1.6, rx: Math.PI / 2, color: ARCH_SHADOW });
  }
  batches.boxes.push({ x: centerX(footprint), y: 4.9, z: frontZ + 0.2, sx: width(footprint) * 0.55, sy: 0.9, sz: 0.3, color: ROOF_TONES[0] });
  if (quality === 'low') return;

  // Cafe tables under umbrellas on the terrace in front (walk-through decoration).
  for (let x = footprint.minX + 2; x < footprint.maxX - 1; x += 4.2) {
    const z = frontZ + 3.4;
    const tone = UMBRELLA_TONES[Math.round((x - footprint.minX) / 4.2) % UMBRELLA_TONES.length]!;
    batches.cylinders.push({ x, y: 0.45, z, sx: 0.16, sy: 0.9, sz: 0.16, color: LAMP_POST_TONE });
    batches.cylinders.push({ x, y: 0.95, z, sx: 1.4, sy: 0.12, sz: 1.4, color: TABLE_TONE });
    batches.cylinders.push({ x, y: 1.9, z, sx: 0.1, sy: 2.0, sz: 0.1, color: LAMP_POST_TONE });
    batches.cones.push({ x, y: 3.2, z, sx: 3.2, sy: 0.9, sz: 3.2, color: tone });
    for (const [dx, dz] of [[-0.9, 0.5], [0.9, 0.5]] as const) {
      batches.boxes.push({ x: x + dx, y: 0.5, z: z + dz, sx: 0.5, sy: 0.9, sz: 0.5, color: TRUNK_TONE });
    }
  }
}

// ---------------------------------------------------------------------------
// Colosseum
// ---------------------------------------------------------------------------

const TIER_HEIGHT = 5;
const TIER_COUNT = 3;
const ATTIC_HEIGHT = 3.6;
const PILLAR_COUNT = 30;

function buildColosseum(landmark: Landmark, quality: Quality, batches: Batches): void {
  const { footprint } = landmark;
  const cx = centerX(footprint);
  const cz = centerZ(footprint);
  // Oval kept strictly inside the collision rectangle; the rectangle itself is a stone plinth.
  const rx = width(footprint) / 2 - 0.6;
  const rz = depth(footprint) / 2 - 2.4;
  const plinthHeight = 0.7;

  batches.flats.push(flatItem(grow(footprint, 8), 0.012, PIAZZA_TONE));
  batches.boxes.push(boxItem(footprint, 0, plinthHeight, TRAVERTINE_DARK));
  batches.boxes.push(boxItem(grow(footprint, 0.6), 0, 0.3, TRAVERTINE_LIGHT));

  // Arena floor and low inner wall.
  batches.cylinders.push({ x: cx, y: plinthHeight + 0.15, z: cz, sx: rx * 1.25, sy: 0.3, sz: rz * 1.25, color: ARENA_SAND });
  batches.shells.push({ x: cx, y: plinthHeight + 1.4, z: cz, sx: rx * 1.25, sy: 2.8, sz: rz * 1.25, color: TRAVERTINE_DARK });

  for (let tier = 0; tier < TIER_COUNT; tier += 1) {
    const y0 = plinthHeight + tier * TIER_HEIGHT;
    const inset = tier * 0.7;
    const tx = rx - inset;
    const tz = rz - inset;
    // Tier floor (annulus) and the entablature band at the top of the tier.
    batches.tierFloors.push({ x: cx, y: y0 + 0.02, z: cz, sx: tx * 2, sy: tz * 2, sz: 1, rx: FLAT, color: tier % 2 === 0 ? TRAVERTINE : TRAVERTINE_LIGHT });
    batches.shells.push({ x: cx, y: y0 + TIER_HEIGHT - 0.5, z: cz, sx: tx * 2, sy: 1.0, sz: tz * 2, color: TRAVERTINE_LIGHT });
    // Back wall of the arcade, a little inside the pillars, so arches read as dark openings.
    batches.shells.push({ x: cx, y: y0 + TIER_HEIGHT / 2, z: cz, sx: tx * 2 - 2.2, sy: TIER_HEIGHT, sz: tz * 2 - 2.2, color: ARCH_SHADOW });
    const pillars = quality === 'low' ? PILLAR_COUNT / 2 : PILLAR_COUNT;
    for (let index = 0; index < pillars; index += 1) {
      const angle = (index / pillars) * Math.PI * 2;
      const px = cx + Math.cos(angle) * (tx - 0.55);
      const pz = cz + Math.sin(angle) * (tz - 0.55);
      batches.boxes.push({ x: px, y: y0 + (TIER_HEIGHT - 1) / 2, z: pz, sx: 1.1, sy: TIER_HEIGHT - 1, sz: 1.1, ry: -angle, color: tier === 1 ? TRAVERTINE_LIGHT : TRAVERTINE });
    }
  }

  // Broken attic: a partial fourth storey that survives only on one side.
  const atticY0 = plinthHeight + TIER_COUNT * TIER_HEIGHT;
  const ax = rx - TIER_COUNT * 0.7;
  const az = rz - TIER_COUNT * 0.7;
  batches.tierFloors.push({ x: cx, y: atticY0 + 0.02, z: cz, sx: ax * 2, sy: az * 2, sz: 1, rx: FLAT, color: TRAVERTINE_DARK });
  if (quality === 'low') return;
  // Rubble at the broken ends of the wall.
  for (const angle of [0.05, ATTIC_SWEEP - 0.05]) {
    const wx = cx + Math.cos(angle) * (ax - 0.5);
    const wz = cz - Math.sin(angle) * (az - 0.5);
    batches.boxes.push({ x: wx, y: atticY0 + 0.7, z: wz, sx: 1.6, sy: 1.4, sz: 1.6, ry: angle, color: TRAVERTINE_DARK });
  }
}

/** The Colosseum's partial fourth tier, drawn as two single meshes using theta-limited geometry. */
function ColosseumAttic({ landmark }: { readonly landmark: Landmark }) {
  const { footprint } = landmark;
  const cx = centerX(footprint);
  const cz = centerZ(footprint);
  const rx = width(footprint) / 2 - 0.6 - TIER_COUNT * 0.7;
  const rz = depth(footprint) / 2 - 2.4 - TIER_COUNT * 0.7;
  const y0 = 0.7 + TIER_COUNT * TIER_HEIGHT;
  // CylinderGeometry sweeps theta from +Z toward +X; RingGeometry sweeps from +X toward +Y (flattened to -Z).
  return (
    <group position={[cx, 0, cz]}>
      <mesh
        geometry={ATTIC_SHELL}
        material={TRAVERTINE_MATERIAL}
        position={[0, y0 + ATTIC_HEIGHT / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[rx * 2, ATTIC_HEIGHT, rz * 2]}
      />
      <mesh
        geometry={ATTIC_FLOOR}
        material={TRAVERTINE_MATERIAL}
        position={[0, y0 + ATTIC_HEIGHT + 0.02, 0]}
        rotation={[FLAT, 0, 0]}
        scale={[rx * 2, rz * 2, 1]}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Fountain, forum ruin, cypresses
// ---------------------------------------------------------------------------

function buildFountain(landmark: Landmark, quality: Quality, batches: Batches): void {
  const { footprint } = landmark;
  const cx = centerX(footprint);
  const cz = centerZ(footprint);
  const size = Math.min(width(footprint), depth(footprint));
  batches.flats.push(flatItem(grow(footprint, 7), 0.012, PIAZZA_TONE));

  // Low balustrade exactly on the collision rectangle, with corner posts.
  batches.boxes.push(boxItem(footprint, 0, 0.5, TRAVERTINE_DARK));
  for (const x of [footprint.minX + 0.35, footprint.maxX - 0.35]) {
    batches.boxes.push({ x, y: 0.55, z: cz, sx: 0.7, sy: 1.1, sz: depth(footprint), color: TRAVERTINE_LIGHT });
  }
  for (const z of [footprint.minZ + 0.35, footprint.maxZ - 0.35]) {
    batches.boxes.push({ x: cx, y: 0.55, z, sx: width(footprint), sy: 1.1, sz: 0.7, color: TRAVERTINE_LIGHT });
  }
  for (const x of [footprint.minX + 0.5, footprint.maxX - 0.5]) {
    for (const z of [footprint.minZ + 0.5, footprint.maxZ - 0.5]) {
      batches.boxes.push({ x, y: 0.9, z, sx: 1.2, sy: 1.8, sz: 1.2, color: TRAVERTINE_LIGHT });
      batches.spheres.push({ x, y: 2.1, z, sx: 0.5, sy: 0.5, sz: 0.5, color: TRAVERTINE_LIGHT });
    }
  }

  // Big basin with water, a baroque backdrop wall, and stacked upper basins.
  const basin = size * 0.8;
  batches.cylinders.push({ x: cx, y: 0.6, z: cz + 1, sx: basin, sy: 1.2, sz: basin * 0.8, color: TRAVERTINE });
  batches.cylinders.push({ x: cx, y: 1.15, z: cz + 1, sx: basin - 1.2, sy: 0.2, sz: basin * 0.8 - 1.2, color: WATER_TONE });
  const wallZ = footprint.minZ + 2.2;
  batches.boxes.push({ x: cx, y: 4.5, z: wallZ, sx: size * 0.75, sy: 9, sz: 2.4, color: TRAVERTINE });
  batches.boxes.push({ x: cx, y: 9.4, z: wallZ, sx: size * 0.5, sy: 1.0, sz: 2.8, color: TRAVERTINE_LIGHT });
  batches.boxes.push({ x: cx, y: 10.6, z: wallZ, sx: size * 0.22, sy: 1.6, sz: 2.0, color: TRAVERTINE_LIGHT });
  for (const dx of [-size * 0.28, -size * 0.12, size * 0.12, size * 0.28]) {
    batches.cylinders.push({ x: cx + dx, y: 4.4, z: wallZ + 1.5, sx: 1.0, sy: 8.8, sz: 1.0, color: TRAVERTINE_LIGHT });
    batches.boxes.push({ x: cx + dx, y: 8.9, z: wallZ + 1.5, sx: 1.3, sy: 0.5, sz: 1.3, color: TRAVERTINE_LIGHT });
  }
  batches.boxes.push({ x: cx, y: 4.2, z: wallZ + 1.4, sx: size * 0.2, sy: 5.6, sz: 0.8, color: ARCH_SHADOW });
  batches.cylinders.push({ x: cx, y: 7, z: wallZ + 1.4, sx: size * 0.2, sy: 0.8, sz: size * 0.2, rx: Math.PI / 2, color: ARCH_SHADOW });
  // Central figure on a rocky base, riding out of the arch.
  batches.boxes.push({ x: cx, y: 1.9, z: cz - 1, sx: 3.2, sy: 1.6, sz: 2.4, color: TRAVERTINE_DARK });
  batches.cylinders.push({ x: cx, y: 3.6, z: cz - 1, sx: 1.2, sy: 1.8, sz: 1.2, color: BRONZE_TONE });
  batches.spheres.push({ x: cx, y: 4.9, z: cz - 1, sx: 0.7, sy: 0.7, sz: 0.7, color: BRONZE_TONE });
  batches.cylinders.push({ x: cx, y: 2.9, z: cz + 1.2, sx: 3.4, sy: 0.4, sz: 3.4, color: TRAVERTINE_LIGHT });
  batches.cylinders.push({ x: cx, y: 3.1, z: cz + 1.2, sx: 2.6, sy: 0.16, sz: 2.6, color: WATER_DEEP });
  if (quality === 'low') return;
  // Little spouts of water as thin cyan columns.
  for (const dx of [-2.6, 2.6]) {
    batches.cylinders.push({ x: cx + dx, y: 2.0, z: cz + 1.5, sx: 0.3, sy: 1.6, sz: 0.3, color: WATER_TONE });
    batches.spheres.push({ x: cx + dx, y: 2.9, z: cz + 1.5, sx: 0.45, sy: 0.35, sz: 0.45, color: WATER_TONE });
  }
}

function buildForumRuin(blocker: Blocker, rng: Rng, quality: Quality, batches: Batches): void {
  batches.boxes.push(boxItem(blocker, 0, 0.6, TRAVERTINE_DARK));
  batches.boxes.push(boxItem(grow(blocker, -0.8), 0.6, 0.5, TRAVERTINE));
  const step = quality === 'low' ? 5 : 3.6;
  let index = 0;
  for (let x = blocker.minX + 2; x <= blocker.maxX - 2; x += step) {
    for (const z of [blocker.minZ + 2, blocker.maxZ - 2]) {
      index += 1;
      const roll = rng.next();
      const height = roll < 0.55 ? 8 + rng.next() * 1.5 : 1.5 + rng.next() * 4;
      batches.cylinders.push({ x, y: 1.1 + height / 2, z, sx: 1.2, sy: height, sz: 1.2, color: index % 3 === 0 ? TRAVERTINE_LIGHT : TRAVERTINE });
      batches.boxes.push({ x, y: 1.3, z, sx: 1.6, sy: 0.4, sz: 1.6, color: TRAVERTINE_DARK });
      if (height > 7) batches.boxes.push({ x, y: 1.1 + height + 0.3, z, sx: 1.7, sy: 0.6, sz: 1.7, color: TRAVERTINE_LIGHT });
    }
  }
  // A lintel across the two tallest columns nearest the west end, and a fallen drum in the middle.
  batches.boxes.push({ x: blocker.minX + 2 + step / 2, y: 10.6, z: blocker.minZ + 2, sx: step + 1.8, sy: 0.9, sz: 1.8, color: TRAVERTINE_LIGHT });
  batches.cylinders.push({ x: centerX(blocker), y: 1.7, z: centerZ(blocker), sx: 1.3, sy: 6, sz: 1.3, rz: Math.PI / 2, ry: 0.4, color: TRAVERTINE });
  batches.cylinders.push({ x: centerX(blocker) + 4, y: 1.7, z: centerZ(blocker) + 3, sx: 1.3, sy: 2.4, sz: 1.3, color: TRAVERTINE_DARK });
  if (quality === 'low') return;
  for (let i = 0; i < 6; i += 1) {
    batches.boxes.push({
      x: blocker.minX + 3 + rng.next() * (width(blocker) - 6),
      y: 1.5,
      z: blocker.minZ + 5 + rng.next() * (depth(blocker) - 10),
      sx: 0.8 + rng.next(),
      sy: 0.8,
      sz: 0.8 + rng.next(),
      ry: rng.next() * Math.PI,
      color: TRAVERTINE_DARK,
    });
  }
}

function cypress(x: number, z: number, height: number, tone: string, batches: Batches): void {
  batches.cylinders.push({ x, y: 0.5, z, sx: 0.5, sy: 1.0, sz: 0.5, color: TRUNK_TONE });
  batches.cones.push({ x, y: 1 + height / 2, z, sx: 2.2, sy: height, sz: 2.2, color: tone });
}

function buildCypressRow(blocker: Blocker, rng: Rng, batches: Batches): void {
  batches.boxes.push(boxItem(blocker, 0, 0.5, TRAVERTINE_DARK));
  batches.flats.push(flatItem(grow(blocker, -0.7), 0.52, PINE_TONES[0]));
  const alongZ = depth(blocker) >= width(blocker);
  const length = alongZ ? depth(blocker) : width(blocker);
  const cx = centerX(blocker);
  const cz = centerZ(blocker);
  for (let along = 1.6; along <= length - 1.6; along += 3.2) {
    for (const side of [-1, 1] as const) {
      const offset = side * (Math.min(width(blocker), depth(blocker)) / 2 - 2);
      const x = alongZ ? cx + offset : blocker.minX + along;
      const z = alongZ ? blocker.minZ + along : cz + offset;
      cypress(x, z, 7 + rng.next() * 3, rng.pick(CYPRESS_TONES), batches);
    }
  }
}

// ---------------------------------------------------------------------------
// Walk-through props: trees and lamps, never inside blockers or socket clear zones
// ---------------------------------------------------------------------------

function isClearForProps(definition: CityDefinition, x: number, z: number, keepOffRoads: boolean): boolean {
  if (!contains(grow(definition.bounds, -2), x, z)) return false;
  for (const blocker of definition.blockers) {
    if (contains(grow(blocker, 2.5), x, z)) return false;
  }
  for (const landmark of definition.landmarks) {
    if (contains(grow(landmark.footprint, 6), x, z)) return false;
  }
  if (keepOffRoads) {
    for (const road of definition.roads) {
      if (contains(grow(road, 1.5), x, z)) return false;
    }
  }
  for (const socket of definition.sockets) {
    if (Math.hypot(socket.position[0] - x, socket.position[2] - z) < SOCKET_CLEAR_RADIUS) return false;
  }
  return Math.hypot(definition.spawn[0] - x, definition.spawn[2] - z) >= SOCKET_CLEAR_RADIUS;
}

function buildProps(definition: CityDefinition, rng: Rng, quality: Quality, batches: Batches): void {
  const placed: [number, number][] = [];
  const target = quality === 'low' ? 20 : 56;
  const { bounds } = definition;
  for (let attempt = 0; attempt < target * 8 && placed.length < target; attempt += 1) {
    const x = bounds.minX + rng.next() * width(bounds);
    const z = bounds.minZ + rng.next() * depth(bounds);
    if (!isClearForProps(definition, x, z, true)) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4.5)) continue;
    placed.push([x, z]);
    if (rng.next() < 0.55) {
      cypress(x, z, 6 + rng.next() * 3, rng.pick(CYPRESS_TONES), batches);
    } else {
      // Stone pine: tall bare trunk with a flat umbrella crown.
      const trunk = 3 + rng.next();
      batches.cylinders.push({ x, y: trunk / 2, z, sx: 0.5, sy: trunk, sz: 0.5, color: TRUNK_TONE });
      batches.spheres.push({ x, y: trunk + 0.9, z, sx: 2.6, sy: 1.3, sz: 2.6, color: rng.pick(PINE_TONES) });
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
        batches.cylinders.push({ x, y: 1.5, z, sx: 0.3, sy: 3.0, sz: 0.3, color: LAMP_POST_TONE });
        batches.boxes.push({ x, y: 3.3, z, sx: 0.7, sy: 0.7, sz: 0.7, color: LAMP_GLOW_TONE });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function RomeScene({ definition, seed, quality }: CitySceneProps) {
  const { bounds, roads, blockers, landmarks, sockets } = definition;

  const layout = useMemo(() => {
    const rng = createRng(hashSeed('rome-cosmetic', seed));
    const batches: Batches = { boxes: [], cylinders: [], spheres: [], cones: [], roofs: [], flats: [], rings: [], shells: [], tierFloors: [] };
    const landmarkIds = new Set(landmarks.map((landmark) => landmark.id));

    batches.flats.push(flatItem(bounds, 0, GROUND_TONE));
    if (quality !== 'low') {
      for (const road of roads) {
        for (const strip of sidewalkStrips(road, 1.2)) batches.flats.push(flatItem(strip, 0.016, KERB_TONE));
      }
    }
    for (const road of roads) batches.flats.push(flatItem(road, 0.02, COBBLE_TONE));

    const houses: House[] = [];
    for (const blocker of blockers) {
      if (landmarkIds.has(blocker.id)) continue;
      if (blocker.id === 'forum-ruin') buildForumRuin(blocker, rng, quality, batches);
      else if (blocker.id === 'cypress-row') buildCypressRow(blocker, rng, batches);
      else houses.push(...splitBlock(blocker, rng));
    }
    for (const landmark of landmarks) {
      if (landmark.silhouette === 'colosseum') buildColosseum(landmark, quality, batches);
      else if (landmark.silhouette === 'fountain') buildFountain(landmark, quality, batches);
      else if (landmark.silhouette === 'cafe') buildTrattoria(landmark, quality, batches);
      else houses.push(...splitBlock(landmark.footprint, rng));
    }
    buildHouses(houses, rng, quality, batches);
    buildProps(definition, rng, quality, batches);

    for (const socket of sockets) {
      const [x, , z] = socket.position;
      batches.cylinders.push({ x, y: 0.03, z, sx: 5.2, sy: 0.06, sz: 5.2, color: SOCKET_DISC_TONE });
      batches.rings.push({ x, y: 0.08, z, sx: 1, sy: 1, sz: 1, rx: FLAT, color: SOCKET_PAD_TONE });
    }

    for (const batch of Object.values(batches)) batch.sort(byTopDescending);
    return batches;
  }, [definition, seed, quality, bounds, blockers, landmarks, roads, sockets]);

  const colosseum = landmarks.find((landmark) => landmark.silhouette === 'colosseum');

  return (
    <group>
      <Instances geometry={UNIT_PLANE} items={layout.flats} />
      <Instances geometry={UNIT_BOX} items={layout.boxes} />
      <Instances geometry={UNIT_CYLINDER} items={layout.cylinders} />
      <Instances geometry={UNIT_SPHERE} items={layout.spheres} />
      <Instances geometry={UNIT_CONE} items={layout.cones} />
      <Instances geometry={HIP_ROOF} items={layout.roofs} />
      <Instances geometry={SOCKET_RING} items={layout.rings} />
      <Instances geometry={SHELL} items={layout.shells} material={WHITE_DOUBLE} />
      <Instances geometry={TIER_FLOOR} items={layout.tierFloors} material={WHITE_DOUBLE} />
      {colosseum && <ColosseumAttic landmark={colosseum} />}
    </group>
  );
}
