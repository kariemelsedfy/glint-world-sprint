/**
 * Collectible glints and pickup burst. Owner: A1.
 * Renders uncollected objectives of the active city above their ground socket; glints
 * brighten as the explorer approaches and a short ring burst plays on collection.
 * Animation runs on refs; React state changes only when the collected set changes.
 */
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshBasicMaterial, MeshLambertMaterial } from 'three';
import type { CityId, ObjectiveInstance, TargetId } from '@/shared/contracts';
import { playerTransform } from '@/shared/playerRef';
import { PICKUP_PULSE_SECONDS } from '@/game/feedback';
import { useRunStore } from '@/state/store';

const HOVER_Y = 1.6;
const NEAR_DISTANCE = 9;
const BURST_SECONDS = PICKUP_PULSE_SECONDS + 0.15;

function Glint({ objective }: { objective: ObjectiveInstance }) {
  const group = useRef<Group>(null);
  const gem = useRef<Mesh>(null);
  const material = useRef<MeshLambertMaterial>(null);
  const [x, y, z] = objective.position;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const dx = playerTransform.x - x;
    const dz = playerTransform.z - z;
    const near = 1 - Math.min(1, Math.hypot(dx, dz) / NEAR_DISTANCE);
    const excitement = near * near;

    group.current.rotation.y = t * (1.4 + excitement * 4);
    group.current.position.y = y + HOVER_Y + Math.sin(t * (2 + excitement * 3)) * (0.18 + excitement * 0.25);
    if (gem.current) {
      const scale = 1 + excitement * 0.35 + Math.sin(t * 9) * 0.04 * excitement;
      gem.current.scale.setScalar(scale);
    }
    if (material.current) material.current.emissiveIntensity = 0.35 + excitement * 0.9;
  });

  return (
    <group ref={group} position={[x, y + HOVER_Y, z]}>
      <mesh ref={gem}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshLambertMaterial ref={material} color="#ffc857" emissive="#ffc857" emissiveIntensity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -HOVER_Y + 0.04, 0]}>
        <ringGeometry args={[0.9, 1.15, 24]} />
        <meshBasicMaterial color="#ffc857" transparent opacity={0.45} />
      </mesh>
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
          <Glint key={objective.targetId} objective={objective} />
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
