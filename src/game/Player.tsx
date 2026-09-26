/**
 * Player controller and pickup validation. Owner: A1.
 * Positions and velocity live in refs; only discrete events (position sync at ~10 Hz,
 * COLLECT) reach the store. The camera is A0's; this only writes playerTransform.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { PLAYER_SPEED } from '@/shared/contracts';
import type { CityDefinition, ObjectiveInstance } from '@/shared/contracts';
import { playerTransform, resetPlayerTransform } from '@/shared/playerRef';
import { buildCollisionWorld } from '@/game/collision';
import { markPickup, pickupPulseStrength } from '@/game/feedback';
import { getMoveAxis, resetInput } from '@/game/input';
import { createMotion, resetMotion, speedOf, absorbBlockedVelocity } from '@/game/movement';
import { clampFrameDt, simulatePlayer } from '@/game/simulate';
import type { SimulationResult } from '@/game/simulate';
import { flushRunClock } from '@/game/clock';
import { useRunStore } from '@/state/store';

const STORE_SYNC_MS = 100;

export function Player({ definition }: { definition: CityDefinition }) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Mesh>(null);
  const world = useMemo(() => buildCollisionWorld(definition), [definition]);
  const motion = useRef(createMotion());
  const sinceSync = useRef(0);
  const wasBlocked = useRef(false);
  const pickups = useRef<ObjectiveInstance[]>([]);
  const result = useRef<SimulationResult>({
    pickup: -1,
    intendedDx: 0,
    intendedDz: 0,
    actualDx: 0,
    actualDz: 0,
  });

  useEffect(() => {
    resetInput();
    resetMotion(motion.current, 0);
    resetPlayerTransform(definition.spawn[0], definition.spawn[1], definition.spawn[2]);
    useRunStore.getState().setPlayerXZ(definition.spawn[0], definition.spawn[2]);
    sinceSync.current = STORE_SYNC_MS;
  }, [definition]);

  useFrame((frame, rawDelta) => {
    const dt = clampFrameDt(rawDelta);
    const state = useRunStore.getState();
    const run = state.run;
    const blocked = state.paused || state.phase !== 'city' || state.mapOpen;
    const m = motion.current;
    let collected: ObjectiveInstance | null = null;

    if (blocked) {
      if (!wasBlocked.current) {
        resetInput();
        resetMotion(m);
      }
      wasBlocked.current = true;
    } else {
      wasBlocked.current = false;
      const candidates = pickups.current;
      candidates.length = 0;
      if (run) {
        for (const objective of run.objectives) {
          if (objective.cityId === state.cityId && !run.collected.includes(objective.targetId)) {
            candidates.push(objective);
          }
        }
      }
      const [axisX, axisZ] = getMoveAxis();
      const r = simulatePlayer(world, m, playerTransform, axisX, axisZ, dt, candidates, result.current);
      absorbBlockedVelocity(m, r.intendedDx, r.intendedDz, r.actualDx, r.actualDz);
      playerTransform.headingRad = m.headingRad;
      if (r.pickup >= 0) collected = candidates[r.pickup] ?? null;
    }

    const speed = blocked ? 0 : speedOf(m);
    const stride = speed / PLAYER_SPEED;
    const pulse = pickupPulseStrength(frame.clock.elapsedTime);

    if (group.current) {
      group.current.position.set(playerTransform.x, 0, playerTransform.z);
      group.current.rotation.y = playerTransform.headingRad;
    }
    if (body.current) {
      const bob = Math.abs(Math.sin(m.walkPhase)) * 0.22 * stride;
      const squash = pulse * pulse * 0.18;
      body.current.position.y = bob + squash * 0.6;
      body.current.rotation.x = 0.12 * stride;
      body.current.rotation.z = Math.sin(m.walkPhase) * 0.05 * stride;
      body.current.scale.set(1 + squash * 0.4, 1 + squash, 1 + squash * 0.4);
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(m.walkPhase + Math.PI / 2) * 0.06 * stride;
    }

    sinceSync.current += dt * 1000;
    if (sinceSync.current >= STORE_SYNC_MS) {
      sinceSync.current = 0;
      state.setPlayerXZ(playerTransform.x, playerTransform.z);
    }

    if (!collected) return;
    // The store re-validates against playerXZ, so make sure it sees the pickup position.
    state.setPlayerXZ(playerTransform.x, playerTransform.z);
    sinceSync.current = 0;
    flushRunClock();
    state.dispatch({ type: 'COLLECT', targetId: collected.targetId, cityId: collected.cityId });
    if (useRunStore.getState().run?.collected.includes(collected.targetId)) {
      markPickup(frame.clock.elapsedTime, collected.position[0], collected.position[2]);
    }
  });

  return (
    <group ref={group} position={[definition.spawn[0], 0, definition.spawn[2]]}>
      <group ref={body}>
        <mesh position={[0, 1.4, 0]}>
          <capsuleGeometry args={[0.8, 1.2, 4, 12]} />
          <meshLambertMaterial color="#ff655b" />
        </mesh>
        <mesh ref={head} position={[0, 2.6, 0]}>
          <sphereGeometry args={[0.85, 16, 12]} />
          <meshLambertMaterial color="#fff6e5" />
        </mesh>
        <mesh position={[0, 2.7, 0.7]}>
          <boxGeometry args={[0.9, 0.5, 0.35]} />
          <meshLambertMaterial color="#12253b" />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[1.1, 16]} />
        <meshBasicMaterial color="#12253b" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
