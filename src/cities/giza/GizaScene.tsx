/**
 * Giza scenery. Owner: A4. Scenery only — no rules, pickups, players or camera work.
 * Every solid shape here is derived from a rect in `definition` (blockers, roads, bounds),
 * so the collision world and the map overlay stay the single source of truth.
 * Cosmetic props (rocks, socket pads, skyline beyond bounds) are non-solid and seeded.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import type { CitySceneProps } from '@/cities/CityScenery';
import type { Blocker, CityDefinition, RectXZ, Vec2 } from '@/shared/contracts';
import { createRng, hashSeed } from '@/shared/seed';
import type { Rng } from '@/shared/seed';

/* ---------- palette (docs/ART_DIRECTION.md) ---------- */
const SAND = '#e8b969';
const SAND_PATH = '#f3d9a4';
const STONE_LIGHT = '#eccb93';
const STONE = '#d19a5a';
const STONE_DARK = '#b8834e';
const CLAY = '#c97550';
const CLAY_LIGHT = '#dd9a78';
const PLASTER = '#f4e3c6';
const TEAL = '#19a7a0';
const GOLD = '#ffc857';
const WATER = '#24b8e8';
const PALM_TRUNK = '#8a5a3a';
const PALM_LEAF = '#5fae62';
const ROCK = '#c8a677';
const CANOPY_COLORS = ['#e5533d', TEAL, GOLD, '#f18f3b', '#7b5cc4', '#f4e3c6'] as const;

/* ---------- shared geometry and materials (one instance each, reused by every mesh) ---------- */
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 10);
const UNIT_DISC = new CylinderGeometry(0.5, 0.5, 1, 24);
const UNIT_PYRAMID = new ConeGeometry(Math.SQRT1_2, 1, 4);
const UNIT_SPHERE = new SphereGeometry(0.5, 12, 8);
const UNIT_PLANE = new PlaneGeometry(1, 1);
const ROCK_GEOMETRY = new DodecahedronGeometry(0.5, 0);
const PALM_FROND = new ConeGeometry(0.5, 1, 4);

const MAT = {
  sand: new MeshLambertMaterial({ color: SAND }),
  path: new MeshLambertMaterial({ color: SAND_PATH }),
  stoneLight: new MeshLambertMaterial({ color: STONE_LIGHT, flatShading: true }),
  stone: new MeshLambertMaterial({ color: STONE, flatShading: true }),
  stoneDark: new MeshLambertMaterial({ color: STONE_DARK }),
  clay: new MeshLambertMaterial({ color: CLAY }),
  clayLight: new MeshLambertMaterial({ color: CLAY_LIGHT }),
  plaster: new MeshLambertMaterial({ color: PLASTER }),
  teal: new MeshLambertMaterial({ color: TEAL }),
  gold: new MeshLambertMaterial({ color: GOLD }),
  water: new MeshLambertMaterial({ color: WATER }),
  trunk: new MeshLambertMaterial({ color: PALM_TRUNK }),
  leaf: new MeshLambertMaterial({ color: PALM_LEAF }),
  rock: new MeshLambertMaterial({ color: ROCK, flatShading: true }),
  sphinx: new MeshLambertMaterial({ color: '#d39a6e' }),
  sphinxLight: new MeshLambertMaterial({ color: '#efc9a2' }),
  nemes: new MeshLambertMaterial({ color: '#2b4c7e' }),
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

interface BoxProps {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
  readonly material: MeshLambertMaterial;
  readonly rotationY?: number;
}
/** Axis-aligned box whose base sits at y (not centered) so stacking is easy to reason about. */
function Box({ x, y, z, sx, sy, sz, material, rotationY = 0 }: BoxProps) {
  return (
    <mesh
      geometry={UNIT_BOX}
      material={material}
      position={[x, y + sy / 2, z]}
      scale={[sx, sy, sz]}
      rotation={[0, rotationY, 0]}
    />
  );
}

/* ---------- ground, paths and legibility pads ---------- */
function Ground({ bounds, roads }: Pick<CityDefinition, 'bounds' | 'roads'>) {
  const [width, depth] = sizeOf(bounds);
  const [cx, cz] = centerOf(bounds);
  return (
    <group>
      {/* Oversized sand apron so the camera never sees the world edge. */}
      <mesh
        geometry={UNIT_PLANE}
        material={MAT.sand}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, -0.05, cz]}
        scale={[width * 3, depth * 3, 1]}
      />
      {roads.map((road, index) => {
        const [rw, rd] = sizeOf(road);
        const [rx, rz] = centerOf(road);
        return (
          <mesh
            key={`road-${index}`}
            geometry={UNIT_PLANE}
            material={MAT.path}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[rx, 0.02, rz]}
            scale={[rw, rd, 1]}
          />
        );
      })}
    </group>
  );
}

function StonePad({ x, z, radius, material }: { x: number; z: number; radius: number; material: MeshLambertMaterial }) {
  return (
    <mesh geometry={UNIT_DISC} material={material} position={[x, 0.04, z]} scale={[radius * 2, 0.08, radius * 2]} />
  );
}

/** Round flagstone at every candidate socket and the spawn plaza so pickup spots read from the air. */
function Pads({ definition }: { definition: CityDefinition }) {
  const [sx, , sz] = definition.spawn;
  return (
    <group>
      <StonePad x={sx} z={sz} radius={5} material={MAT.stoneLight} />
      <StonePad x={sx} z={sz} radius={2} material={MAT.teal} />
      {definition.sockets.map((socket) => (
        <group key={socket.id}>
          <StonePad x={socket.position[0]} z={socket.position[2]} radius={2.4} material={MAT.stoneLight} />
          <StonePad x={socket.position[0]} z={socket.position[2]} radius={1.2} material={MAT.stoneDark} />
        </group>
      ))}
    </group>
  );
}

/* ---------- landmarks, each strictly inside its blocker rect ---------- */
function Pyramid({ rect, height, low }: { rect: RectXZ; height: number; low: boolean }) {
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  const base = Math.min(w, d);
  return (
    <group position={[cx, 0, cz]}>
      <mesh
        geometry={UNIT_PYRAMID}
        material={MAT.stone}
        position={[0, height / 2, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[base, height, base]}
      />
      {!low && (
        <>
          {/* Lighter lower course and a shaded plinth so the base reads against the sand. */}
          <mesh
            geometry={UNIT_PYRAMID}
            material={MAT.stoneLight}
            position={[0, height * 0.18, 0]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[base * 1.01, height * 0.36, base * 1.01]}
          />
          <Box x={0} y={0} z={0} sx={w} sy={0.5} sz={d} material={MAT.stoneDark} />
        </>
      )}
    </group>
  );
}

/**
 * Reclining lion facing +Z (south, towards the arrival road and the gameplay camera) so the face
 * and both paws are visible from the elevated camera. Everything stays inside `rect`.
 */
function Sphinx({ rect, low }: { rect: RectXZ; low: boolean }) {
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  const rear = -d / 2 + 2.6;
  const chest = d / 2 - 6.4;
  const paw = d / 2 - 3.4;
  const legX = w * 0.27;
  return (
    <group position={[cx, 0, cz]}>
      <Box x={0} y={0} z={0} sx={w} sy={0.6} sz={d} material={MAT.stoneDark} />
      {/* torso */}
      <Box x={0} y={0.6} z={(rear + chest) / 2} sx={w * 0.46} sy={4.4} sz={chest - rear + 2} material={MAT.sphinx} />
      {/* rear haunches bulge past the torso so the hips read from above */}
      <Box x={-legX} y={0.6} z={rear} sx={2.6} sy={4.9} sz={4.6} material={MAT.sphinxLight} />
      <Box x={legX} y={0.6} z={rear} sx={2.6} sy={4.9} sz={4.6} material={MAT.sphinxLight} />
      {/* front legs ending in paws */}
      <Box x={-legX} y={0.6} z={paw - 1} sx={2.1} sy={1.9} sz={6.6} material={MAT.sphinx} />
      <Box x={legX} y={0.6} z={paw - 1} sx={2.1} sy={1.9} sz={6.6} material={MAT.sphinx} />
      <Box x={-legX} y={0.6} z={paw + 1.6} sx={2.4} sy={2.1} sz={1.4} material={MAT.sphinxLight} />
      <Box x={legX} y={0.6} z={paw + 1.6} sx={2.4} sy={2.1} sz={1.4} material={MAT.sphinxLight} />
      {/* chest rising to the head */}
      <Box x={0} y={0.6} z={chest} sx={w * 0.4} sy={6.4} sz={3.4} material={MAT.sphinx} />
      {/* blue nemes headdress behind and beside a lighter face block */}
      <Box x={0} y={7} z={chest - 1} sx={5} sy={3.8} sz={2.2} material={MAT.nemes} />
      <Box x={0} y={7} z={chest + 0.6} sx={2.6} sy={3.4} sz={2.4} material={MAT.sphinxLight} />
      {!low && (
        <>
          {/* gold brow band, eyes, beard and tail */}
          <Box x={0} y={9.6} z={chest + 0.4} sx={3.2} sy={0.6} sz={2.6} material={MAT.gold} />
          <Box x={-0.7} y={8.4} z={chest + 1.75} sx={0.5} sy={0.4} sz={0.2} material={MAT.nemes} />
          <Box x={0.7} y={8.4} z={chest + 1.75} sx={0.5} sy={0.4} sz={0.2} material={MAT.nemes} />
          <Box x={0} y={5.7} z={chest + 1.9} sx={1} sy={1.5} sz={0.6} material={MAT.nemes} />
          <Box x={legX + 1.7} y={0.6} z={-d / 2 + 0.8} sx={1.6} sy={1} sz={1} material={MAT.sphinx} />
        </>
      )}
    </group>
  );
}

/** Grid of low stalls with coloured canopies, all inside the market blocker. */
function Market({ rect, seed, low }: { rect: RectXZ; seed: number; low: boolean }) {
  const stalls = useMemo(() => {
    const rng = createRng(seed);
    const [w, d] = sizeOf(rect);
    const cols = Math.max(2, Math.floor(w / 5.5));
    const rows = Math.max(2, Math.floor(d / 5.5));
    const cellW = w / cols;
    const cellD = d / rows;
    const list: { x: number; z: number; material: MeshLambertMaterial; twist: number }[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        list.push({
          x: rect.minX + cellW * (c + 0.5),
          z: rect.minZ + cellD * (r + 0.5),
          material: rng.pick(MAT.canopies),
          twist: (rng.next() - 0.5) * 0.4,
        });
      }
    }
    return list;
  }, [rect, seed]);
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);

  return (
    <group>
      <Box x={cx} y={0} z={cz} sx={w} sy={0.3} sz={d} material={MAT.plaster} />
      {stalls.map((stall, index) => (
        <group key={index} position={[stall.x, 0.3, stall.z]} rotation={[0, stall.twist, 0]}>
          <Box x={0} y={0} z={0} sx={3.2} sy={1.2} sz={2} material={MAT.clay} />
          <Box x={0} y={1.2} z={0} sx={2.2} sy={0.5} sz={1.2} material={stall.material} />
          {!low &&
            [-1.5, 1.5].flatMap((px) =>
              [-1, 1].map((pz) => (
                <mesh
                  key={`${px}-${pz}`}
                  geometry={UNIT_CYLINDER}
                  material={MAT.trunk}
                  position={[px, 1.6, pz]}
                  scale={[0.18, 3.2, 0.18]}
                />
              )),
            )}
          <mesh
            geometry={UNIT_PYRAMID}
            material={stall.material}
            position={[0, 3.7, 0]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[4.4, 1.4, 3.2]}
          />
        </group>
      ))}
    </group>
  );
}

function Palm({ x, z, height, lean, low }: { x: number; z: number; height: number; lean: number; low: boolean }) {
  const fronds = low ? 3 : 6;
  return (
    <group position={[x, 0, z]} rotation={[0, lean, 0.08]}>
      <mesh geometry={UNIT_CYLINDER} material={MAT.trunk} position={[0, height / 2, 0]} scale={[0.5, height, 0.5]} />
      {Array.from({ length: fronds }, (_, index) => {
        const angle = (index / fronds) * Math.PI * 2;
        return (
          <mesh
            key={index}
            geometry={PALM_FROND}
            material={MAT.leaf}
            position={[Math.cos(angle) * 1.3, height + 0.2, Math.sin(angle) * 1.3]}
            rotation={[Math.sin(angle) * 1.25, 0, -Math.cos(angle) * 1.25]}
            scale={[1, 3.2, 1]}
          />
        );
      })}
    </group>
  );
}

/** Pool ringed by palms; the whole rect is a blocker so the trunks are never walk-through. */
function Oasis({ rect, seed, low }: { rect: RectXZ; seed: number; low: boolean }) {
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  const palms = useMemo(() => {
    const rng = createRng(seed);
    const count = low ? 5 : 8;
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + rng.next() * 0.4;
      return {
        x: cx + Math.cos(angle) * (w / 2 - 1.6),
        z: cz + Math.sin(angle) * (d / 2 - 1.6),
        height: 5 + rng.next() * 2.5,
        lean: rng.next() * Math.PI * 2,
      };
    });
  }, [cx, cz, w, d, seed, low]);
  return (
    <group>
      <Box x={cx} y={0} z={cz} sx={w} sy={0.35} sz={d} material={MAT.stoneLight} />
      <mesh geometry={UNIT_DISC} material={MAT.water} position={[cx, 0.36, cz]} scale={[w - 5, 0.1, d - 5]} />
      {palms.map((palm, index) => (
        <Palm key={index} {...palm} low={low} />
      ))}
    </group>
  );
}

/** Small cluster of flat-roofed clay houses with a dome and a slim tower. */
function Village({ rect, seed, low }: { rect: RectXZ; seed: number; low: boolean }) {
  const [w, d] = sizeOf(rect);
  const [cx, cz] = centerOf(rect);
  const houses = useMemo(() => {
    const rng = createRng(seed);
    const cols = 3;
    const rows = 3;
    const cellW = w / cols;
    const cellD = d / rows;
    const list: { x: number; z: number; sx: number; sz: number; h: number; material: MeshLambertMaterial }[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        list.push({
          x: rect.minX + cellW * (c + 0.5),
          z: rect.minZ + cellD * (r + 0.5),
          sx: cellW - 0.8,
          sz: cellD - 0.8,
          h: 3 + rng.int(4),
          material: rng.pick([MAT.clay, MAT.clayLight, MAT.plaster]),
        });
      }
    }
    return list;
  }, [rect, w, d, seed]);
  return (
    <group>
      <Box x={cx} y={0} z={cz} sx={w} sy={0.3} sz={d} material={MAT.stoneDark} />
      {houses.map((house, index) => (
        <Box key={index} x={house.x} y={0.3} z={house.z} sx={house.sx} sy={house.h} sz={house.sz} material={house.material} />
      ))}
      <mesh geometry={UNIT_SPHERE} material={MAT.teal} position={[cx, 6.4, cz]} scale={[3.6, 3, 3.6]} />
      <mesh geometry={UNIT_CYLINDER} material={MAT.plaster} position={[rect.maxX - 2, 6, rect.minZ + 2]} scale={[1.4, 12, 1.4]} />
      {!low && <mesh geometry={UNIT_SPHERE} material={MAT.gold} position={[rect.maxX - 2, 12.5, rect.minZ + 2]} scale={[1.6, 1.6, 1.6]} />}
    </group>
  );
}

/* ---------- seeded cosmetic props (non-solid, kept out of every clearance) ---------- */
interface Placement {
  readonly x: number;
  readonly z: number;
  readonly scale: number;
  readonly rotation: number;
}

function scatterRocks(definition: CityDefinition, rng: Rng, count: number): Placement[] {
  const keepOut: RectXZ[] = [
    ...definition.blockers.map((blocker) => inflated(blocker, 3)),
    ...definition.roads.map((road) => inflated(road, 1.5)),
    ...definition.sockets.map((socket) => ({
      minX: socket.position[0] - 5,
      maxX: socket.position[0] + 5,
      minZ: socket.position[2] - 5,
      maxZ: socket.position[2] + 5,
    })),
    { minX: definition.spawn[0] - 8, maxX: definition.spawn[0] + 8, minZ: definition.spawn[2] - 8, maxZ: definition.spawn[2] + 8 },
  ];
  const inner = inflated(definition.bounds, -3);
  const rocks: Placement[] = [];
  let attempts = 0;
  while (rocks.length < count && attempts < count * 12) {
    attempts += 1;
    const x = inner.minX + rng.next() * (inner.maxX - inner.minX);
    const z = inner.minZ + rng.next() * (inner.maxZ - inner.minZ);
    if (keepOut.some((rect) => containsPoint(rect, x, z))) continue;
    rocks.push({ x, z, scale: 0.6 + rng.next() * 1.1, rotation: rng.next() * Math.PI * 2 });
  }
  return rocks;
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
  }, [placements]);
  if (placements.length === 0) return null;
  return <instancedMesh ref={ref} args={[ROCK_GEOMETRY, MAT.rock, placements.length]} frustumCulled={false} />;
}

/** Soft dunes and a low clay skyline placed outside `bounds`, where the player can never walk. */
function Horizon({ bounds, seed }: { bounds: RectXZ; seed: number }) {
  const items = useMemo(() => {
    const rng = createRng(seed);
    const dunes: Placement[] = [];
    const buildings: { x: number; z: number; sx: number; h: number; material: MeshLambertMaterial }[] = [];
    const ring = 14;
    for (let i = 0; i < 26; i += 1) {
      const angle = (i / 26) * Math.PI * 2;
      const radius = (bounds.maxX - bounds.minX) / 2 + ring + rng.next() * 14;
      dunes.push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, scale: 10 + rng.next() * 12, rotation: 0 });
    }
    for (let i = 0; i < 18; i += 1) {
      buildings.push({
        x: bounds.minX + 10 + (i / 18) * (bounds.maxX - bounds.minX - 20) + rng.next() * 4,
        z: bounds.maxZ + 16 + rng.next() * 8,
        sx: 4 + rng.next() * 5,
        h: 4 + rng.next() * 9,
        material: rng.pick([MAT.clay, MAT.clayLight, MAT.plaster]),
      });
    }
    return { dunes, buildings };
  }, [bounds, seed]);
  return (
    <group>
      {items.dunes.map((dune, index) => (
        <mesh
          key={`dune-${index}`}
          geometry={UNIT_SPHERE}
          material={MAT.sand}
          position={[dune.x, -dune.scale * 0.1, dune.z]}
          scale={[dune.scale * 2.2, dune.scale * 0.45, dune.scale * 1.6]}
        />
      ))}
      {items.buildings.map((house, index) => (
        <Box key={`sky-${index}`} x={house.x} y={0} z={house.z} sx={house.sx} sy={house.h} sz={4} material={house.material} />
      ))}
    </group>
  );
}

/* ---------- blocker → scenery dispatch ---------- */
function BlockerScenery({ blocker, seed, low }: { blocker: Blocker; seed: number; low: boolean }) {
  switch (blocker.id) {
    case 'great-pyramid':
      return <Pyramid rect={blocker} height={26} low={low} />;
    case 'sphinx':
      return <Sphinx rect={blocker} low={low} />;
    case 'market':
      return <Market rect={blocker} seed={seed} low={low} />;
    case 'village':
      return <Village rect={blocker} seed={seed} low={low} />;
    default:
      if (blocker.id.startsWith('queen-pyramid')) return <Pyramid rect={blocker} height={9} low={low} />;
      if (blocker.id.startsWith('oasis')) return <Oasis rect={blocker} seed={seed} low={low} />;
      // Unknown blocker: still render a solid so collision and visuals never disagree.
      {
        const [w, d] = sizeOf(blocker);
        const [cx, cz] = centerOf(blocker);
        return <Box x={cx} y={0} z={cz} sx={w} sy={4} sz={d} material={MAT.clay} />;
      }
  }
}

export function GizaScene({ definition, seed, quality }: CitySceneProps) {
  const low = quality === 'low';

  // Independent seeds per prop group: rebuilding one group never reshuffles another.
  const rocks = useMemo(
    () => scatterRocks(definition, createRng(hashSeed(seed, definition.id, 'rocks')), low ? 0 : 80),
    [definition, seed, low],
  );

  return (
    <group>
      <Ground bounds={definition.bounds} roads={definition.roads} />
      <Pads definition={definition} />
      {definition.blockers.map((blocker) => (
        <BlockerScenery
          key={blocker.id}
          blocker={blocker}
          seed={hashSeed(seed, definition.id, blocker.id)}
          low={low}
        />
      ))}
      <Rocks placements={rocks} />
      {!low && <Horizon bounds={definition.bounds} seed={hashSeed(seed, definition.id, 'horizon')} />}
    </group>
  );
}
