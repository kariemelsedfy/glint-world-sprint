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
  PlaneGeometry,
  Quaternion,
  AdditiveBlending,
} from 'three';
import type { CityId } from '@/shared/contracts';
import { createRng, hashSeed } from '@/shared/seed';
import { getCloudTexture, getEarthTexture, getGlowTexture } from '@/world/earthTextures';
import { travelSignal } from '@/world/travelSignal';
import { easeInOutCubic } from '@/world/travelTimeline';

export const GLOBE_RADIUS = 10;
const IDLE_SPIN_RAD_PER_S = 0.07;
const IDLE_TILT_RAD = 0.32;
const DIVE_SCALE = 2.45;
/** Pins facing away from the camera beyond this dot product are hidden and unclickable. */
const VISIBLE_DOT = 0.12;

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
  return markerWorld.clone().normalize().dot(cameraPosition.clone().normalize());
}

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

// Reusable geometry and materials: created once per module, shared by all mounts.
const earthGeometry = new SphereGeometry(GLOBE_RADIUS, 64, 48);
const cloudGeometry = new SphereGeometry(GLOBE_RADIUS * 1.035, 48, 32);
const glowGeometry = new PlaneGeometry(GLOBE_RADIUS * 3.1, GLOBE_RADIUS * 3.1);
const pinStemGeometry = new ConeGeometry(0.32, 1.5, 12);
const pinHeadGeometry = new SphereGeometry(0.62, 18, 14);
const pinRingGeometry = new RingGeometry(0.85, 1.15, 32);
const focusRingGeometry = new TorusGeometry(1.45, 0.09, 8, 40);

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
const pinStemMaterial = new MeshToonMaterial({ color: new Color('#fff4d6') });
const pinRingMaterial = new MeshBasicMaterial({ color: new Color('#ffffff'), transparent: true, opacity: 0.85, depthWrite: false });
const focusRingMaterial = new MeshBasicMaterial({ color: new Color('#ffd166') });
const starMaterial = new PointsMaterial({ color: new Color('#dfe9ff'), size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.9 });

const pinHeadMaterials = new Map<string, MeshToonMaterial>();
function pinHeadMaterial(color: string): MeshToonMaterial {
  let material = pinHeadMaterials.get(color);
  if (!material) {
    material = new MeshToonMaterial({ color: new Color(color), emissive: new Color(color), emissiveIntensity: 0.28 });
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
const OUTWARD = new Vector3(0, 0, 1);

function outwardQuaternion(anchor: readonly [number, number, number]): Quaternion {
  return new Quaternion().setFromUnitVectors(OUTWARD, new Vector3(...anchor).normalize());
}

interface PinHandle {
  group: Group;
  city: GlobeCity;
}

export function GlobeScene({ cities, interactive, onSelectCity }: GlobeSceneProps) {
  const earthGroup = useRef<Group>(null);
  const clouds = useRef<Mesh>(null);
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
  const [travellingState, setTravellingState] = useState(false);
  const travellingRef = useRef(false);

  const earthMaterial = useMemo(() => {
    const texture = getEarthTexture();
    texture.offset.x = 0.25;
    return new MeshToonMaterial({ map: texture });
  }, []);
  const cloudMaterial = useMemo(
    () => new MeshToonMaterial({ map: getCloudTexture(), transparent: true, opacity: 0.85, depthWrite: false }),
    [],
  );
  useEffect(
    () => () => {
      earthMaterial.dispose();
      cloudMaterial.dispose();
    },
    [earthMaterial, cloudMaterial],
  );

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

    if (clouds.current) clouds.current.rotation.y += dt * 0.02;
    if (glow.current) {
      glow.current.quaternion.copy(camera.quaternion);
      glow.current.scale.setScalar(group.scale.x);
    }

    // Marker hover/focus scale and hidden-hemisphere culling (state only flips on change).
    let hiddenChanged = false;
    const nextHidden: CityId[] = [];
    for (const pin of pins.current) {
      pin.group.getWorldPosition(scratch);
      const facingDot = markerFacing(scratch, camera.position);
      const visible = facingDot > VISIBLE_DOT;
      pin.group.visible = visible;
      if (!visible) nextHidden.push(pin.city.id);
      const active = hovered.current === pin.city.id || focused.current === pin.city.id;
      const goal = travelling ? 0.001 : active ? 1.28 : 1;
      const current = pin.group.scale.x;
      pin.group.scale.setScalar(current + (goal - current) * (1 - Math.exp(-dt * 12)));
    }
    if (nextHidden.length !== hiddenRef.current.length || nextHidden.some((id, index) => hiddenRef.current[index] !== id)) {
      hiddenChanged = true;
    }
    if (hiddenChanged) {
      hiddenRef.current = nextHidden;
      setHiddenIds(nextHidden);
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
      <points geometry={getStarGeometry()} material={starMaterial} />
      <mesh ref={glow} geometry={glowGeometry} material={getGlowMaterial()} position={[0, 0, -GLOBE_RADIUS * 0.4]} renderOrder={-1} />

      <group ref={earthGroup} rotation={[IDLE_TILT_RAD, 0, 0]}>
        <mesh geometry={earthGeometry} material={earthMaterial} />
        <mesh ref={clouds} geometry={cloudGeometry} material={cloudMaterial} />

        {cities.map((city) => {
          const anchor = latLonToVec3(city.latDeg, city.lonDeg, GLOBE_RADIUS);
          const hidden = travellingState || hiddenIds.includes(city.id);
          const active = hoveredId === city.id || focusedId === city.id;
          return (
            <group
              key={city.id}
              position={anchor}
              quaternion={outwardQuaternion(anchor)}
              ref={(node) => {
                pins.current = pins.current.filter((pin) => pin.city.id !== city.id);
                if (node) pins.current.push({ group: node, city });
              }}
            >
              {/* Local +Z points outward from the globe centre. */}
              <mesh geometry={pinRingGeometry} material={pinRingMaterial} position={[0, 0, 0.06]} />
              <mesh geometry={pinStemGeometry} material={pinStemMaterial} position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]} />
              <mesh
                geometry={pinHeadGeometry}
                material={pinHeadMaterial(city.accentColor)}
                position={[0, 0, 1.95]}
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
              <mesh geometry={focusRingGeometry} material={focusRingMaterial} position={[0, 0, 1.95]} visible={active} />
              <Html
                position={[0, 0, 3.3]}
                center
                zIndexRange={[0, 0]}
                style={{ pointerEvents: hidden || !interactive ? 'none' : 'auto', opacity: hidden ? 0 : 1, transition: 'opacity 160ms' }}
              >
                <button
                  type="button"
                  data-testid={`globe-pin-${city.id}`}
                  aria-label={`Travel to ${city.label}`}
                  aria-hidden={hidden}
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
                    font: '600 15px/1 system-ui, sans-serif',
                    letterSpacing: '0.02em',
                    color: '#0b1b2c',
                    background: active ? '#ffd166' : 'rgba(255,255,255,0.92)',
                    border: `2px solid ${active ? '#ffb703' : city.accentColor}`,
                    borderRadius: 999,
                    padding: '9px 16px',
                    minHeight: 44,
                    minWidth: 44,
                    cursor: interactive ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    boxShadow: active ? '0 6px 18px rgba(255,183,3,0.45)' : '0 4px 12px rgba(0,0,0,0.25)',
                    transform: active ? 'translateY(-2px)' : 'none',
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
