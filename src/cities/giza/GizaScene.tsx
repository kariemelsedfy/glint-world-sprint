/**
 * Giza scenery. Owner: A4. Scenery only — no rules, pickups, players or camera work.
 * Every solid shape here is derived from a rect in `definition` (blockers, roads, bounds),
 * so the collision world and the map overlay stay the single source of truth.
 * Cosmetic props (rocks, socket pads, skyline beyond bounds) are non-solid and seeded.
 *
 * Rendering: the whole static set is baked once per (definition, seed, quality) into one merged
 * geometry per material, so the city costs 21 draw calls (standard, incl. one instanced rock mesh) or 16 (low).
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CitySceneProps } from '@/cities/CityScenery';
import type { Blocker, CityDefinition, RectXZ, Vec2 } from '@/shared/contracts';
import { createRng, hashSeed } from '@/shared/seed';
import type { Rng } from '@/shared/seed';

/* ---------- palette (docs/ART_DIRECTION.md) ---------- */
const SAND = '#e8b969';
const SAND_PATH = '#f3d9a4';
const STONE_LIGHT = '#eccb93';
const STONE = '#d19a5a';
const STONE_DARK = '#a8734a';
const CLAY = '#c97550';
const CLAY_LIGHT = '#e0a080';
const PLASTER = '#fff5e9';
const TEAL = '#22c4ea';
const GOLD = '#ffd963';
const PALM_LEAF = '#5fae62';
const ROCK = '#c8a677';
const INK = '#211333';
const SAND_HAZE = '#f9dfc4';
const SHADE = '#c48c44';
/** Arcade palette fabrics: hot pink, cyan, action yellow, warm cream. */
const CANOPY_COLORS = ['#f43fab', TEAL, GOLD, PLASTER] as const;
/** Inverted-hull outline thickness in world units (~3px at the gameplay camera distance). */
const OUTLINE = 0.22;

/* ---------- shared source geometry (low segment counts; everything is baked from these) ---------- */
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 7);
const UNIT_DISC = new CylinderGeometry(0.5, 0.5, 1, 14);
const UNIT_PYRAMID = new ConeGeometry(Math.SQRT1_2, 1, 4);
const UNIT_SPHERE = new SphereGeometry(0.5, 8, 5);
const UNIT_PLANE = new PlaneGeometry(1, 1);
const GROUND_SEGMENTS = 40;
const ROCK_GEOMETRY = new DodecahedronGeometry(0.5, 0);
const PALM_FROND = new ConeGeometry(0.5, 1, 4);

const MAT = {
  sand: new MeshLambertMaterial({ color: SAND }),
  /** Ground plane with baked per-vertex dune shading. */
  dunes: new MeshLambertMaterial({ color: '#ffffff', vertexColors: true }),
  /** Hard offset "drop shadow" discs, opaque so there is no transparency pass. */
  shade: new MeshLambertMaterial({ color: SHADE }),
  /** Chunky ink outline: back faces of a slightly inflated copy of the shape. */
  ink: new MeshLambertMaterial({ color: INK, side: BackSide }),
  path: new MeshLambertMaterial({ color: SAND_PATH }),
  stoneLight: new MeshLambertMaterial({ color: STONE_LIGHT, flatShading: true }),
  stone: new MeshLambertMaterial({ color: STONE, flatShading: true }),
  stoneDark: new MeshLambertMaterial({ color: STONE_DARK }),
  clay: new MeshLambertMaterial({ color: CLAY }),
  clayLight: new MeshLambertMaterial({ color: CLAY_LIGHT }),
  plaster: new MeshLambertMaterial({ color: PLASTER }),
  teal: new MeshLambertMaterial({ color: TEAL }),
  gold: new MeshLambertMaterial({ color: GOLD }),
  leaf: new MeshLambertMaterial({ color: PALM_LEAF }),
  rock: new MeshLambertMaterial({ color: ROCK, flatShading: true }),
  sphinx: new MeshLambertMaterial({ color: '#d39a6e' }),
  nemes: new MeshLambertMaterial({ color: '#7146c5' }),
  canopies: CANOPY_COLORS.map((color) => new MeshLambertMaterial({ color })),
} as const;

/* ---------- rect helpers ---------- */
function centerOf(rect: RectXZ): Vec2 {
  return [(rect.minX + rect.maxX) / 2, (rect.minZ + rect.maxZ) / 2];
}
function sizeOf(rect: RectXZ): Vec2 {
  return [rect.maxX - rect.minX, rect.maxZ - rect.minZ];
}
function inflated(rect: RectXZ, by: number): RectXZ {
  return { minX: rect.minX - by, maxX: rect.maxX + by, minZ: rect.minZ - by, maxZ: rect.maxZ + by };
}
function containsPoint(rect: RectXZ, x: number, z: number): boolean {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

/* ---------- geometry baker: collects transformed copies per material ---------- */
type Vec3 = readonly [number, number, number];

class Baker {
  private readonly parts = new Map<MeshLambertMaterial, BufferGeometry[]>();
  private readonly helper = new Object3D();
  private readonly parent = new Matrix4();

  /** Sets a parent transform applied to every subsequent `place` until `end()`. */
  begin(position: Vec3, rotation: Vec3 = [0, 0, 0]): void {
    this.helper.position.set(...position);
    this.helper.rotation.set(...rotation);
    this.helper.scale.set(1, 1, 1);
    this.helper.updateMatrix();
    this.parent.copy(this.helper.matrix);
  }
  end(): void {
    this.parent.identity();
  }

  /** When true, `place`/`box` also emit an inflated back-face copy into the ink bucket. */
  outlines = false;

  place(source: BufferGeometry, material: MeshLambertMaterial, position: Vec3, scale: Vec3, rotation: Vec3 = [0, 0, 0], outline = this.outlines): void {
    this.push(source, material, position, scale, rotation);
    if (outline) {
      this.push(source, MAT.ink, position, [scale[0] + OUTLINE, scale[1] + OUTLINE, scale[2] + OUTLINE], rotation);
    }
  }

  private push(source: BufferGeometry, material: MeshLambertMaterial, position: Vec3, scale: Vec3, rotation: Vec3): void {
    this.helper.position.set(...position);
    this.helper.rotation.set(...rotation);
    this.helper.scale.set(...scale);
    this.helper.updateMatrix();
    const geometry = source.clone();
    geometry.applyMatrix4(this.helper.matrix.premultiply(this.parent));
    this.add(material, geometry);
  }

  /** Adds an already-transformed geometry (used for the vertex-coloured ground). */
  add(material: MeshLambertMaterial, geometry: BufferGeometry): void {
    const list = this.parts.get(material);
    if (list) list.push(geometry);
    else this.parts.set(material, [geometry]);
  }

  /** Axis-aligned box whose base sits at y (not centered) so stacking is easy to reason about. */
  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, material: MeshLambertMaterial, rotationY = 0, outline = this.outlines): void {
    this.place(UNIT_BOX, material, [x, y + sy / 2, z], [sx, sy, sz], [0, rotationY, 0], outline);
  }

  /** Hard offset drop shadow on the ground, pushed away from the app's sun (+x, +z). */
  shadow(x: number, z: number, rx: number, rz: number, y = 0): void {
    if (!this.outlines) return;
    this.place(UNIT_DISC, MAT.shade, [x - rx * 0.22, y + 0.012, z - rz * 0.22], [rx * 2.2, 0.01, rz * 2.2], [0, 0, 0], false);
  }

  bake(): { material: MeshLambertMaterial; geometry: BufferGeometry }[] {
    const out: { material: MeshLambertMaterial; geometry: BufferGeometry }[] = [];
    for (const [material, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      for (const part of list) part.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      out.push({ material, geometry: merged });
    }
    return out;
  }
}

/* ---------- ground, paths and legibility pads ---------- */
function bakeGround(b: Baker, { bounds, roads }: Pick<CityDefinition, 'bounds' | 'roads'>, rng: Rng, low: boolean): void {
  const [width, depth] = sizeOf(bounds);
  const [cx, cz] = centerOf(bounds);
  // Oversized flat sand apron so the camera never sees the world edge. Dune shading is baked into
  // vertex colours (soft diagonal wind ripples plus seeded speckle), never into height: the ground
  // stays at y=0 everywhere the player can walk.
  const ground = new PlaneGeometry(width * 3, depth * 3, GROUND_SEGMENTS, GROUND_SEGMENTS);
  const positions = ground.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  const sand = new Color(SAND);
  const haze = new Color(SAND_HAZE);
  const tint = new Color();
  const half = Math.max(width, depth) / 2;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const ripple = Math.sin(x * 0.11 + y * 0.07) * 0.5 + Math.sin(x * 0.031 - y * 0.045) * 0.5;
    const shade = 1 + ripple * 0.07 + (rng.next() - 0.5) * 0.04;
    // Sand-to-sky gradient: the far apron fades towards the hazy horizon tone.
    const distance = Math.min(1, Math.max(0, (Math.hypot(x, y) - half * 0.8) / (half * 1.6)));
    tint.copy(sand).multiplyScalar(shade).lerp(haze, distance * distance);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  ground.setAttribute('color', new Float32BufferAttribute(colors, 3));
  ground.rotateX(-Math.PI / 2);
  ground.translate(cx, -0.05, cz);
  b.add(MAT.dunes, ground);

  for (const road of roads) {
    const [rw, rd] = sizeOf(road);
    const [rx, rz] = centerOf(road);
    b.place(UNIT_PLANE, MAT.path, [rx, 0.02, rz], [rw, rd, 1], [-Math.PI / 2, 0, 0], false);
    if (low) continue;
    // Flagstone kerbs along both long edges so the paths read as laid stone, not painted sand.
    const alongX = rw >= rd;
    for (const side of [-1, 1]) {
      const kx = alongX ? rx : rx + (side * (rw - 0.6)) / 2;
      const kz = alongX ? rz + (side * (rd - 0.6)) / 2 : rz;
      b.place(UNIT_PLANE, MAT.stoneDark, [kx, 0.025, kz], alongX ? [rw, 0.6, 1] : [0.6, rd, 1], [-Math.PI / 2, 0, 0], false);
    }
    // Sparse cross-joints, deterministic spacing.
    const length = alongX ? rw : rd;
    for (let t = -length / 2 + 6; t < length / 2; t += 12) {
      const jx = alongX ? rx + t : rx;
      const jz = alongX ? rz : rz + t;
      b.place(UNIT_PLANE, MAT.stoneLight, [jx, 0.025, jz], alongX ? [0.5, rd - 1.2, 1] : [rd - 1.2, 0.5, 1], [-Math.PI / 2, 0, 0], false);
    }
  }
}

function pad(b: Baker, x: number, z: number, radius: number, material: MeshLambertMaterial): void {
  b.place(UNIT_DISC, material, [x, 0.04, z], [radius * 2, 0.08, radius * 2], [0, 0, 0], false);
}

/** Round flagstone at every candidate socket and the spawn plaza so pickup spots read from the air. */
function bakePads(b: Baker, definition: CityDefinition): void {
  const [sx, , sz] = definition.spawn;
  pad(b, sx, sz, 5, MAT.stoneLight);
  pad(b, sx, sz, 2, MAT.teal);
  for (const socket of definition.sockets) {
    pad(b, socket.position[0], socket.position[2], 2.4, MAT.stoneLight);
    pad(b, socket.position[0], socket.position[2], 1.2, MAT.stoneDark);
  }
}

/* ---------- landmarks, each strictly inside its blocker rect ---------- */
function bakePyramid(b: Baker, rect: RectXZ, height: number, low: boolean): void {
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  const base = Math.min(w, d);
  b.shadow(cx, cz, w / 2, d / 2);
  b.place(UNIT_PYRAMID, MAT.stone, [cx, height / 2, cz], [base, height, base], [0, Math.PI / 4, 0]);
  // Highlighted gold pyramidion on the top face.
  b.place(UNIT_PYRAMID, MAT.gold, [cx, height * 0.93, cz], [base * 0.14, height * 0.14, base * 0.14], [0, Math.PI / 4, 0], false);
  if (low) return;
  // Stepped stone courses (alternating tones) so the silhouette reads as masonry, plus a shaded plinth.
  for (const [level, material] of [
    [0.18, MAT.stoneLight],
    [0.42, MAT.stoneDark],
    [0.62, MAT.stoneLight],
  ] as const) {
    const s = 1 - level;
    b.place(UNIT_PYRAMID, material, [cx, height * (level + s * 0.06), cz], [base * s * 1.01, height * s * 0.12, base * s * 1.01], [0, Math.PI / 4, 0], false);
  }
  b.box(cx, 0, cz, w, 0.5, d, MAT.stoneDark, 0, false);
  b.box(cx, 0.5, cz, w - 1, 0.3, d - 1, MAT.stoneLight, 0, false);
}

/**
 * Flat, non-solid approach from a landmark's footprint to the nearest road: sled tracks for the
 * quarry side, pale processional stone for the Sphinx. Purely a ground decal, never a collider.
 */
function bakeCauseway(b: Baker, rect: RectXZ, roads: readonly RectXZ[], tracks: boolean): void {
  const [cx, cz] = centerOf(rect);
  let best: { gap: number; from: number; to: number; alongX: boolean } | null = null;
  for (const road of roads) {
    const candidates = [
      { gap: road.minX - rect.maxX, from: rect.maxX, to: road.minX, alongX: true },
      { gap: rect.minX - road.maxX, from: road.maxX, to: rect.minX, alongX: true },
      { gap: road.minZ - rect.maxZ, from: rect.maxZ, to: road.minZ, alongX: false },
      { gap: rect.minZ - road.maxZ, from: road.maxZ, to: rect.minZ, alongX: false },
    ];
    for (const c of candidates) {
      const spans = c.alongX ? cz >= road.minZ && cz <= road.maxZ : cx >= road.minX && cx <= road.maxX;
      if (c.gap > 0 && spans && (!best || c.gap < best.gap)) best = c;
    }
  }
  if (!best) return;
  const length = best.to - best.from;
  const mid = (best.from + best.to) / 2;
  const at = (offset: number): Vec3 => (best.alongX ? [mid, 0.03, cz + offset] : [cx + offset, 0.03, mid]);
  const size = (w: number): Vec3 => (best.alongX ? [length, w, 1] : [w, length, 1]);
  if (tracks) {
    for (const offset of [-1.1, 1.1]) b.place(UNIT_PLANE, MAT.stoneDark, at(offset), size(0.35), [-Math.PI / 2, 0, 0], false);
    for (let t = -length / 2 + 1; t < length / 2; t += 2.5) {
      const p: Vec3 = best.alongX ? [mid + t, 0.035, cz] : [cx, 0.035, mid + t];
      b.place(UNIT_PLANE, MAT.stoneDark, p, best.alongX ? [0.3, 2.6, 1] : [2.6, 0.3, 1], [-Math.PI / 2, 0, 0], false);
    }
  } else {
    b.place(UNIT_PLANE, MAT.stoneLight, at(0), size(4), [-Math.PI / 2, 0, 0], false);
    for (const offset of [-2.2, 2.2]) b.place(UNIT_PLANE, MAT.stoneDark, at(offset), size(0.4), [-Math.PI / 2, 0, 0], false);
  }
}

/**
 * Reclining lion facing +Z (south, towards the arrival road and the gameplay camera) so the face
 * and both paws are visible from the elevated camera. Everything stays inside `rect`.
 */
function bakeSphinx(b: Baker, rect: RectXZ, low: boolean): void {
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  const rear = -d / 2 + 2.6;
  const chest = d / 2 - 6.4;
  const paw = d / 2 - 3.4;
  const legX = w * 0.27;
  b.shadow(cx, cz, w / 2, d / 2);
  b.begin([cx, 0, cz]);
  b.box(0, 0, 0, w, 0.6, d, MAT.stoneDark, 0, false);
  // torso
  b.box(0, 0.6, (rear + chest) / 2, w * 0.46, 4.4, chest - rear + 2, MAT.sphinx);
  // rear haunches bulge past the torso so the hips read from above
  b.box(-legX, 0.6, rear, 2.6, 4.9, 4.6, MAT.stoneLight);
  b.box(legX, 0.6, rear, 2.6, 4.9, 4.6, MAT.stoneLight);
  // front legs ending in paws
  b.box(-legX, 0.6, paw - 1, 2.1, 1.9, 6.6, MAT.sphinx);
  b.box(legX, 0.6, paw - 1, 2.1, 1.9, 6.6, MAT.sphinx);
  b.box(-legX, 0.6, paw + 1.6, 2.4, 2.1, 1.4, MAT.stoneLight);
  b.box(legX, 0.6, paw + 1.6, 2.4, 2.1, 1.4, MAT.stoneLight);
  // chest rising to the head
  b.box(0, 0.6, chest, w * 0.4, 6.4, 3.4, MAT.sphinx);
  // purple nemes headdress behind and beside a lighter face block (oversized for silhouette)
  b.box(0, 7, chest - 1, 6, 4.4, 2.4, MAT.nemes);
  b.box(0, 7, chest + 0.6, 3.2, 3.8, 2.6, MAT.stoneLight);
  if (!low) {
    // gold nemes stripes, brow band, eyes, beard and tail
    for (const sx of [-2.6, 2.6]) b.box(sx, 7.2, chest - 1, 0.5, 4, 2.6, MAT.gold, 0, false);
    b.box(0, 10.3, chest + 0.4, 3.8, 0.6, 2.8, MAT.gold);
    b.box(-0.7, 8.4, chest + 1.75, 0.5, 0.4, 0.2, MAT.ink, 0, false);
    b.box(0.7, 8.4, chest + 1.75, 0.5, 0.4, 0.2, MAT.ink, 0, false);
    b.box(0, 5.7, chest + 1.9, 1, 1.5, 0.6, MAT.nemes);
    b.box(legX + 1.7, 0.6, -d / 2 + 0.8, 1.6, 1, 1, MAT.sphinx);
  }
  b.end();
}

/** Grid of low stalls with coloured canopies, all inside the market blocker. */
function bakeMarket(b: Baker, rect: RectXZ, seed: number, low: boolean): void {
  const rng = createRng(seed);
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  const cols = Math.max(2, Math.floor(w / 5.5));
  const rows = Math.max(2, Math.floor(d / 5.5));
  const cellW = w / cols;
  const cellD = d / rows;
  b.box(cx, 0, cz, w, 0.3, d, MAT.plaster, 0, false);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = rect.minX + cellW * (c + 0.5);
      const z = rect.minZ + cellD * (r + 0.5);
      const material = rng.pick(MAT.canopies);
      const goods = rng.pick(MAT.canopies);
      const twist = (rng.next() - 0.5) * 0.4;
      b.shadow(x, z, 2.4, 1.8, 0.3);
      b.begin([x, 0.3, z], [0, twist, 0]);
      b.box(0, 0, 0, 3.2, 1.2, 2, rng.pick([MAT.clay, MAT.clayLight]));
      // Fabric bolts stacked on the counter.
      b.box(-0.7, 1.2, 0, 1.1, 0.5, 1.2, goods, 0, false);
      b.box(0.7, 1.2, 0.1, 1.1, 0.7, 1, material, 0, false);
      if (!low) {
        for (const px of [-1.5, 1.5]) {
          for (const pz of [-1, 1]) b.place(UNIT_CYLINDER, MAT.stoneDark, [px, 1.6, pz], [0.18, 3.2, 0.18], [0, 0, 0], false);
        }
        // Scalloped awning fringe under the canopy.
        b.box(0, 3.05, 1.55, 4.2, 0.35, 0.25, material, 0, false);
      }
      b.place(UNIT_PYRAMID, material, [0, 3.7, 0], [4.4, 1.4, 3.2], [0, Math.PI / 4, 0]);
      b.end();
    }
  }
  if (!low) {
    // Pottery clusters in the four corners of the market slab (inside the blocker).
    for (const [px, pz] of [
      [rect.minX + 1.4, rect.minZ + 1.4],
      [rect.maxX - 1.4, rect.minZ + 1.4],
      [rect.minX + 1.4, rect.maxZ - 1.4],
      [rect.maxX - 1.4, rect.maxZ - 1.4],
    ]) {
      bakePots(b, px, 0.3, pz, rng);
    }
  }
}

/** Small cluster of clay pots and amphorae; base sits at y. */
function bakePots(b: Baker, x: number, y: number, z: number, rng: Rng): void {
  const count = 2 + rng.int(2);
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + rng.next();
    const px = x + Math.cos(angle) * 0.7;
    const pz = z + Math.sin(angle) * 0.7;
    const size = 0.7 + rng.next() * 0.5;
    const material = rng.pick([MAT.clay, MAT.clayLight, MAT.teal, MAT.gold]);
    b.place(UNIT_SPHERE, material, [px, y + size * 0.55, pz], [size, size * 1.1, size]);
    b.place(UNIT_CYLINDER, MAT.stoneDark, [px, y + size * 1.15, pz], [size * 0.5, size * 0.3, size * 0.5], [0, 0, 0], false);
  }
}

function bakePalm(b: Baker, x: number, z: number, height: number, lean: number, low: boolean): void {
  const fronds = low ? 3 : 5;
  b.shadow(x, z, 1.6, 1.6);
  b.begin([x, 0, z], [0, lean, 0.08]);
  b.place(UNIT_CYLINDER, MAT.stoneDark, [0, height / 2, 0], [0.5, height, 0.5]);
  if (!low) b.place(UNIT_SPHERE, MAT.clay, [0, height + 0.1, 0], [1, 0.8, 1], [0, 0, 0], false);
  for (let index = 0; index < fronds; index += 1) {
    const angle = (index / fronds) * Math.PI * 2;
    b.place(
      PALM_FROND,
      MAT.leaf,
      [Math.cos(angle) * 1.3, height + 0.2, Math.sin(angle) * 1.3],
      [1, 3.2, 1],
      [Math.sin(angle) * 1.25, 0, -Math.cos(angle) * 1.25],
    );
  }
  b.end();
}

/** Pool ringed by palms; the whole rect is a blocker so the trunks are never walk-through. */
function bakeOasis(b: Baker, rect: RectXZ, seed: number, low: boolean): void {
  const rng = createRng(seed);
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  b.box(cx, 0, cz, w, 0.35, d, MAT.stoneLight, 0, false);
  b.place(UNIT_DISC, MAT.stoneDark, [cx, 0.36, cz], [w - 4, 0.1, d - 4], [0, 0, 0], false);
  b.place(UNIT_DISC, MAT.teal, [cx, 0.4, cz], [w - 5, 0.1, d - 5], [0, 0, 0], false);
  if (!low) b.place(UNIT_DISC, MAT.plaster, [cx + 1, 0.46, cz - 1], [(w - 5) * 0.35, 0.1, (d - 5) * 0.25], [0, 0, 0], false);
  const count = low ? 4 : 7;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + rng.next() * 0.4;
    bakePalm(
      b,
      cx + Math.cos(angle) * (w / 2 - 1.6),
      cz + Math.sin(angle) * (d / 2 - 1.6),
      5 + rng.next() * 2.5,
      rng.next() * Math.PI * 2,
      low,
    );
  }
}

/** Small cluster of flat-roofed clay houses with a dome and a slim tower. */
function bakeVillage(b: Baker, rect: RectXZ, seed: number, low: boolean): void {
  const rng = createRng(seed);
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  const cellW = w / 3;
  const cellD = d / 3;
  b.box(cx, 0, cz, w, 0.3, d, MAT.stoneDark, 0, false);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const x = rect.minX + cellW * (c + 0.5);
      const z = rect.minZ + cellD * (r + 0.5);
      const hw = cellW - 1.4;
      const hd = cellD - 1.4;
      const h = 3 + rng.int(4);
      const wall = rng.pick([MAT.clay, MAT.clayLight, MAT.plaster]);
      b.shadow(x, z, hw / 2, hd / 2, 0.3);
      b.box(x, 0.3, z, hw, h, hd, wall);
      // Highlighted flat roof slab and a stepped parapet.
      b.box(x, 0.3 + h, z, hw + 0.2, 0.3, hd + 0.2, MAT.plaster, 0, false);
      if (low) continue;
      b.box(x, 0.6 + h, z, hw * 0.5, 0.6, hd * 0.5, wall, 0, false);
      // Fabric awning over the door on the sunny (+z) side, and a pot by the wall.
      b.box(x, 0.3 + h * 0.55, z + hd / 2 + 0.25, hw * 0.6, 0.2, 0.55, rng.pick(MAT.canopies), 0, false);
      b.box(x, 0.3, z + hd / 2 - 0.05, 1, 1.8, 0.1, MAT.ink, 0, false);
      if (rng.next() < 0.6) bakePots(b, x + hw / 2 - 0.3, 0.3, z - hd / 2 + 0.4, rng);
    }
  }
  b.place(UNIT_SPHERE, MAT.teal, [cx, 6.4, cz], [3.6, 3, 3.6]);
  b.place(UNIT_CYLINDER, MAT.plaster, [rect.maxX - 2, 6, rect.minZ + 2], [1.4, 12, 1.4]);
  if (!low) b.place(UNIT_SPHERE, MAT.gold, [rect.maxX - 2, 12.5, rect.minZ + 2], [1.6, 1.6, 1.6]);
}

/** Soft dunes and a low clay skyline placed outside `bounds`, where the player can never walk. */
function bakeHorizon(b: Baker, bounds: RectXZ, seed: number): void {
  const rng = createRng(seed);
  const half = (bounds.maxX - bounds.minX) / 2;
  // Two depth layers: a near ring of warm dunes and a far, paler ring for atmospheric depth.
  const near = 14;
  for (let i = 0; i < near; i += 1) {
    const angle = (i / near) * Math.PI * 2;
    const radius = half + 14 + rng.next() * 14;
    const scale = 10 + rng.next() * 12;
    b.place(UNIT_SPHERE, MAT.sand, [Math.cos(angle) * radius, -scale * 0.1, Math.sin(angle) * radius], [scale * 2.2, scale * 0.45, scale * 1.6], [0, 0, 0], false);
  }
  const far = 10;
  for (let i = 0; i < far; i += 1) {
    const angle = (i / far) * Math.PI * 2 + 0.3;
    const radius = half + 44 + rng.next() * 16;
    const scale = 18 + rng.next() * 14;
    b.place(UNIT_SPHERE, MAT.path, [Math.cos(angle) * radius, -scale * 0.12, Math.sin(angle) * radius], [scale * 2.6, scale * 0.5, scale * 1.8], [0, 0, 0], false);
  }
  // Low mudbrick town on the southern horizon with lit roof slabs.
  for (let i = 0; i < 14; i += 1) {
    const x = bounds.minX + 10 + (i / 14) * (bounds.maxX - bounds.minX - 20) + rng.next() * 4;
    const z = bounds.maxZ + 16 + rng.next() * 8;
    const w = 4 + rng.next() * 5;
    const h = 4 + rng.next() * 9;
    b.box(x, 0, z, w, h, 4, rng.pick([MAT.clay, MAT.clayLight, MAT.plaster]));
    b.box(x, h, z, w + 0.3, 0.4, 4.3, MAT.plaster, 0, false);
  }
}

/* ---------- district identity: non-solid props scattered around each search circle ---------- */
type Circle = { readonly center: Vec2; readonly radius: number };

function keepOutRects(definition: CityDefinition): RectXZ[] {
  return [
    ...definition.blockers.map((blocker) => inflated(blocker, 2.5)),
    ...definition.roads.map((road) => inflated(road, 1.5)),
    ...definition.sockets.map((socket) => ({
      minX: socket.position[0] - 5,
      maxX: socket.position[0] + 5,
      minZ: socket.position[2] - 5,
      maxZ: socket.position[2] + 5,
    })),
    { minX: definition.spawn[0] - 8, maxX: definition.spawn[0] + 8, minZ: definition.spawn[2] - 8, maxZ: definition.spawn[2] + 8 },
  ];
}

/** Seeded points inside `circle`, inside bounds and outside every keep-out rect. */
function scatterIn(circle: Circle, definition: CityDefinition, keepOut: readonly RectXZ[], rng: Rng, count: number): Vec2[] {
  const inner = inflated(definition.bounds, -3);
  const out: Vec2[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 14) {
    attempts += 1;
    const angle = rng.next() * Math.PI * 2;
    const r = Math.sqrt(rng.next()) * circle.radius;
    const x = circle.center[0] + Math.cos(angle) * r;
    const z = circle.center[1] + Math.sin(angle) * r;
    if (!containsPoint(inner, x, z) || keepOut.some((rect) => containsPoint(rect, x, z))) continue;
    out.push([x, z]);
  }
  return out;
}

function bakeDistricts(b: Baker, definition: CityDefinition, seed: number): void {
  const keepOut = keepOutRects(definition);
  for (const district of definition.districts) {
    const rng = createRng(hashSeed(seed, definition.id, 'district', district.id));
    const circle = district.broadSearch;
    switch (district.id) {
      case 'market': {
        // Rugs laid out for sale and crates of goods.
        for (const [x, z] of scatterIn(circle, definition, keepOut, rng, 9)) {
          b.place(UNIT_PLANE, rng.pick(MAT.canopies), [x, 0.03, z], [2.2 + rng.next(), 1.4 + rng.next(), 1], [-Math.PI / 2, 0, rng.next() * Math.PI]);
        }
        for (const [x, z] of scatterIn(circle, definition, keepOut, rng, 8)) {
          const turn = rng.next() * Math.PI;
          b.shadow(x, z, 0.7, 0.7);
          b.box(x, 0, z, 1, 0.9, 1, rng.pick([MAT.stoneDark, MAT.clay]), turn);
          if (rng.next() < 0.5) b.box(x + 0.15, 0.9, z - 0.1, 0.8, 0.7, 0.8, MAT.clayLight, turn + 0.3);
          else bakePots(b, x + 0.9, 0, z + 0.4, rng);
        }
        break;
      }
      case 'pyramids': {
        // Quarry: dressed stone blocks waiting on the sled tracks, plus rubble (extra rocks).
        for (const [x, z] of scatterIn(circle, definition, keepOut, rng, 7)) {
          const turn = (rng.next() - 0.5) * 0.6;
          b.shadow(x, z, 1.1, 0.9);
          b.box(x, 0, z, 2, 1.1, 1.4, rng.pick([MAT.stoneLight, MAT.stone]), turn);
          if (rng.next() < 0.4) b.box(x, 1.1, z, 1.4, 0.9, 1.1, MAT.stoneLight, turn);
        }
        break;
      }
      default: {
        // Terrace: flagstone clusters so the plateau around the anchor reads as paved.
        for (const [x, z] of scatterIn(circle, definition, keepOut, rng, 10)) {
          b.place(UNIT_PLANE, rng.pick([MAT.stoneLight, MAT.path]), [x, 0.028, z], [2.4 + rng.next() * 2, 2.4 + rng.next() * 2, 1], [-Math.PI / 2, 0, rng.next() * 0.3]);
        }
      }
    }
  }
}

/* ---------- blocker → scenery dispatch ---------- */
function bakeBlocker(b: Baker, blocker: Blocker, roads: readonly RectXZ[], seed: number, low: boolean): void {
  switch (blocker.id) {
    case 'great-pyramid':
      if (!low) bakeCauseway(b, blocker, roads, true);
      return bakePyramid(b, blocker, 30, low);
    case 'sphinx':
      if (!low) bakeCauseway(b, blocker, roads, false);
      return bakeSphinx(b, blocker, low);
    case 'market':
      return bakeMarket(b, blocker, seed, low);
    case 'village':
      return bakeVillage(b, blocker, seed, low);
    default: {
      if (blocker.id.startsWith('queen-pyramid')) return bakePyramid(b, blocker, 11, low);
      if (blocker.id.startsWith('oasis')) return bakeOasis(b, blocker, seed, low);
      // Unknown blocker: still render a solid so collision and visuals never disagree.
      const [w, d] = sizeOf(blocker);
      const [cx, cz] = centerOf(blocker);
      b.shadow(cx, cz, w / 2, d / 2);
      b.box(cx, 0, cz, w, 4, d, MAT.clay);
    }
  }
}

/* ---------- seeded cosmetic props (non-solid, kept out of every clearance) ---------- */
interface Placement {
  readonly x: number;
  readonly z: number;
  readonly scale: number;
  readonly rotation: number;
}

/** Rocks everywhere, plus a dense rubble field in the quarry (pyramids) district. */
function scatterRocks(definition: CityDefinition, rng: Rng, count: number): Placement[] {
  if (count === 0) return [];
  const keepOut = keepOutRects(definition);
  const [cx, cz] = centerOf(definition.bounds);
  const [w, d] = sizeOf(definition.bounds);
  const everywhere: Circle = { center: [cx, cz], radius: Math.hypot(w, d) / 2 };
  const quarry = definition.districts.find((district) => district.id === 'pyramids')?.broadSearch;
  const points = [
    ...scatterIn(everywhere, definition, keepOut, rng, count),
    ...(quarry ? scatterIn(quarry, definition, keepOut, rng, Math.round(count * 0.6)) : []),
  ];
  return points.map(([x, z]) => ({ x, z, scale: 0.6 + rng.next() * 1.1, rotation: rng.next() * Math.PI * 2 }));
}

function Rocks({ placements }: { placements: readonly Placement[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    placements.forEach((rock, index) => {
      dummy.position.set(rock.x, rock.scale * 0.3, rock.z);
      dummy.rotation.set(0, rock.rotation, 0);
      dummy.scale.set(rock.scale, rock.scale * 0.7, rock.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements]);
  if (placements.length === 0) return null;
  return <instancedMesh ref={ref} args={[ROCK_GEOMETRY, MAT.rock, placements.length]} />;
}

export function GizaScene({ definition, seed, quality }: CitySceneProps) {
  const low = quality === 'low';

  // Independent seeds per group: rebuilding one group never reshuffles another.
  const baked = useMemo(() => {
    const b = new Baker();
    // Outlines and drop shadows are the arcade look; low quality drops both (layout unchanged).
    b.outlines = !low;
    bakeGround(b, definition, createRng(hashSeed(seed, definition.id, 'ground')), low);
    bakePads(b, definition);
    for (const blocker of definition.blockers) bakeBlocker(b, blocker, definition.roads, hashSeed(seed, definition.id, blocker.id), low);
    if (!low) {
      bakeDistricts(b, definition, seed);
      bakeHorizon(b, definition.bounds, hashSeed(seed, definition.id, 'horizon'));
    }
    return b.bake();
  }, [definition, seed, low]);
  useEffect(() => () => baked.forEach((part) => part.geometry.dispose()), [baked]);

  const rocks = useMemo(
    () => scatterRocks(definition, createRng(hashSeed(seed, definition.id, 'rocks')), low ? 0 : 60),
    [definition, seed, low],
  );

  return (
    <group>
      {baked.map((part, index) => (
        <mesh key={index} geometry={part.geometry} material={part.material} />
      ))}
      <Rocks placements={rocks} />
    </group>
  );
}
