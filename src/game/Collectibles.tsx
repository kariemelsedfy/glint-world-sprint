/**
 * BOOTSTRAP collectible glints created by A0. Owner after CONTRACT_READY: A1.
 * Renders uncollected objectives of the active city above their ground socket.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { CityId, ObjectiveInstance } from '@/shared/contracts';
import { useRunStore } from '@/state/store';

function Glint({ objective }: { objective: ObjectiveInstance }) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 1.4;
    group.current.position.y = objective.position[1] + 1.6 + Math.sin(t * 2) * 0.18;
  });

  return (
    <group ref={group} position={[objective.position[0], objective.position[1] + 1.6, objective.position[2]]}>
      <mesh>
        <octahedronGeometry args={[0.7, 0]} />
        <meshLambertMaterial color="#ffc857" emissive="#ffc857" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

export function Collectibles({ cityId }: { cityId: CityId }) {
  const run = useRunStore((state) => state.run);
  if (!run) return null;

  return (
    <group>
      {run.objectives
        .filter((objective) => objective.cityId === cityId && !run.collected.includes(objective.targetId))
        .map((objective) => (
          <Glint key={objective.targetId} objective={objective} />
        ))}
    </group>
  );
}
