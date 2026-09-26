/**
 * Cartoon hero globe. Owner: A2.
 * Renders a toy Earth with cloud and atmosphere shells, seeded stars and selectable
 * city markers. Reads `travelSignal` every frame to turn and dive toward a destination.
 * Never reads or mutates run state; the camera stays owned by SceneHost.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  Group,
  MeshBasicMaterial,
  MeshToonMaterial,
  Mesh,
  PointsMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  Matrix4,
  Quaternion,
  AdditiveBlending,
  BackSide,
} from 'three';
import type { CityId, Quality } from '@/shared/contracts';
import { createRng, hashSeed } from '@/shared/seed';
import { getEarthTexture, getGlowTexture } from '@/world/earthTextures';
import { travelSignal } from '@/world/travelSignal';
import { easeInOutCubic } from '@/world/travelTimeline';

export const GLOBE_RADIUS = 10;
const IDLE_SPIN_RAD_PER_S = 0.07;
const IDLE_TILT_RAD = 0.32;
const DIVE_SCALE = 2.45;
/** Pins facing away from the camera beyond this dot product are hidden and unclickable. */
const VISIBLE_DOT = 0.12;
/** Cities closer than this (degrees, great-circle-ish) fan their labels apart instead of stacking. */
const CLUSTER_DEG = 16;
/** Labels whose screen centres sit closer than this many CSS px collapse to the higher-priority pin. */
const LABEL_LIFT = 0.9;
const LABEL_ROW_PX = 40;

/** Viewports where the globe is small on screen (phones, landscape touch): smaller labels, wider fan-out. */
export function isCompactViewport(width: number, height: number): boolean {
  return width < 720 || height < 480;
}

/** Extra world-unit fan-out for small viewports so labels don't all collapse onto Europe. */
export function labelLiftScale(width: number, height: number): number {
  const shortest = Math.min(width, height * 1.4);
  return Math.min(1.8, Math.max(1, 720 / Math.max(1, shortest)));
}

export function estimateLabelWidthPx(label: string, compact: boolean): number {
  const fontPx = compact ? 12 : 15;
  const padX = compact ? 10 : 14;
  return label.length * fontPx * 0.68 + padX * 2 + 6;
}

const INK = '#211333';
const CREAM = '#fff5e9';
const YELLOW = '#ffd963';
const LAVENDER = '#b6a1e8';

export interface GlobeCity {
  readonly id: CityId;
  readonly label: string;
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly accentColor: string;
}

export interface GlobeSceneProps {
  readonly cities: readonly GlobeCity[];
  readonly interactive: boolean;
  /** Defaults to 'standard'; 'low' drops the glow, stars and lighting and uses a coarser sphere. */
  readonly quality?: Quality;
  onSelectCity(id: CityId): void;
}

export function latLonToVec3(latDeg: number, lonDeg: number, radius: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return [
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  ];
}

/** Euler (tilt about X, spin about Y) that brings a lat/lon to face a camera at the given elevation. */
export function facingRotation(latDeg: number, lonDeg: number, cameraElevationRad: number): { tilt: number; spin: number } {
  return {
    spin: (-lonDeg * Math.PI) / 180,
    tilt: (latDeg * Math.PI) / 180 - cameraElevationRad,
  };
}

/** Dot product of a marker's outward normal with the camera direction; hidden hemisphere is negative. */
export function markerFacing(markerWorld: Vector3, cameraPosition: Vector3): number {
  const denominator = markerWorld.length() * cameraPosition.length();
  return denominator === 0 ? 0 : markerWorld.dot(cameraPosition) / denominator;
}

/**
 * Per-city label offset in the pin's tangent plane (local x right, y up, in globe units). Cities inside a
 * cluster push away from the cluster centroid so three European labels read as three, not one stack.
 */
export function labelOffsets(cities: readonly GlobeCity[], liftScale = 1): Map<CityId, readonly [number, number]> {
  const lift = LABEL_LIFT * liftScale;
  const result = new Map<CityId, readonly [number, number]>();
  for (const city of cities) {
    let sumLat = 0;
    let sumLon = 0;
    let count = 0;
    for (const other of cities) {
      const dLat = other.latDeg - city.latDeg;
      const dLon = (other.lonDeg - city.lonDeg) * Math.cos((city.latDeg * Math.PI) / 180);
      if (Math.hypot(dLat, dLon) < CLUSTER_DEG) {
        sumLat += other.latDeg;
        sumLon += other.lonDeg;
        count += 1;
      }
    }
    if (count <= 1) {
      result.set(city.id, [0, lift]);
      continue;
    }
    const awayLat = city.latDeg - sumLat / count;
    const awayLon = (city.lonDeg - sumLon / count) * Math.cos((city.latDeg * Math.PI) / 180);
    const length = Math.hypot(awayLat, awayLon) || 1;
    // Local +x is east, +y is north on the outward-facing pin frame.
    result.set(city.id, [(awayLon / length) * lift * 0.9, (awayLat / length) * lift * 0.9 + 0.6 * liftScale]);
  }
  return result;
}

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

// Reusable geometry and materials: created once per module, shared by all mounts.
const earthGeometry = new SphereGeometry(GLOBE_RADIUS, 40, 28);
const earthGeometryLow = new SphereGeometry(GLOBE_RADIUS, 28, 20);
// Glow is an annulus hugging the silhouette so only the halo band pays fragment cost, not the whole disc.
// RingGeometry maps UVs over a 2*outer square, which matches the radial glow texture exactly.
const GLOW_OUTER = GLOBE_RADIUS * 1.25;
const glowGeometry = new RingGeometry(GLOBE_RADIUS * 0.985, GLOW_OUTER, 48, 1);
const pinStemGeometry = new ConeGeometry(0.3, 1.4, 8);
const pinHeadGeometry = new SphereGeometry(0.55, 12, 8);
// Slightly larger back-face sphere gives the head a chunky ink outline for free (no post-processing).
const pinOutlineGeometry = new SphereGeometry(0.68, 12, 8);
const focusRingGeometry = new TorusGeometry(1.25, 0.1, 6, 28);

let glowMaterial: MeshBasicMaterial | null = null;
function getGlowMaterial(): MeshBasicMaterial {
  glowMaterial ??= new MeshBasicMaterial({
    map: getGlowTexture(),
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  return glowMaterial;
}
const pinStemMaterial = new MeshToonMaterial({ color: new Color(CREAM) });
const pinOutlineMaterial = new MeshBasicMaterial({ color: new Color(INK), side: BackSide });
const focusRingMaterial = new MeshBasicMaterial({ color: new Color(YELLOW) });
const starMaterial = new PointsMaterial({ color: new Color('#dfe9ff'), size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.9 });

const pinHeadMaterials = new Map<string, MeshToonMaterial>();
function pinHeadMaterial(color: string): MeshToonMaterial {
  let material = pinHeadMaterials.get(color);
  if (!material) {
    material = new MeshToonMaterial({ color: new Color(color), emissive: new Color(color), emissiveIntensity: 0.28, toneMapped: false });
    pinHeadMaterials.set(color, material);
  }
  return material;
}

let starGeometry: BufferGeometry | null = null;
function getStarGeometry(): BufferGeometry {
  if (starGeometry) return starGeometry;
  const rng = createRng(hashSeed('glint', 'globe-stars'));
  const count = 420;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const u = rng.next() * 2 - 1;
    const theta = rng.next() * Math.PI * 2;
    const r = 120 + rng.next() * 60;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = r * s * Math.cos(theta);
    positions[i * 3 + 1] = r * u;
    positions[i * 3 + 2] = r * s * Math.sin(theta);
  }
  starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new BufferAttribute(positions, 3));
  return starGeometry;
}

const scratch = new Vector3();
const UP = new Vector3(0, 1, 0);
const scratchEast = new Vector3();
const scratchNorth = new Vector3();
const scratchMatrix = new Matrix4();

/** Pin frame: local +z outward, +y north, +x east, so label offsets stay upright on the globe. */
function outwardQuaternion(anchor: readonly [number, number, number]): Quaternion {
  const normal = new Vector3(...anchor).normalize();
  scratchEast.crossVectors(UP, normal).normalize();
  if (scratchEast.lengthSq() < 1e-6) scratchEast.set(1, 0, 0);
  scratchNorth.crossVectors(normal, scratchEast).normalize();
  scratchMatrix.makeBasis(scratchEast, scratchNorth, normal);
  return new Quaternion().setFromRotationMatrix(scratchMatrix);
}

interface PinHandle {
  group: Group;
  city: GlobeCity;
  label: Group;
  screen: Vector3;
}

function sameIds(a: readonly CityId[], b: readonly CityId[]): boolean {
  return a.length === b.length && a.every((id, index) => b[index] === id);
}

export function GlobeScene({ cities, interactive, onSelectCity, quality = 'standard' }: GlobeSceneProps) {
  const low = quality === 'low';
  const earthGroup = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const camera = useThree((state) => state.camera);
  const pins = useRef<PinHandle[]>([]);
  const spin = useRef(0);
  const tilt = useRef(IDLE_TILT_RAD);
  const hovered = useRef<CityId | null>(null);
  const focused = useRef<CityId | null>(null);
  const [hoveredId, setHoveredId] = useState<CityId | null>(null);
  const [focusedId, setFocusedId] = useState<CityId | null>(null);
  const [hiddenIds, setHiddenIds] = useState<readonly CityId[]>([]);
  const hiddenRef = useRef<readonly CityId[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<readonly CityId[]>([]);
  const collapsedRef = useRef<readonly CityId[]>([]);
  const size = useThree((state) => state.size);
  const compact = isCompactViewport(size.width, size.height);
  const liftScale = labelLiftScale(size.width, size.height);
  const offsets = useMemo(() => labelOffsets(cities, liftScale), [cities, liftScale]);
  const labelWidths = useMemo(
    () => new Map(cities.map((city) => [city.id, estimateLabelWidthPx(city.label, compact)] as const)),
    [cities, compact],
  );
  const [travellingState, setTravellingState] = useState(false);
  const travellingRef = useRef(false);

  const earthMaterial = useMemo(() => {
    const texture = getEarthTexture();
    texture.offset.x = 0.25;
    // Skip the renderer's filmic tone mapping so the hand-painted palette stays saturated.
    return low
      ? new MeshBasicMaterial({ map: texture, toneMapped: false })
      : new MeshToonMaterial({ map: texture, color: new Color('#b9bcc6'), toneMapped: false });
  }, [low]);
  useEffect(() => () => earthMaterial.dispose(), [earthMaterial]);

  const cityById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);

  useFrame((_, delta) => {
    const group = earthGroup.current;
    if (!group) return;
    const dt = Math.min(delta, 0.1);

    const cameraElevation = Math.atan2(camera.position.y, Math.hypot(camera.position.x, camera.position.z));
    const signal = travelSignal;
    const travelling = signal.transitionId !== null && signal.stage !== 'idle';
    if (travelling !== travellingRef.current) {
      travellingRef.current = travelling;
      setTravellingState(travelling);
    }
    let targetScale = 1;

    if (travelling) {
      const focusCity = signal.to !== 'globe' ? cityById.get(signal.to) : signal.from !== 'globe' ? cityById.get(signal.from) : undefined;
      if (focusCity) {
        const facing = facingRotation(focusCity.latDeg, focusCity.lonDeg, cameraElevation);
        const snap = 1 - Math.exp(-dt * 6);
        spin.current += shortestAngle(spin.current, facing.spin) * snap;
        tilt.current += (facing.tilt - tilt.current) * snap;
      }
      if (signal.to !== 'globe') {
        const p = signal.stage === 'enter' ? Math.pow(signal.progress, 2.2) : 1;
        targetScale = 1 + (DIVE_SCALE - 1) * p;
      } else {
        const p = signal.stage === 'reveal' ? easeInOutCubic(signal.progress) : 0;
        targetScale = DIVE_SCALE - (DIVE_SCALE - 1) * p;
      }
      const scaleSnap = signal.stage === 'enter' ? 1 : 1 - Math.exp(-dt * 10);
      group.scale.setScalar(group.scale.x + (targetScale - group.scale.x) * scaleSnap);
    } else {
      const slow = hovered.current || focused.current ? 0.25 : 1;
      spin.current += dt * IDLE_SPIN_RAD_PER_S * slow;
      tilt.current += (IDLE_TILT_RAD - tilt.current) * (1 - Math.exp(-dt * 3));
      group.scale.setScalar(group.scale.x + (1 - group.scale.x) * (1 - Math.exp(-dt * 8)));
    }
    group.rotation.set(tilt.current, spin.current, 0, 'XYZ');
    group.updateMatrixWorld();

    if (glow.current) {
      glow.current.quaternion.copy(camera.quaternion);
      glow.current.scale.setScalar(group.scale.x);
    }

    // Marker hover/focus scale and hidden-hemisphere culling (state only flips on change).
    const nextHidden: CityId[] = [];
    const list = pins.current;
    for (const pin of list) {
      pin.group.getWorldPosition(scratch);
      const facingDot = markerFacing(scratch, camera.position);
      const visible = facingDot > VISIBLE_DOT;
      pin.group.visible = visible;
      if (!visible) nextHidden.push(pin.city.id);
      const active = hovered.current === pin.city.id || focused.current === pin.city.id;
      const goal = travelling ? 0.001 : active ? 1.22 : 1;
      const current = pin.group.scale.x;
      pin.group.scale.setScalar(current + (goal - current) * (1 - Math.exp(-dt * 12)));
      // Screen position of the label anchor, in CSS px, for overlap collapsing below.
      pin.label.getWorldPosition(pin.screen).project(camera);
      pin.screen.x *= size.width / 2;
      pin.screen.y *= size.height / 2;
    }
    if (!sameIds(nextHidden, hiddenRef.current)) {
      hiddenRef.current = nextHidden;
      setHiddenIds(nextHidden);
    }

    // Collapse overlapping labels: earlier pins in `cities` win, active (hovered/focused) always wins.
    const nextCollapsed: CityId[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const pin = list[i];
      if (!pin.group.visible) continue;
      const isActive = hovered.current === pin.city.id || focused.current === pin.city.id;
      if (isActive) continue;
      for (let j = 0; j < list.length; j += 1) {
        if (i === j) continue;
        const other = list[j];
        if (!other.group.visible || nextCollapsed.includes(other.city.id)) continue;
        const otherActive = hovered.current === other.city.id || focused.current === other.city.id;
        if (!otherActive && j > i) continue;
        const dx = pin.screen.x - other.screen.x;
        const dy = pin.screen.y - other.screen.y;
        const reach = ((labelWidths.get(pin.city.id) ?? 80) + (labelWidths.get(other.city.id) ?? 80)) / 2;
        if (Math.abs(dx) < reach && Math.abs(dy) < LABEL_ROW_PX) {
          nextCollapsed.push(pin.city.id);
          break;
        }
      }
    }
    if (!sameIds(nextCollapsed, collapsedRef.current)) {
      collapsedRef.current = nextCollapsed;
      setCollapsedIds(nextCollapsed);
    }
  });

  const select = (id: CityId) => {
    if (!interactive || hiddenRef.current.includes(id)) return;
    onSelectCity(id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: CityId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(id);
    }
  };

  return (
    <group>
      {!low && <points geometry={getStarGeometry()} material={starMaterial} />}
      {!low && <mesh ref={glow} geometry={glowGeometry} material={getGlowMaterial()} position={[0, 0, -GLOBE_RADIUS * 0.4]} renderOrder={-1} />}

      <group ref={earthGroup} rotation={[IDLE_TILT_RAD, 0, 0]}>
        <mesh geometry={low ? earthGeometryLow : earthGeometry} material={earthMaterial} />

        {cities.map((city, index) => {
          const anchor = latLonToVec3(city.latDeg, city.lonDeg, GLOBE_RADIUS);
          const hidden = travellingState || hiddenIds.includes(city.id);
          const active = hoveredId === city.id || focusedId === city.id;
          const collapsed = !active && collapsedIds.includes(city.id);
          const [offsetX, offsetY] = offsets.get(city.id) ?? [0, LABEL_LIFT];
          return (
            <group
              key={city.id}
              position={anchor}
              quaternion={outwardQuaternion(anchor)}
              ref={(node) => {
                const label = node?.children.find((child): child is Group => child instanceof Group && child.name === 'label');
                const existing = pins.current.findIndex((pin) => pin.city.id === city.id);
                if (existing >= 0) pins.current.splice(existing, 1);
                if (node && label) pins.current.splice(Math.min(index, pins.current.length), 0, { group: node, city, label, screen: new Vector3() });
              }}
            >
              {/* Local +Z points outward from the globe centre. */}
              <mesh geometry={pinStemGeometry} material={pinStemMaterial} position={[0, 0, 0.85]} rotation={[-Math.PI / 2, 0, 0]} />
              <mesh geometry={pinOutlineGeometry} material={pinOutlineMaterial} position={[0, 0, 1.85]} />
              <mesh
                geometry={pinHeadGeometry}
                material={pinHeadMaterial(city.accentColor)}
                position={[0, 0, 1.85]}
                onPointerOver={(event) => {
                  if (!interactive || hidden) return;
                  event.stopPropagation();
                  hovered.current = city.id;
                  setHoveredId(city.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  if (hovered.current !== city.id) return;
                  hovered.current = null;
                  setHoveredId(null);
                  document.body.style.cursor = '';
                }}
                onClick={(event) => {
                  if (!interactive || hidden) return;
                  event.stopPropagation();
                  select(city.id);
                }}
              />
              <mesh geometry={focusRingGeometry} material={focusRingMaterial} position={[0, 0, 1.85]} visible={active} />
              <group name="label" position={[offsetX, offsetY, 2.6]} />
              <Html
                position={[offsetX, offsetY, 2.6]}
                center
                zIndexRange={[0, 0]}
                style={{
                  pointerEvents: hidden || !interactive || collapsed ? 'none' : 'auto',
                  opacity: hidden || collapsed ? 0 : 1,
                  transition: 'opacity 140ms',
                  willChange: 'transform',
                  contain: 'layout paint',
                }}
              >
                <button
                  type="button"
                  data-testid={`globe-pin-${city.id}`}
                  aria-label={`Travel to ${city.label}`}
                  aria-hidden={hidden || collapsed}
                  tabIndex={hidden || !interactive ? -1 : 0}
                  disabled={!interactive}
                  onClick={() => select(city.id)}
                  onKeyDown={(event) => onKeyDown(event, city.id)}
                  onFocus={() => {
                    focused.current = city.id;
                    setFocusedId(city.id);
                  }}
                  onBlur={() => {
                    if (focused.current !== city.id) return;
                    focused.current = null;
                    setFocusedId(null);
                  }}
                  onPointerEnter={() => {
                    if (!interactive || hidden) return;
                    hovered.current = city.id;
                    setHoveredId(city.id);
                  }}
                  onPointerLeave={() => {
                    if (hovered.current !== city.id) return;
                    hovered.current = null;
                    setHoveredId(null);
                  }}
                  style={{
                    font: `800 ${compact ? 12 : 15}px/1 system-ui, sans-serif`,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    color: INK,
                    background: active ? YELLOW : CREAM,
                    border: `3px solid ${INK}`,
                    borderRadius: 8,
                    padding: compact ? '8px 10px' : '10px 14px',
                    minHeight: 44,
                    minWidth: 44,
                    cursor: interactive ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    // Hard offset shadow is a box-shadow with no blur: cheap to paint, reads as chunky.
                    boxShadow: active ? `0 3px 0 ${INK}, 0 0 0 3px ${LAVENDER}` : `0 5px 0 ${INK}`,
                    transform: active ? 'translateY(-3px)' : 'none',
                    transition: 'background 120ms, transform 120ms, box-shadow 120ms',
                    outline: 'none',
                  }}
                >
                  {city.label}
                </button>
              </Html>
            </group>
          );
        })}
      </group>
    </group>
  );
}
