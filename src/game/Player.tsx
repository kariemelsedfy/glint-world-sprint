/**
 * BOOTSTRAP player controller and pickup validation created by A0.
 * Owner after CONTRACT_READY: A1. Positions live in refs; only discrete events reach the store.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { PICKUP_RADIUS, PLAYER_SPEED } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';
import { playerTransform, resetPlayerTransform } from '@/shared/playerRef';
import { buildCollisionWorld, moveCircle } from '@/game/collision';
import { getMoveAxis, resetInput } from '@/game/input';
import { useRunStore } from '@/state/store';

const STORE_SYNC_MS = 100;

export function Player({ definition }: { definition: CityDefinition }) {
  const group = useRef<Group>(null);
  const world = useMemo(() => buildCollisionWorld(definition), [definition]);
  const sinceSync = useRef(0);

  useEffect(() => {
    resetInput();
    resetPlayerTransform(definition.spawn[0], definition.spawn[1], definition.spawn[2]);
    useRunStore.getState().setPlayerXZ(definition.spawn[0], definition.spawn[2]);
  }, [definition]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const state = useRunStore.getState();
    const blocked = state.paused || state.phase !== 'city' || state.mapOpen;

    if (!blocked) {
      const [axisX, axisZ] = getMoveAxis();
      if (axisX !== 0 || axisZ !== 0) {
        const [x, z] = moveCircle(
          world,
          playerTransform.x,
          playerTransform.z,
          axisX * PLAYER_SPEED * delta,
          axisZ * PLAYER_SPEED * delta,
        );
        playerTransform.x = x;
        playerTransform.z = z;
        playerTransform.headingRad = Math.atan2(axisX, axisZ);
      }
    }

    if (group.current) {
      group.current.position.set(playerTransform.x, 0, playerTransform.z);
      group.current.rotation.y = playerTransform.headingRad;
    }

    sinceSync.current += delta * 1000;
    if (sinceSync.current >= STORE_SYNC_MS) {
      sinceSync.current = 0;
      state.setPlayerXZ(playerTransform.x, playerTransform.z);

      const run = state.run;
      if (!blocked && run) {
        for (const objective of run.objectives) {
          if (objective.cityId !== state.cityId) continue;
          if (run.collected.includes(objective.targetId)) continue;
          const dx = objective.position[0] - playerTransform.x;
          const dz = objective.position[2] - playerTransform.z;
          if (dx * dx + dz * dz <= PICKUP_RADIUS * PICKUP_RADIUS) {
            state.dispatch({ type: 'COLLECT', targetId: objective.targetId, cityId: objective.cityId });
            break;
          }
        }
      }
    }
  });

  return (
    <group ref={group} position={[definition.spawn[0], 0, definition.spawn[2]]}>
      <mesh position={[0, 1.4, 0]}>
        <capsuleGeometry args={[0.8, 1.2, 4, 12]} />
        <meshLambertMaterial color="#ff655b" />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <sphereGeometry args={[0.85, 16, 12]} />
        <meshLambertMaterial color="#fff6e5" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[1.1, 16]} />
        <meshBasicMaterial color="#12253b" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
