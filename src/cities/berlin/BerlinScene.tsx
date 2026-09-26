/**
 * Berlin scenery. Owner: A10. Scenery only — no rules, pickups, players, timers or camera work.
 *
 * Everything solid is derived from `definition.blockers`: the Brandenburg Gate, the TV Tower,
 * the painted wall, Altbau blocks, the plattenbau slab and the kiosk row each fill exactly their
 * blocker rectangle. Roads become grey paving with tram rails and bike lanes; sockets get a pad.
 * Cosmetic variation (facade tones, mural compositions, tree / bike / lamp placement) uses an
 * independent seeded RNG and never places a prop on a road, on a socket pad or near the spawn.
 *
 * Render budget: InstancedMesh batches (one per shared low-poly geometry per 48-unit ground tile,
 * so off-screen tiles are frustum-culled) plus two single meshes for the tower shaft and sphere.
 * Facade detail is flat quads, not boxes. Lambert, no transparency, no per-frame work.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
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
// Shared geometry and materials (module singletons)
// ---------------------------------------------------------------------------

// Triangle counts: box 12, tube 12 (open-ended), cylinder 24, sphere 20, plane 2, disc 8, ring 24.
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_TUBE = new CylinderGeometry(0.5, 0.5, 1, 6, 1, true);
const UNIT_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 6);
const UNIT_SPHERE = new IcosahedronGeometry(1, 0);
const UNIT_PLANE = new PlaneGeometry(1, 1);
const UNIT_DISC = new CircleGeometry(0.5, 8);
const SOCKET_RING = new RingGeometry(1.7, 2.3, 12);
const TOWER_SHAFT = new CylinderGeometry(0.55, 1, 1, 8, 1, true);
const TOWER_SPHERE = new SphereGeometry(1, 12, 8);

const WHITE = new MeshLambertMaterial({ color: '#ffffff' });
/** Discs stand in for bike wheels seen from either side, so they alone are double-sided. */
const WHITE_DOUBLE = new MeshLambertMaterial({ color: '#ffffff', side: DoubleSide });
const CONCRETE_MATERIAL = new MeshLambertMaterial({ color: '#e6e3dc' });
const SILVER_MATERIAL = new MeshLambertMaterial({ color: '#dfe5ec', emissive: '#2a3340' });

// Arcade palette
const INK = '#211333';
const LAVENDER = '#B6A1E8';
const PURPLE = '#7146C5';
const CREAM = '#FFF5E9';
const CYAN = '#22C4EA';
const PINK = '#F43FAB';
const YELLOW = '#FFD963';
const MURAL_TONES = [INK, LAVENDER, PURPLE, CREAM, CYAN, PINK, YELLOW] as const;

const GROUND_TONE = '#cbc7bd';
const FAR_GROUND_TONE = '#bdb8ad';
const PLAZA_TONE = '#dcd8ce';
const SIDEWALK_TONE = '#e6e1d6';
const ROAD_TONE = '#a8a59f';
const RAIL_TONE = '#5d626a';
const BIKE_LANE_TONE = '#c9776a';
const SHADOW_TONE = '#b3aea4';
const SOCKET_PAD_TONE = YELLOW;
const SOCKET_DISC_TONE = '#e9e4d8';
const SANDSTONE = '#dccfb2';
const SANDSTONE_DARK = '#c9b995';
const SANDSTONE_LIGHT = '#eadfc6';
const PATINA = '#4fa392';
const PATINA_DARK = '#3b7f72';
const TOWER_DARK = '#3a4049';
const ANTENNA_RED = '#e0483a';
const ANTENNA_WHITE = '#f4f4f2';
const ALTBAU_TONES = ['#f4d9a6', '#e8b98f', '#efc3c9', '#cfdcb4', '#d9c9ec', '#f6c9a3', '#f1e2c4'] as const;
const ALTBAU_ROOF_TONES = ['#4a3a5e', '#3f3450', '#5a4670', '#463c54'] as const;
const SHOPFRONT_TONE = '#3a2f4a';
const PLINTH_TONE = '#b9ad9c';
const WINDOW_TONE = '#26304a';
const CORNICE_TONE = '#fff7ec';
const RAILING_TONE = INK;
const SLAB_TONE = '#dfe4e9';
const SLAB_SEAM_TONE = '#b3bcc6';
const SLAB_PANEL_TONES = [CYAN, '#8fd7ea', PINK] as const;
const WIRE_TONE = '#3b3f47';
const LONG_SHADOW_TONE = '#a9a49a';
const BALCONY_TONES = [CYAN, PINK, YELLOW, LAVENDER] as const;
const KIOSK_TONES = [YELLOW, CYAN, PINK, LAVENDER] as const;
const WALL_TONE = '#e3dfd6';
const LEAF_TONES = ['#79b86a', '#63a85c', '#8fc46f', '#559c58'] as const;
const TRUNK_TONE = '#6f5238';
const LAMP_POST_TONE = '#2b2f38';
const LAMP_GLOW_TONE = '#ffd27a';
const BIKE_TONES = [INK, PURPLE, PINK, CYAN, '#3d3d3d'] as const;
const BOLLARD_TONE = '#8a8e96';
const FAR_TONES = ['#b6a1e8', '#a993dc', '#c2b1ee', '#9e88d0'] as const;
const LAWN_TONE = '#a9cf82';
const LANE_MARK_TONE = '#e9e4d6';

/** Lawns are purely cosmetic ground colour: parks west of the gate and the riverside strip by the wall. */
const LAWNS: readonly RectXZ[] = [
  { minX: -72, maxX: -50, minZ: -72, maxZ: -4 },
  { minX: -72, maxX: -64, minZ: 12, maxZ: 72 },
  { minX: 8, maxX: 62, minZ: 61, maxZ: 72 },
  { minX: 40, maxX: 72, minZ: -72, maxZ: -44 },
];

const SOCKET_CLEAR_RADIUS = 5;
const FLAT = -Math.PI / 2;
const FLOOR = 2.8;

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
  readonly rx?: number;
  readonly ry?: number;
  readonly rz?: number;
  readonly color: string;
}

const scratchObject = new Object3D();
const scratchColor = new Color();

function Instances({
  geometry,
  material = WHITE,
  items,
}: {
  readonly geometry: BufferGeometry;
  readonly material?: Material;
  readonly items: readonly InstanceItem[];
}) {
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
    // Bounding sphere over the actual instances so the renderer can frustum-cull this tile.
    mesh.computeBoundingSphere();
  }, [items]);

  if (items.length === 0) return null;
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} />;
}

/** Ground tiling for culling: 3x3 over the play bounds plus one outer ring tile for the backdrop. */
const TILE = 48;
const TILES_PER_AXIS = 3;
const OUTER_TILE = TILES_PER_AXIS * TILES_PER_AXIS;

function tileIndex(x: number, z: number, bounds: RectXZ): number {
  if (!contains(bounds, x, z)) return OUTER_TILE;
  const col = Math.min(TILES_PER_AXIS - 1, Math.floor((x - bounds.minX) / TILE));
  const row = Math.min(TILES_PER_AXIS - 1, Math.floor((z - bounds.minZ) / TILE));
  return row * TILES_PER_AXIS + col;
}

function splitByTile(items: readonly InstanceItem[], bounds: RectXZ): InstanceItem[][] {
  const tiles: InstanceItem[][] = Array.from({ length: OUTER_TILE + 1 }, () => []);
  for (const item of items) tiles[tileIndex(item.x, item.z, bounds)]!.push(item);
  return tiles;
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

type Face = '+z' | '-z' | '+x' | '-x';
const FACE_YAW: Record<Face, number> = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 };

/** A vertical decal quad (window, seam, panel) standing just off a facade; two triangles instead of a box. */
function quad(x: number, y: number, z: number, w: number, h: number, color: string, face: Face = '+z', roll = 0): InstanceItem {
  return { x, y, z, sx: w, sy: h, sz: 1, ry: FACE_YAW[face], rz: roll, color };
}

/** A flat disc lying on the ground. */
function groundDisc(x: number, y: number, z: number, diameter: number, color: string): InstanceItem {
  return { x, y, z, sx: diameter, sy: diameter, sz: 1, rx: FLAT, color };
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

function top(item: InstanceItem): number {
  return item.rx === undefined ? item.y + item.sy / 2 : item.y;
}
function byTopDescending(a: InstanceItem, b: InstanceItem): number {
  return top(b) - top(a);
}

interface Batches {
  readonly boxes: InstanceItem[];
  /** Open-ended cylinders: posts, trunks, columns whose ends are hidden. */
  readonly tubes: InstanceItem[];
  readonly cylinders: InstanceItem[];
  readonly spheres: InstanceItem[];
  /** Unit planes: ground flats (rx) and vertical facade decals (ry). */
  readonly flats: InstanceItem[];
  readonly discs: InstanceItem[];
  readonly rings: InstanceItem[];
}

// ---------------------------------------------------------------------------
// Streets
// ---------------------------------------------------------------------------

/** Plaza paving around each landmark, by silhouette. */
function plazaRect(landmark: Landmark): RectXZ {
  const by = landmark.silhouette === 'gate' ? 12 : landmark.silhouette === 'tv-tower' ? 10 : 9;
  return grow(landmark.footprint, by);
}

interface GroundZone {
  readonly rect: RectXZ;
  readonly color: string;
}

/**
 * The whole city floor as ONE non-overlapping patchwork at y=0. Roads, sidewalks, plazas, lawns
 * and plain paving used to be stacked planes; on a software rasteriser every stacked full-screen
 * layer costs several ms, so instead the bounds are cut along every zone edge into grid cells,
 * each cell takes the colour of the highest-priority zone covering it, and same-coloured
 * neighbours in a row are merged back into one quad.
 */
function buildGroundPatchwork(bounds: RectXZ, zones: readonly GroundZone[], batches: Batches): void {
  const xs = new Set<number>([bounds.minX, bounds.maxX]);
  const zs = new Set<number>([bounds.minZ, bounds.maxZ]);
  for (const { rect } of zones) {
    for (const x of [rect.minX, rect.maxX]) if (x > bounds.minX && x < bounds.maxX) xs.add(x);
    for (const z of [rect.minZ, rect.maxZ]) if (z > bounds.minZ && z < bounds.maxZ) zs.add(z);
  }
  const xEdges = [...xs].sort((a, b) => a - b);
  const zEdges = [...zs].sort((a, b) => a - b);

  for (let row = 0; row < zEdges.length - 1; row += 1) {
    const minZ = zEdges[row]!;
    const maxZ = zEdges[row + 1]!;
    const mz = (minZ + maxZ) / 2;
    let runStart = 0;
    let runColor = '';
    const flush = (end: number): void => {
      if (end > runStart) {
        batches.flats.push(flatItem({ minX: xEdges[runStart]!, maxX: xEdges[end]!, minZ, maxZ }, 0, runColor));
      }
    };
    for (let col = 0; col < xEdges.length - 1; col += 1) {
      const mx = (xEdges[col]! + xEdges[col + 1]!) / 2;
      let color = GROUND_TONE;
      for (const zone of zones) {
        if (contains(zone.rect, mx, mz)) {
          color = zone.color;
          break;
        }
      }
      if (color !== runColor) {
        flush(col);
        runStart = col;
        runColor = color;
      }
    }
    flush(xEdges.length - 1);
  }
}

function buildStreets(definition: CityDefinition, quality: Quality, batches: Batches): void {
  const { bounds, roads, landmarks } = definition;
  // Far ground as four strips around the play bounds so it never draws under the city floor.
  const far = grow(bounds, 60);
  batches.flats.push(flatItem({ minX: far.minX, maxX: far.maxX, minZ: far.minZ, maxZ: bounds.minZ }, 0, FAR_GROUND_TONE));
  batches.flats.push(flatItem({ minX: far.minX, maxX: far.maxX, minZ: bounds.maxZ, maxZ: far.maxZ }, 0, FAR_GROUND_TONE));
  batches.flats.push(flatItem({ minX: far.minX, maxX: bounds.minX, minZ: bounds.minZ, maxZ: bounds.maxZ }, 0, FAR_GROUND_TONE));
  batches.flats.push(flatItem({ minX: bounds.maxX, maxX: far.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ }, 0, FAR_GROUND_TONE));

  // Priority order: road over bike lane over sidewalk over plaza over lawn over plain paving.
  const zones: GroundZone[] = [
    ...roads.map((rect) => ({ rect, color: ROAD_TONE })),
    ...(quality === 'low' ? [] : roads.flatMap((road) => bikeLanes(road).map((rect) => ({ rect, color: BIKE_LANE_TONE })))),
    ...roads.flatMap((road) => sidewalkStrips(road, 3).map((rect) => ({ rect, color: SIDEWALK_TONE }))),
    ...landmarks.map((landmark) => ({ rect: plazaRect(landmark), color: PLAZA_TONE })),
    ...LAWNS.map((rect) => ({ rect, color: LAWN_TONE })),
  ];
  buildGroundPatchwork(bounds, zones, batches);

  for (const road of roads) {
    const horizontal = width(road) >= depth(road);
    // Tram rails on the two boulevards that cross the centre; the southern road is a cycle street.
    const tram = contains(road, 0, 0);
    if (tram) {
      for (const offset of [-2.4, -1.0, 1.0, 2.4]) {
        const rail: RectXZ = horizontal
          ? { minX: road.minX, maxX: road.maxX, minZ: centerZ(road) + offset - 0.08, maxZ: centerZ(road) + offset + 0.08 }
          : { minX: centerX(road) + offset - 0.08, maxX: centerX(road) + offset + 0.08, minZ: road.minZ, maxZ: road.maxZ };
        batches.flats.push(flatItem(rail, 0.03, RAIL_TONE));
      }
    }
    // Lane markings: a broken line either side of the tram reservation
    const length = horizontal ? width(road) : depth(road);
    for (const offset of [-5.2, 5.2]) {
      for (let along = 2; along < length - 3; along += 6) {
        const dash: RectXZ = horizontal
          ? { minX: road.minX + along, maxX: road.minX + along + 3, minZ: centerZ(road) + offset - 0.12, maxZ: centerZ(road) + offset + 0.12 }
          : { minX: centerX(road) + offset - 0.12, maxX: centerX(road) + offset + 0.12, minZ: road.minZ + along, maxZ: road.minZ + along + 3 };
        batches.flats.push(flatItem(dash, 0.026, LANE_MARK_TONE));
      }
    }
  }
}

/** Bike lanes: the outer half of each sidewalk strip. */
function bikeLanes(road: RectXZ): readonly RectXZ[] {
  const horizontal = width(road) >= depth(road);
  return ([-1, 1] as const).map((side) =>
    horizontal
      ? {
          minX: road.minX - 3,
          maxX: road.maxX + 3,
          minZ: side < 0 ? road.minZ - 3 : road.maxZ + 1.5,
          maxZ: side < 0 ? road.minZ - 1.5 : road.maxZ + 3,
        }
      : {
          minX: side < 0 ? road.minX - 3 : road.maxX + 1.5,
          maxX: side < 0 ? road.minX - 1.5 : road.maxX + 3,
          minZ: road.minZ - 3,
          maxZ: road.maxZ + 3,
        },
  );
}

/** Hard offset ground shadow under every solid block — the arcade "drop shadow" look. */
function buildGroundShadows(blockers: readonly Blocker[], batches: Batches): void {
  // Only the visible L outside the footprint is drawn; the part under the block would be hidden anyway.
  for (const blocker of blockers) {
    batches.flats.push(flatItem({ minX: blocker.maxX, maxX: blocker.maxX + 1.6, minZ: blocker.minZ + 1.6, maxZ: blocker.maxZ + 1.6 }, 0.01, SHADOW_TONE));
    batches.flats.push(flatItem({ minX: blocker.minX + 1.6, maxX: blocker.maxX, minZ: blocker.maxZ, maxZ: blocker.maxZ + 1.6 }, 0.01, SHADOW_TONE));
  }
}

/** Long cast shadow of a tall object, thrown towards +X/+Z so the silhouette reads on the ground from afar. */
function pushLongShadow(x: number, z: number, length: number, thickness: number, batches: Batches): void {
  const dx = length * Math.SQRT1_2;
  batches.flats.push({ x: x + dx / 2, y: 0.0155, z: z + dx / 2, sx: length, sy: thickness, sz: 1, rx: FLAT, rz: Math.PI / 4, color: LONG_SHADOW_TONE });
}

/** Overhead tram catenary: poles on both kerbs, span wires across, two contact wires along the tracks. */
function buildCatenary(definition: CityDefinition, quality: Quality, batches: Batches): void {
  for (const road of definition.roads) {
    if (!contains(road, 0, 0)) continue;
    const horizontal = width(road) >= depth(road);
    const length = horizontal ? width(road) : depth(road);
    const half = (horizontal ? depth(road) : width(road)) / 2;
    for (const offset of [-1.7, 1.7]) {
      const wire: InstanceItem = horizontal
        ? { x: centerX(road), y: 5.9, z: centerZ(road) + offset, sx: length, sy: 0.07, sz: 0.07, color: WIRE_TONE }
        : { x: centerX(road) + offset, y: 5.9, z: centerZ(road), sx: 0.07, sy: 0.07, sz: length, color: WIRE_TONE };
      batches.boxes.push(wire);
    }
    if (quality === 'low') continue;
    for (let along = 8; along < length; along += 18) {
      const ax = horizontal ? road.minX + along : centerX(road);
      const az = horizontal ? centerZ(road) : road.minZ + along;
      let bothClear = true;
      for (const side of [-1, 1] as const) {
        const px = horizontal ? ax : ax + side * (half + 0.6);
        const pz = horizontal ? az + side * (half + 0.6) : az;
        if (!isClearForProps(definition, px, pz, false)) bothClear = false;
      }
      if (!bothClear) continue;
      for (const side of [-1, 1] as const) {
        const px = horizontal ? ax : ax + side * (half + 0.6);
        const pz = horizontal ? az + side * (half + 0.6) : az;
        batches.tubes.push({ x: px, y: 3.4, z: pz, sx: 0.34, sy: 6.8, sz: 0.34, color: WIRE_TONE });
        batches.boxes.push({ x: px, y: 6.9, z: pz, sx: 0.6, sy: 0.3, sz: 0.6, color: INK });
      }
      const span = half * 2 + 1.2;
      batches.boxes.push(
        horizontal
          ? { x: ax, y: 6.5, z: az, sx: 0.06, sy: 0.06, sz: span, color: WIRE_TONE }
          : { x: ax, y: 6.5, z: az, sx: span, sy: 0.06, sz: 0.06, color: WIRE_TONE },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

const GATE_COLUMN_TOP = 8.6;
const GATE_ENTABLATURE = 1.6;
const GATE_ATTIC = 2.0;

function buildGate(landmark: Landmark, quality: Quality, batches: Batches): void {
  const { footprint } = landmark;
  const cx = centerX(footprint);
  const cz = centerZ(footprint);
  const { boxes, tubes, spheres } = batches;

  // Paving pattern: a lighter stone cross marking the axis through the central passage
  batches.flats.push(flatItem({ minX: cx - 3, maxX: cx + 3, minZ: footprint.minZ - 12, maxZ: footprint.maxZ + 12 }, 0.014, SIDEWALK_TONE));
  batches.flats.push(flatItem({ minX: footprint.minX - 12, maxX: footprint.maxX + 12, minZ: footprint.maxZ + 3, maxZ: footprint.maxZ + 3.6 }, 0.014, SANDSTONE_DARK));
  pushLongShadow(footprint.maxX - 2, cz + 2, 18, 12, batches);
  boxes.push(boxItem(footprint, 0, 0.6, SANDSTONE_DARK));
  boxes.push(boxItem(grow(footprint, 0.8), 0, 0.25, SANDSTONE));

  const pierOffsets = [-12.4, -7.4, -2.5, 2.5, 7.4, 12.4];
  for (const dx of pierOffsets) {
    boxes.push({ x: cx + dx, y: 0.6 + GATE_COLUMN_TOP / 2, z: cz, sx: 2.2, sy: GATE_COLUMN_TOP, sz: 9, color: SANDSTONE });
    for (const dz of [-5.5, 5.5]) {
      tubes.push({ x: cx + dx, y: 0.6 + GATE_COLUMN_TOP / 2, z: cz + dz, sx: 2.4, sy: GATE_COLUMN_TOP, sz: 2.4, color: SANDSTONE_LIGHT });
      boxes.push({ x: cx + dx, y: 0.6 + GATE_COLUMN_TOP - 0.35, z: cz + dz, sx: 2.9, sy: 0.7, sz: 2.9, color: SANDSTONE_LIGHT });
      boxes.push({ x: cx + dx, y: 0.95, z: cz + dz, sx: 2.9, sy: 0.7, sz: 2.9, color: SANDSTONE_DARK });
      if (quality !== 'low') {
        boxes.push({ x: cx + dx, y: 0.6 + GATE_COLUMN_TOP - 1.0, z: cz + dz, sx: 2.6, sy: 0.35, sz: 2.6, color: SANDSTONE_DARK });
      }
    }
  }

  const entablatureY = 0.6 + GATE_COLUMN_TOP;
  boxes.push({ x: cx, y: entablatureY + GATE_ENTABLATURE / 2, z: cz, sx: width(footprint), sy: GATE_ENTABLATURE, sz: 13.4, color: SANDSTONE });
  boxes.push({ x: cx, y: entablatureY + GATE_ENTABLATURE + 0.25, z: cz, sx: width(footprint) + 0.8, sy: 0.5, sz: 14.2, color: SANDSTONE_LIGHT });
  const atticY = entablatureY + GATE_ENTABLATURE + 0.5;
  boxes.push({ x: cx, y: atticY + GATE_ATTIC / 2, z: cz, sx: width(footprint) - 2, sy: GATE_ATTIC, sz: 11.6, color: SANDSTONE_LIGHT });
  if (quality !== 'low') {
    // Frieze relief band on the visible (+Z) face
    batches.flats.push(quad(cx, entablatureY + GATE_ENTABLATURE * 0.5, cz + 6.72, width(footprint) - 4, 1.0, SANDSTONE_DARK));
    for (const dx of pierOffsets) {
      batches.flats.push(quad(cx + dx, atticY + GATE_ATTIC / 2, cz + 5.82, 1.4, 2.0, SANDSTONE_DARK));
    }
  }

  // Quadriga: four horses pulling a chariot, patinated copper, facing the camera (+Z)
  const roofY = atticY + GATE_ATTIC;
  boxes.push({ x: cx, y: roofY + 0.3, z: cz, sx: 9.0, sy: 0.6, sz: 6.8, color: INK });
  boxes.push({ x: cx, y: roofY + 0.75, z: cz, sx: 8.4, sy: 0.3, sz: 6.4, color: SANDSTONE_DARK });
  const horseY = roofY + 0.9;
  for (const dx of [-2.4, -0.8, 0.8, 2.4]) {
    boxes.push({ x: cx + dx, y: horseY + 2.0, z: cz + 1.0, sx: 1.1, sy: 1.3, sz: 2.8, color: PATINA });
    boxes.push({ x: cx + dx, y: horseY + 3.0, z: cz + 2.4, sx: 0.7, sy: 1.5, sz: 0.8, color: PATINA, rx: -0.35 });
    boxes.push({ x: cx + dx, y: horseY + 3.7, z: cz + 3.0, sx: 0.6, sy: 0.6, sz: 1.2, color: PATINA_DARK });
    if (quality !== 'low') {
      for (const lz of [-1.0, 1.0]) {
        for (const lx of [-0.3, 0.3]) {
          boxes.push({ x: cx + dx + lx, y: horseY + 0.7, z: cz + 1.0 + lz, sx: 0.3, sy: 1.4, sz: 0.3, color: PATINA_DARK });
        }
      }
    }
  }
  boxes.push({ x: cx, y: horseY + 1.1, z: cz - 1.9, sx: 3.0, sy: 1.6, sz: 2.0, color: PATINA });
  for (const wx of [-1.7, 1.7]) {
    batches.discs.push({ x: cx + wx, y: horseY + 1.0, z: cz - 1.9, sx: 1.8, sy: 1.8, sz: 1, ry: Math.PI / 2, color: PATINA_DARK });
  }
  tubes.push({ x: cx, y: horseY + 2.6, z: cz - 2.0, sx: 0.8, sy: 1.8, sz: 0.8, color: PATINA });
  spheres.push({ x: cx, y: horseY + 3.8, z: cz - 2.0, sx: 0.45, sy: 0.45, sz: 0.45, color: PATINA });
  tubes.push({ x: cx + 0.6, y: horseY + 4.0, z: cz - 2.0, sx: 0.14, sy: 3.4, sz: 0.14, color: PATINA_DARK });
  boxes.push({ x: cx + 0.6, y: horseY + 5.9, z: cz - 2.0, sx: 0.9, sy: 0.9, sz: 0.2, color: YELLOW });
}

const TOWER_SHAFT_TOP = 27;
const TOWER_SPHERE_Y = 29.5;
const TOWER_SPHERE_R = 5.2;

function buildTower(landmark: Landmark, quality: Quality, batches: Batches): void {
  const { footprint } = landmark;
  const cx = centerX(footprint);
  const cz = centerZ(footprint);
  const { boxes, cylinders, tubes, spheres, discs } = batches;

  // Radial plaza rings + a long shadow with the sphere's disc at its end: the tower reads from the whole district.
  discs.push(groundDisc(cx, 0.014, cz, 30, SIDEWALK_TONE));
  discs.push(groundDisc(cx, 0.015, cz, 22, PLAZA_TONE));
  pushLongShadow(cx, cz, 30, 4.2, batches);
  const shadowEnd = 30 * Math.SQRT1_2;
  discs.push(groundDisc(cx + shadowEnd, 0.0156, cz + shadowEnd, TOWER_SPHERE_R * 2.1, LONG_SHADOW_TONE));
  boxes.push(boxItem(footprint, 0, 2.8, '#eeece6'));
  boxes.push(boxItem(grow(footprint, -0.6), 2.8, 0.5, TOWER_DARK));
  // Folded-plate pavilion roof
  for (const [dx, dz] of [
    [-3.5, 3.5],
    [3.5, 3.5],
    [-3.5, -3.5],
    [3.5, -3.5],
  ] as const) {
    boxes.push({ x: cx + dx, y: 4.2, z: cz + dz, sx: 6.4, sy: 1.6, sz: 6.4, color: SLAB_TONE });
  }
  if (quality !== 'low') {
    for (let x = footprint.minX + 1; x < footprint.maxX - 0.5; x += 2) {
      batches.flats.push(quad(x, 1.5, footprint.maxZ + 0.05, 1.2, 2.0, WINDOW_TONE));
    }
  }

  cylinders.push({ x: cx, y: TOWER_SPHERE_Y - 1.2, z: cz, sx: TOWER_SPHERE_R * 2 + 1.0, sy: 0.9, sz: TOWER_SPHERE_R * 2 + 1.0, color: TOWER_DARK });
  cylinders.push({ x: cx, y: TOWER_SPHERE_Y + 1.2, z: cz, sx: TOWER_SPHERE_R * 2 + 0.9, sy: 0.6, sz: TOWER_SPHERE_R * 2 + 0.9, color: TOWER_DARK });
  // Window band between the two rings
  cylinders.push({ x: cx, y: TOWER_SPHERE_Y, z: cz, sx: TOWER_SPHERE_R * 2 + 0.6, sy: 1.4, sz: TOWER_SPHERE_R * 2 + 0.6, color: WINDOW_TONE });
  const antennaBase = TOWER_SPHERE_Y + TOWER_SPHERE_R - 0.4;
  const segment = 3.6;
  for (let index = 0; index < 5; index += 1) {
    tubes.push({
      x: cx,
      y: antennaBase + segment * index + segment / 2,
      z: cz,
      sx: 1.3 - index * 0.15,
      sy: segment,
      sz: 1.3 - index * 0.15,
      color: index % 2 === 0 ? ANTENNA_RED : ANTENNA_WHITE,
    });
  }
  spheres.push({ x: cx, y: antennaBase + segment * 5 + 0.4, z: cz, sx: 0.6, sy: 0.6, sz: 0.6, color: ANTENNA_RED });
}

function TowerMeshes({ landmark }: { readonly landmark: Landmark }) {
  const cx = centerX(landmark.footprint);
  const cz = centerZ(landmark.footprint);
  return (
    <group>
      <mesh
        geometry={TOWER_SHAFT}
        material={CONCRETE_MATERIAL}
        position={[cx, TOWER_SHAFT_TOP / 2, cz]}
        scale={[4.8, TOWER_SHAFT_TOP, 4.8]}
      />
      <mesh geometry={TOWER_SPHERE} material={SILVER_MATERIAL} position={[cx, TOWER_SPHERE_Y, cz]} scale={TOWER_SPHERE_R} />
    </group>
  );
}

const WALL_HEIGHT = 5.2;

/** Painted wall: one long concrete slab with a run of original abstract murals on the +Z face. */
function buildPaintedWall(landmark: Landmark, rng: Rng, quality: Quality, batches: Batches): void {
  const { footprint } = landmark;
  const { boxes, flats, discs } = batches;
  boxes.push(boxItem(footprint, 0, WALL_HEIGHT, WALL_TONE));
  boxes.push({ x: centerX(footprint), y: WALL_HEIGHT + 0.2, z: centerZ(footprint), sx: width(footprint) + 0.4, sy: 0.4, sz: depth(footprint) + 0.4, color: '#a9a49a' });
  for (const pillarX of [footprint.minX + 0.6, footprint.maxX - 0.6]) {
    boxes.push({ x: pillarX, y: WALL_HEIGHT / 2 + 0.4, z: centerZ(footprint), sx: 1.4, sy: WALL_HEIGHT + 0.8, sz: depth(footprint) + 0.6, color: INK });
  }

  const faceZ = footprint.maxZ + 0.04;
  const panelWidth = 4.25;
  const count = Math.floor((width(footprint) - 2) / panelWidth);
  const startX = footprint.minX + 1 + (width(footprint) - 2 - count * panelWidth) / 2;
  for (let index = 0; index < count; index += 1) {
    const left = startX + index * panelWidth;
    const px = left + panelWidth / 2;
    const background = rng.pick(MURAL_TONES);
    flats.push(quad(px, 0.4 + (WALL_HEIGHT - 0.6) / 2, faceZ, panelWidth - 0.2, WALL_HEIGHT - 0.6, background));
    if (quality === 'low') continue;
    const shapes = 3 + rng.int(3);
    for (let shape = 0; shape < shapes; shape += 1) {
      let color = rng.pick(MURAL_TONES);
      if (color === background) color = color === INK ? YELLOW : INK;
      const sx = 0.6 + rng.next() * 1.8;
      const sy = 0.5 + rng.next() * 1.6;
      const x = left + 0.6 + rng.next() * (panelWidth - 1.2);
      const y = 1.0 + rng.next() * (WALL_HEIGHT - 2.2);
      const kind = rng.int(5);
      const zOff = faceZ + 0.03 + shape * 0.012;
      if (kind === 0) {
        flats.push(quad(x, y, zOff, sx, sy, color));
      } else if (kind === 1) {
        flats.push(quad(x, y, zOff, sx * 1.6, 0.35, color, '+z', (rng.next() - 0.5) * 1.4));
      } else if (kind === 2) {
        discs.push({ x, y, z: zOff, sx: sy, sy, sz: 1, color });
      } else if (kind === 3) {
        // Hollow ring / arc
        batches.rings.push({ x, y, z: zOff, sx: sy * 0.45, sy: sy * 0.45, sz: 1, color });
      } else {
        // Dotted row
        for (let dot = 0; dot < 3; dot += 1) {
          discs.push({ x: x - 0.7 + dot * 0.7, y, z: zOff, sx: 0.32, sy: 0.32, sz: 1, color });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Neighbourhood blocks
// ---------------------------------------------------------------------------

interface House {
  readonly rect: RectXZ;
  readonly height: number;
  readonly tone: string;
  readonly roof: string;
  readonly outer: RectXZ;
}

function splitBlock(blocker: RectXZ, rng: Rng): House[] {
  const length = width(blocker);
  const count = Math.max(2, Math.min(4, Math.round(length / 6)));
  const houses: House[] = [];
  let cursor = blocker.minX;
  for (let index = 0; index < count; index += 1) {
    const remaining = count - index;
    const end = index === count - 1 ? blocker.maxX : cursor + (blocker.maxX - cursor) / remaining + (rng.next() - 0.5) * 2;
    houses.push({
      rect: { minX: cursor, maxX: end, minZ: blocker.minZ, maxZ: blocker.maxZ },
      height: FLOOR * (4 + rng.int(2)) + 0.6,
      tone: rng.pick(ALTBAU_TONES),
      roof: rng.pick(ALTBAU_ROOF_TONES),
      outer: blocker,
    });
    cursor = end;
  }
  return houses;
}

function buildAltbau(houses: readonly House[], rng: Rng, quality: Quality, batches: Batches): void {
  const { boxes, flats } = batches;
  for (const house of houses) {
    const { rect, height, tone, roof, outer } = house;
    boxes.push(boxItem(rect, 0, height, tone));
    boxes.push(boxItem(grow(rect, 0.06), 0, 1.2, PLINTH_TONE));
    boxes.push(boxItem(grow(rect, -0.6), height, 2.6, roof));
    boxes.push(boxItem(grow(rect, 0.2), height, 0.5, CORNICE_TONE));
    boxes.push(boxItem(grow(rect, 0.12), height - 0.9, 0.35, CORNICE_TONE));
    if (quality === 'low') continue;
    boxes.push(boxItem(grow(rect, -2.0), height + 2.6, 0.5, roof));
    // Mansard dormers on the street side
    for (let x = rect.minX + 2.2; x <= rect.maxX - 2.2; x += 4.8) {
      boxes.push({ x, y: height + 1.1, z: rect.maxZ - 0.5, sx: 1.4, sy: 1.6, sz: 1.4, color: CORNICE_TONE });
      flats.push(quad(x, height + 1.1, rect.maxZ + 0.21, 0.9, 1.0, WINDOW_TONE));
    }
    boxes.push({
      x: rect.minX + 1.5 + rng.next() * Math.max(0.1, width(rect) - 3),
      y: height + 3.4,
      z: rect.minZ + 2 + rng.next() * Math.max(0.1, depth(rect) - 4),
      sx: 0.8,
      sy: 1.6,
      sz: 0.8,
      color: PLINTH_TONE,
    });

    const frontVisible = rect.maxZ >= outer.maxZ - 0.01;
    const floors = Math.floor((height - 0.6) / FLOOR);
    for (let floor = 0; floor < floors; floor += 1) {
      const sillY = 0.6 + floor * FLOOR;
      if (frontVisible) {
        if (floor > 0) {
          boxes.push({ x: centerX(rect), y: sillY, z: rect.maxZ + 0.12, sx: width(rect), sy: 0.22, sz: 0.3, color: CORNICE_TONE });
        } else {
          // Ground-floor shopfront: dark band with a cream fascia and a doorway
          flats.push(quad(centerX(rect), 1.75, rect.maxZ + 0.05, width(rect) - 0.6, 2.3, SHOPFRONT_TONE));
          boxes.push({ x: centerX(rect), y: 3.05, z: rect.maxZ + 0.2, sx: width(rect) - 0.4, sy: 0.4, sz: 0.4, color: rng.pick(BALCONY_TONES) });
          flats.push(quad(rect.minX + 1.2, 1.3, rect.maxZ + 0.08, 1.0, 2.2, CORNICE_TONE));
        }
        // Stucco pilasters between the window bays
        for (let x = rect.minX + 0.35; x <= rect.maxX - 0.3; x += width(rect) - 0.7) {
          flats.push(quad(x, sillY + FLOOR / 2, rect.maxZ + 0.1, 0.5, FLOOR, CORNICE_TONE));
        }
        let column = 0;
        for (let x = rect.minX + 1.3; x <= rect.maxX - 1.3; x += 2.4, column += 1) {
          const y = sillY + (floor === 0 ? 1.4 : 1.55);
          flats.push(quad(x, y, rect.maxZ + 0.06, 1.1, floor === 0 ? 2.0 : 1.9, WINDOW_TONE));
          if (floor > 0 && floor < floors - 1 && column % 2 === 1) {
            boxes.push({ x, y: sillY + 0.15, z: rect.maxZ + 0.55, sx: 1.7, sy: 0.3, sz: 1.1, color: CORNICE_TONE });
            flats.push(quad(x, sillY + 0.75, rect.maxZ + 1.1, 1.7, 0.9, RAILING_TONE));
          }
        }
      }
      for (const [edge, side] of [
        [rect.minX, -1],
        [rect.maxX, 1],
      ] as const) {
        const onOuter = side < 0 ? rect.minX <= outer.minX + 0.01 : rect.maxX >= outer.maxX - 0.01;
        if (!onOuter) continue;
        for (let z = rect.minZ + 1.4; z <= rect.maxZ - 1.4; z += 2.6) {
          flats.push(quad(edge + side * 0.06, sillY + 1.55, z, 1.1, 1.9, WINDOW_TONE, side < 0 ? '-x' : '+x'));
        }
      }
    }
  }
}

const SLAB_HEIGHT = FLOOR * 8 + 0.8;

function buildPlattenbau(blocker: Blocker, quality: Quality, batches: Batches): void {
  const { boxes, flats } = batches;
  boxes.push(boxItem(blocker, 0, SLAB_HEIGHT, SLAB_TONE));
  boxes.push(boxItem(grow(blocker, 0.08), 0, 0.8, PLINTH_TONE));
  boxes.push(boxItem(grow(blocker, 0.15), SLAB_HEIGHT, 0.6, SLAB_SEAM_TONE));
  boxes.push({ x: blocker.minX + 4, y: SLAB_HEIGHT + 1.6, z: centerZ(blocker), sx: 5, sy: 2.0, sz: 6, color: SLAB_TONE });
  batches.tubes.push({ x: blocker.maxX - 3, y: SLAB_HEIGHT + 3, z: centerZ(blocker), sx: 0.3, sy: 4.8, sz: 0.3, color: LAMP_POST_TONE });
  const floors = 8;
  const bays = Math.floor(width(blocker) / 4);
  const bayWidth = width(blocker) / bays;
  // Full-height painted panel strips: the classic post-war slab colour scheme
  for (let bay = 0; bay < bays; bay += 3) {
    const x = blocker.minX + bayWidth * (bay + 0.5);
    flats.push(quad(x, SLAB_HEIGHT / 2, blocker.maxZ + 0.03, bayWidth - 0.4, SLAB_HEIGHT - 1.0, SLAB_PANEL_TONES[(bay / 3) % SLAB_PANEL_TONES.length]!));
  }
  for (let z = blocker.minZ + 2; z < blocker.maxZ - 1; z += 6) {
    flats.push(quad(blocker.maxX + 0.03, SLAB_HEIGHT / 2, z, 2.4, SLAB_HEIGHT - 1.0, SLAB_PANEL_TONES[1], '+x'));
  }
  for (let floor = 0; floor < floors; floor += 1) {
    const floorY = 0.8 + floor * FLOOR;
    flats.push(quad(centerX(blocker), floorY, blocker.maxZ + 0.05, width(blocker), 0.12, SLAB_SEAM_TONE));
    if (quality === 'low' && floor % 2 === 1) continue;
    for (let bay = 0; bay < bays; bay += 1) {
      const x = blocker.minX + bayWidth * (bay + 0.5);
      if (bay % 2 === 0) {
        flats.push(quad(x, floorY + 1.5, blocker.maxZ + 0.06, bayWidth - 1.4, 1.5, WINDOW_TONE));
      } else {
        boxes.push({ x, y: floorY + 0.15, z: blocker.maxZ + 0.6, sx: bayWidth - 1.0, sy: 0.3, sz: 1.2, color: SLAB_SEAM_TONE });
        flats.push(quad(x, floorY + 0.7, blocker.maxZ + 1.2, bayWidth - 1.0, 1.0, BALCONY_TONES[(bay + floor) % BALCONY_TONES.length]!));
        flats.push(quad(x, floorY + 1.9, blocker.maxZ + 0.06, bayWidth - 1.6, 1.1, WINDOW_TONE));
      }
    }
  }
  if (quality === 'low') return;
  for (let bay = 1; bay < bays; bay += 1) {
    const x = blocker.minX + bayWidth * bay;
    flats.push(quad(x, SLAB_HEIGHT / 2, blocker.maxZ + 0.05, 0.1, SLAB_HEIGHT, SLAB_SEAM_TONE));
  }
}

function buildKiosks(blocker: Blocker, rng: Rng, quality: Quality, batches: Batches): void {
  const { boxes, cylinders, tubes, flats } = batches;
  boxes.push(boxItem(blocker, 0, 0.3, PLINTH_TONE));
  const count = 3;
  const kioskWidth = width(blocker) / count;
  for (let index = 0; index < count; index += 1) {
    const rect: RectXZ = {
      minX: blocker.minX + kioskWidth * index + 0.1,
      maxX: blocker.minX + kioskWidth * (index + 1) - 0.1,
      minZ: blocker.minZ + 0.1,
      maxZ: blocker.maxZ - 0.1,
    };
    const accent = KIOSK_TONES[(index + rng.int(2)) % KIOSK_TONES.length]!;
    const bodyTone = index === 1 ? CREAM : '#f7efe2';
    const height = 3.4 + index * 0.3;
    boxes.push(boxItem(rect, 0.3, height, bodyTone));
    boxes.push(boxItem(grow(rect, 0.25), 0.3 + height, 0.45, accent));
    boxes.push(boxItem(grow(rect, 0.25), 0.3 + height - 0.18, 0.18, INK));
    // Serving window + counter on the +Z face
    flats.push(quad(centerX(rect), 0.3 + 2.0, rect.maxZ + 0.05, width(rect) - 1.4, 1.5, WINDOW_TONE));
    boxes.push({ x: centerX(rect), y: 0.3 + 1.15, z: rect.maxZ + 0.35, sx: width(rect) - 1.0, sy: 0.25, sz: 0.8, color: INK });
    // Striped awning
    const stripes = quality === 'low' ? 2 : 5;
    const stripeWidth = (width(rect) + 0.6) / stripes;
    for (let stripe = 0; stripe < stripes; stripe += 1) {
      boxes.push({
        x: rect.minX - 0.3 + stripeWidth * (stripe + 0.5),
        y: 0.3 + height - 0.35,
        z: rect.maxZ + 0.9,
        sx: stripeWidth,
        sy: 0.14,
        sz: 1.9,
        rx: 0.32,
        color: stripe % 2 === 0 ? accent : CREAM,
      });
    }
    // Rooftop sign
    boxes.push({ x: centerX(rect), y: 0.3 + height + 1.35, z: rect.maxZ - 1.0, sx: width(rect) - 1.2, sy: 1.4, sz: 0.3, color: accent });
    flats.push(quad(centerX(rect), 0.3 + height + 1.35, rect.maxZ - 0.83, width(rect) - 2.2, 0.45, INK));
    if (quality === 'low') continue;
    // Big parasol on the roof behind the sign — a cheap cone-free umbrella from a flat cylinder
    tubes.push({ x: centerX(rect), y: 0.3 + height + 2.2, z: rect.minZ + 3, sx: 0.16, sy: 4.4, sz: 0.16, color: LAMP_POST_TONE });
    cylinders.push({ x: centerX(rect), y: 0.3 + height + 4.3, z: rect.minZ + 3, sx: 4.6, sy: 0.3, sz: 4.6, color: accent });
  }
}

// ---------------------------------------------------------------------------
// Props and background
// ---------------------------------------------------------------------------

function isClearForProps(definition: CityDefinition, x: number, z: number, keepOffRoads: boolean): boolean {
  if (!contains(grow(definition.bounds, -2), x, z)) return false;
  for (const blocker of definition.blockers) {
    if (contains(grow(blocker, 3), x, z)) return false;
  }
  for (const landmark of definition.landmarks) {
    if (contains(grow(landmark.footprint, 6), x, z)) return false;
  }
  if (keepOffRoads) {
    for (const road of definition.roads) {
      if (contains(grow(road, 3.5), x, z)) return false;
    }
  }
  for (const socket of definition.sockets) {
    if (Math.hypot(socket.position[0] - x, socket.position[2] - z) < SOCKET_CLEAR_RADIUS) return false;
  }
  if (Math.hypot(definition.spawn[0] - x, definition.spawn[2] - z) < SOCKET_CLEAR_RADIUS + 2) return false;
  return true;
}

function pushTree(x: number, z: number, rng: Rng, batches: Batches): void {
  const trunkHeight = 1.8 + rng.next() * 0.7;
  const crown = 1.7 + rng.next() * 0.9;
  batches.tubes.push({ x, y: trunkHeight / 2, z, sx: 0.5, sy: trunkHeight, sz: 0.5, color: TRUNK_TONE });
  batches.spheres.push({ x, y: trunkHeight + crown * 0.8, z, sx: crown, sy: crown * 1.15, sz: crown, ry: rng.next() * Math.PI, color: rng.pick(LEAF_TONES) });
}

/** A parked bike: two wheel discs, a frame bar and a saddle, lying along X or along Z. */
function pushBike(x: number, z: number, alongX: boolean, rng: Rng, batches: Batches): void {
  const tone = rng.pick(BIKE_TONES);
  for (const along of [-0.62, 0.62]) {
    batches.discs.push({
      x: alongX ? x + along : x,
      y: 0.48,
      z: alongX ? z : z + along,
      sx: 0.95,
      sy: 0.95,
      sz: 1,
      ry: alongX ? 0 : Math.PI / 2,
      color: INK,
    });
  }
  batches.boxes.push({ x, y: 0.7, z, sx: alongX ? 1.2 : 0.16, sy: 0.16, sz: alongX ? 0.16 : 1.2, color: tone });
  batches.boxes.push({
    x: alongX ? x - 0.2 : x,
    y: 0.95,
    z: alongX ? z : z - 0.2,
    sx: alongX ? 0.36 : 0.6,
    sy: 0.14,
    sz: alongX ? 0.6 : 0.36,
    color: INK,
  });
}

function buildProps(definition: CityDefinition, rng: Rng, quality: Quality, batches: Batches): void {
  const placed: [number, number][] = [];
  const target = quality === 'low' ? 22 : 56;
  const { bounds, roads } = definition;

  // Street trees line the boulevards on a regular rhythm, plus scattered trees in the quieter blocks.
  for (const road of roads) {
    const horizontal = width(road) >= depth(road);
    const length = horizontal ? width(road) : depth(road);
    for (let along = 6; along < length; along += quality === 'low' ? 24 : 12) {
      for (const side of [-1, 1] as const) {
        const x = horizontal ? road.minX + along : centerX(road) + side * (width(road) / 2 + 3.6);
        const z = horizontal ? centerZ(road) + side * (depth(road) / 2 + 3.6) : road.minZ + along;
        if (!isClearForProps(definition, x, z, false)) continue;
        if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4)) continue;
        placed.push([x, z]);
        pushTree(x, z, rng, batches);
      }
    }
  }
  for (let attempt = 0; attempt < target * 8 && placed.length < target; attempt += 1) {
    const x = bounds.minX + rng.next() * width(bounds);
    const z = bounds.minZ + rng.next() * depth(bounds);
    if (!isClearForProps(definition, x, z, true)) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 5)) continue;
    placed.push([x, z]);
    pushTree(x, z, rng, batches);
  }

  if (quality === 'low') return;

  for (const road of roads) {
    const horizontal = width(road) >= depth(road);
    const length = horizontal ? width(road) : depth(road);
    for (let along = 12; along < length; along += 20) {
      for (const side of [-1, 1] as const) {
        const x = horizontal ? road.minX + along : centerX(road) + side * (width(road) / 2 + 1.0);
        const z = horizontal ? centerZ(road) + side * (depth(road) / 2 + 1.0) : road.minZ + along;
        if (!isClearForProps(definition, x, z, false)) continue;
        batches.tubes.push({ x, y: 1.9, z, sx: 0.28, sy: 3.8, sz: 0.28, color: LAMP_POST_TONE });
        batches.boxes.push({ x, y: 4.0, z, sx: 0.8, sy: 0.6, sz: 0.8, color: LAMP_GLOW_TONE });
        batches.boxes.push({ x, y: 4.4, z, sx: 1.0, sy: 0.2, sz: 1.0, color: INK });
        // A bike or two chained near every lamp post
        const bikes = 1 + rng.int(2);
        for (let index = 0; index < bikes; index += 1) {
          const bx = x + (horizontal ? 1.2 + index * 1.1 : side * 0.9);
          const bz = z + (horizontal ? side * 0.9 : 1.2 + index * 1.1);
          pushBike(bx, bz, horizontal, rng, batches);
        }
      }
    }
  }

  // Bollards guard the plazas in front of the two big landmarks.
  for (const landmark of definition.landmarks) {
    if (landmark.silhouette === 'market') continue;
    const line = grow(landmark.footprint, 8);
    for (let x = line.minX; x <= line.maxX; x += 4) {
      if (!isClearForProps(definition, x, line.maxZ, true)) continue;
      batches.tubes.push({ x, y: 0.45, z: line.maxZ, sx: 0.5, sy: 0.9, sz: 0.5, color: BOLLARD_TONE });
      batches.spheres.push({ x, y: 0.95, z: line.maxZ, sx: 0.28, sy: 0.28, sz: 0.28, color: INK });
    }
  }
}

/** Distant skyline outside the walkable bounds, in receding lavender tones. */
function buildBackdrop(bounds: RectXZ, rng: Rng, quality: Quality, batches: Batches): void {
  const step = quality === 'low' ? 14 : 9;
  for (let x = bounds.minX - 20; x <= bounds.maxX + 20; x += step) {
    const h = 8 + rng.next() * 20;
    const w = 5 + rng.next() * 5;
    batches.boxes.push({ x, y: h / 2, z: bounds.minZ - 16 - rng.next() * 8, sx: w, sy: h, sz: 6, color: rng.pick(FAR_TONES) });
  }
  for (const side of [-1, 1] as const) {
    const edge = side < 0 ? bounds.minX - 14 : bounds.maxX + 14;
    for (let z = bounds.minZ; z <= bounds.maxZ; z += step) {
      const h = 6 + rng.next() * 14;
      batches.boxes.push({ x: edge + side * rng.next() * 6, y: h / 2, z, sx: 6, sy: h, sz: 5 + rng.next() * 4, color: rng.pick(FAR_TONES) });
    }
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function BerlinScene({ definition, seed, quality }: CitySceneProps) {
  const { bounds, blockers, landmarks, sockets } = definition;

  const layout = useMemo(() => {
    const rng = createRng(hashSeed('berlin-cosmetic', seed));
    const batches: Batches = { boxes: [], tubes: [], cylinders: [], spheres: [], flats: [], discs: [], rings: [] };
    const landmarkIds = new Set(landmarks.map((landmark) => landmark.id));

    buildStreets(definition, quality, batches);
    buildGroundShadows(blockers, batches);
    buildCatenary(definition, quality, batches);

    for (const landmark of landmarks) {
      if (landmark.silhouette === 'gate') buildGate(landmark, quality, batches);
      else if (landmark.silhouette === 'tv-tower') buildTower(landmark, quality, batches);
      else buildPaintedWall(landmark, rng, quality, batches);
    }

    const houses: House[] = [];
    for (const blocker of blockers) {
      if (landmarkIds.has(blocker.id)) continue;
      if (blocker.id === 'plattenbau') buildPlattenbau(blocker, quality, batches);
      else if (blocker.id === 'kiosk-row') buildKiosks(blocker, rng, quality, batches);
      else houses.push(...splitBlock(blocker, rng));
    }
    buildAltbau(houses, rng, quality, batches);
    buildProps(definition, rng, quality, batches);
    buildBackdrop(bounds, rng, quality, batches);

    for (const socket of sockets) {
      const [x, , z] = socket.position;
      batches.discs.push(groundDisc(x, 0.06, z, 5.2, SOCKET_DISC_TONE));
      batches.rings.push({ x, y: 0.08, z, sx: 1, sy: 1, sz: 1, rx: FLAT, color: SOCKET_PAD_TONE });
    }

    for (const batch of Object.values(batches)) batch.sort(byTopDescending);
    return {
      flats: splitByTile(batches.flats, bounds),
      boxes: splitByTile(batches.boxes, bounds),
      tubes: splitByTile(batches.tubes, bounds),
      cylinders: splitByTile(batches.cylinders, bounds),
      spheres: splitByTile(batches.spheres, bounds),
      discs: splitByTile(batches.discs, bounds),
      rings: splitByTile(batches.rings, bounds),
    };
  }, [definition, seed, quality, bounds, blockers, landmarks, sockets]);

  const tower = landmarks.find((landmark) => landmark.silhouette === 'tv-tower');

  return (
    <group>
      {layout.flats.map((items, tile) => (
        <Instances key={`f${tile}`} geometry={UNIT_PLANE} items={items} />
      ))}
      {layout.boxes.map((items, tile) => (
        <Instances key={`b${tile}`} geometry={UNIT_BOX} items={items} />
      ))}
      {layout.tubes.map((items, tile) => (
        <Instances key={`t${tile}`} geometry={UNIT_TUBE} items={items} />
      ))}
      {layout.cylinders.map((items, tile) => (
        <Instances key={`c${tile}`} geometry={UNIT_CYLINDER} items={items} />
      ))}
      {layout.spheres.map((items, tile) => (
        <Instances key={`s${tile}`} geometry={UNIT_SPHERE} items={items} />
      ))}
      {layout.discs.map((items, tile) => (
        <Instances key={`d${tile}`} geometry={UNIT_DISC} material={WHITE_DOUBLE} items={items} />
      ))}
      {layout.rings.map((items, tile) => (
        <Instances key={`r${tile}`} geometry={SOCKET_RING} items={items} />
      ))}
      {tower && <TowerMeshes landmark={tower} />}
    </group>
  );
}
