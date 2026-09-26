/**
 * Collectible target cards and pickup burst. Owner: A1.
 * Renders each uncollected objective of the active city as a chunky framed picture of the
 * target standing on its ground socket. Cards yaw toward the camera, bob gently, and
 * sparkle a little more as the explorer approaches; a short ring burst plays on collection.
 * Animation runs on refs; React state changes only when the collected set changes.
 * Positions come from the store's deterministic placement and are never adjusted here.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  CircleGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  PlaneGeometry,
} from 'three';
import type { Group, Mesh } from 'three';
import type { CityId, ObjectiveInstance, TargetId } from '@/shared/contracts';
import { playerTransform } from '@/shared/playerRef';
import { PICKUP_PULSE_SECONDS } from '@/game/feedback';
import { getTargetTexture } from '@/game/targetTextures';
import { useRunStore } from '@/state/store';

const HOVER_Y = 1.6;
const NEAR_DISTANCE = 9;
const BURST_SECONDS = PICKUP_PULSE_SECONDS + 0.15;

/** Card dimensions in world units: picture, cream mat, ink outline, shallow depth. */
const PICTURE = 1.1;
const MAT = 1.36;
const OUTLINE = 1.5;
const DEPTH = 0.12;
/** Card centre height when resting; the frame bottom sits just above the socket. */
const REST_Y = OUTLINE / 2 + 0.22;
const BOB = 0.07;

const INK = '#211333';
const CREAM = '#FFF5E9';
const YELLOW = '#FFD963';

const pictureGeometry = new PlaneGeometry(PICTURE, PICTURE);
const matGeometry = new BoxGeometry(MAT, MAT, DEPTH);
const outlineGeometry = new BoxGeometry(OUTLINE, OUTLINE, DEPTH * 0.7);
const shadowGeometry = new CircleGeometry(0.72, 20);
const sparkGeometry = new OctahedronGeometry(0.09, 0);
const legGeometry = new BoxGeometry(0.14, 0.26, 0.14);

const matMaterial = new MeshLambertMaterial({ color: CREAM });
const inkMaterial = new MeshLambertMaterial({ color: INK });
const shadowMaterial = new MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.38, depthWrite: false });
const sparkMaterial = new MeshBasicMaterial({ color: YELLOW });

function TargetCard({ objective }: { objective: ObjectiveInstance }) {
  const group = useRef<Group>(null);
  const card = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const sparkA = useRef<Mesh>(null);
  const sparkB = useRef<Mesh>(null);
  const [x, y, z] = objective.position;

  const pictureMaterial = useMemo(
    () => new MeshBasicMaterial({ map: getTargetTexture(objective.targetId), toneMapped: false }),
    [objective.targetId],
  );
  useEffect(() => () => pictureMaterial.dispose(), [pictureMaterial]);

  useFrame((state) => {
    if (!group.current || !card.current) return;
    const t = state.clock.elapsedTime;
    const dx = playerTransform.x - x;
    const dz = playerTransform.z - z;
    const near = 1 - Math.min(1, Math.hypot(dx, dz) / NEAR_DISTANCE);
    const excitement = near * near;

    // Yaw-only billboard so the picture reads from any approach without tilting off its feet.
    const cam = state.camera.position;
    group.current.rotation.y = Math.atan2(cam.x - x, cam.z - z);

    const bob = Math.sin(t * (1.6 + excitement * 2) + x * 0.37) * (BOB + excitement * 0.1);
    card.current.position.y = REST_Y + bob;
    card.current.rotation.z = Math.sin(t * 1.1 + z * 0.29) * 0.035 * (1 + excitement);
    const scale = 1 + excitement * 0.18;
    card.current.scale.setScalar(scale);

    if (shadow.current) {
      const lift = 1 - (bob + BOB) * 0.9;
      shadow.current.scale.setScalar(Math.max(0.5, lift) * scale);
    }

    const orbit = t * (2.2 + excitement * 3);
    const radius = OUTLINE * 0.62 * scale;
    if (sparkA.current) {
      sparkA.current.position.set(Math.cos(orbit) * radius, REST_Y + bob + Math.sin(orbit * 1.7) * 0.5, 0.2);
      sparkA.current.rotation.y = orbit * 2;
      sparkA.current.scale.setScalar(0.6 + excitement * 1.2 + Math.sin(t * 7) * 0.15);
    }
    if (sparkB.current) {
      sparkB.current.position.set(-Math.cos(orbit * 0.8) * radius, REST_Y + bob + Math.cos(orbit * 1.3) * 0.5, 0.2);
      sparkB.current.rotation.y = -orbit * 2;
      sparkB.current.scale.setScalar(0.5 + excitement * 1.1 + Math.cos(t * 6) * 0.15);
    }
  });

  return (
    <group ref={group} position={[x, y, z]}>
      <mesh
        ref={shadow}
        geometry={shadowGeometry}
        material={shadowMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
      />
      <mesh geometry={legGeometry} material={inkMaterial} position={[-0.42, 0.13, 0]} />
      <mesh geometry={legGeometry} material={inkMaterial} position={[0.42, 0.13, 0]} />
      <group ref={card} position={[0, REST_Y, 0]}>
        <mesh geometry={outlineGeometry} material={inkMaterial} />
        <mesh geometry={matGeometry} material={matMaterial} position={[0, 0, 0.02]} />
        <mesh geometry={pictureGeometry} material={pictureMaterial} position={[0, 0, DEPTH / 2 + 0.025]} />
        <mesh
          geometry={pictureGeometry}
          material={pictureMaterial}
          position={[0, 0, -DEPTH / 2 - 0.005]}
          rotation={[0, Math.PI, 0]}
        />
      </group>
      <mesh ref={sparkA} geometry={sparkGeometry} material={sparkMaterial} />
      <mesh ref={sparkB} geometry={sparkGeometry} material={sparkMaterial} />
    </group>
  );
}

function Burst({ x, z, onDone }: { x: number; z: number; onDone(): void }) {
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const spark = useRef<Mesh>(null);
  const sparkMaterial = useRef<MeshBasicMaterial>(null);
  const started = useRef<number | null>(null);
  const finished = useRef(false);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (started.current === null) started.current = now;
    const progress = Math.min(1, (now - started.current) / BURST_SECONDS);
    const ease = 1 - (1 - progress) * (1 - progress);
    if (ring.current) ring.current.scale.setScalar(0.6 + ease * 4.5);
    if (ringMaterial.current) ringMaterial.current.opacity = 0.8 * (1 - progress);
    if (spark.current) {
      spark.current.scale.setScalar(1 + ease * 1.8);
      spark.current.position.y = HOVER_Y + ease * 2.5;
      spark.current.rotation.y = ease * Math.PI * 2;
    }
    if (sparkMaterial.current) sparkMaterial.current.opacity = 1 - progress;
    if (progress >= 1 && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.8, 1.05, 32]} />
        <meshBasicMaterial ref={ringMaterial} color="#fff2b0" transparent opacity={0.8} depthWrite={false} />
      </mesh>
      <mesh ref={spark} position={[0, HOVER_Y, 0]}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshBasicMaterial ref={sparkMaterial} color="#fff6d6" transparent opacity={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

interface BurstSpec {
  readonly key: string;
  readonly x: number;
  readonly z: number;
}

export function Collectibles({ cityId }: { cityId: CityId }) {
  const run = useRunStore((state) => state.run);
  const [bursts, setBursts] = useState<readonly BurstSpec[]>([]);
  const seen = useRef<{ runId: string; collected: readonly TargetId[] } | null>(null);

  useEffect(() => {
    if (!run) {
      seen.current = null;
      return;
    }
    const previous = seen.current;
    seen.current = { runId: run.runId, collected: run.collected };
    if (!previous || previous.runId !== run.runId) return;
    const added = run.collected.filter((id) => !previous.collected.includes(id));
    if (added.length === 0) return;
    const fresh = added
      .map((id) => run.objectives.find((objective) => objective.targetId === id))
      .filter((objective): objective is ObjectiveInstance => objective !== undefined && objective.cityId === cityId)
      .map((objective) => ({
        key: `${run.runId}:${objective.targetId}`,
        x: objective.position[0],
        z: objective.position[2],
      }));
    if (fresh.length > 0) setBursts((current) => [...current, ...fresh]);
  }, [run, cityId]);

  if (!run) return null;

  return (
    <group>
      {run.objectives
        .filter((objective) => objective.cityId === cityId && !run.collected.includes(objective.targetId))
        .map((objective) => (
          <TargetCard key={objective.targetId} objective={objective} />
        ))}
      {bursts.map((burst) => (
        <Burst
          key={burst.key}
          x={burst.x}
          z={burst.z}
          onDone={() => setBursts((current) => current.filter((candidate) => candidate.key !== burst.key))}
        />
      ))}
    </group>
  );
}
