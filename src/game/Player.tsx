/**
 * Player controller and pickup validation. Owner: A1.
 * Positions and velocity live in refs; only discrete events (position sync at ~10 Hz,
 * COLLECT) reach the store. The camera is A0's; this only writes playerTransform.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { PICKUP_RADIUS, PLAYER_SPEED } from '@/shared/contracts';
import type { CityDefinition } from '@/shared/contracts';
import { playerTransform, resetPlayerTransform } from '@/shared/playerRef';
import { buildCollisionWorld, moveCircle } from '@/game/collision';
import { markPickup, pickupPulseStrength } from '@/game/feedback';
import { getMoveAxis, resetInput } from '@/game/input';
import { createMotion, resetMotion, speedOf, stepMotion, absorbBlockedVelocity } from '@/game/movement';
import { flushRunClock } from '@/game/clock';
import { useRunStore } from '@/state/store';

const STORE_SYNC_MS = 100;
/** Frame deltas above this (tab switch, hitch) are clamped so one frame never teleports. */
const MAX_FRAME_DT = 1 / 20;
const PICKUP_RADIUS_SQ = PICKUP_RADIUS * PICKUP_RADIUS;

export function Player({ definition }: { definition: CityDefinition }) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Mesh>(null);
  const world = useMemo(() => buildCollisionWorld(definition), [definition]);
  const motion = useRef(createMotion());
  const sinceSync = useRef(0);
  const wasBlocked = useRef(false);

  useEffect(() => {
    resetInput();
    resetMotion(motion.current, 0);
    resetPlayerTransform(definition.spawn[0], definition.spawn[1], definition.spawn[2]);
    useRunStore.getState().setPlayerXZ(definition.spawn[0], definition.spawn[2]);
    sinceSync.current = STORE_SYNC_MS;
  }, [definition]);

  useFrame((frame, rawDelta) => {
    const dt = Math.min(Math.max(rawDelta, 0), MAX_FRAME_DT);
    const state = useRunStore.getState();
    const blocked = state.paused || state.phase !== 'city' || state.mapOpen;
    const m = motion.current;

    if (blocked) {
      if (!wasBlocked.current) {
        resetInput();
        resetMotion(m);
      }
      wasBlocked.current = true;
    } else {
      wasBlocked.current = false;
      const [axisX, axisZ] = getMoveAxis();
      stepMotion(m, axisX, axisZ, dt);

      if (m.vx !== 0 || m.vz !== 0) {
        const intendedDx = m.vx * dt;
        const intendedDz = m.vz * dt;
        const [x, z] = moveCircle(world, playerTransform.x, playerTransform.z, intendedDx, intendedDz);
        absorbBlockedVelocity(m, intendedDx, intendedDz, x - playerTransform.x, z - playerTransform.z);
        playerTransform.x = x;
        playerTransform.z = z;
      }
      playerTransform.headingRad = m.headingRad;
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

    const run = state.run;
    if (blocked || !run) return;
    for (const objective of run.objectives) {
      if (objective.cityId !== state.cityId) continue;
      if (run.collected.includes(objective.targetId)) continue;
      const dx = objective.position[0] - playerTransform.x;
      const dz = objective.position[2] - playerTransform.z;
      if (dx * dx + dz * dz > PICKUP_RADIUS_SQ) continue;
      // The store re-validates against playerXZ, so make sure it sees this frame's position.
      state.setPlayerXZ(playerTransform.x, playerTransform.z);
      sinceSync.current = 0;
      flushRunClock();
      state.dispatch({ type: 'COLLECT', targetId: objective.targetId, cityId: objective.cityId });
      if (useRunStore.getState().run?.collected.includes(objective.targetId)) {
        markPickup(frame.clock.elapsedTime, objective.position[0], objective.position[2]);
      }
      break;
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
