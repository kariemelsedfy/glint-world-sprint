/**
 * Run with vite-node. Walks every objective of every trial from its city spawn with the e2e
 * route planner, driving the game's own movement and collision code at a fixed frame step.
 * Catches blocker edits that would leave the browser walker without a path, in seconds.
 */
import { getCity } from '@/cities';
import { LEVELS, TARGETS, resolveObjectives } from '@/content';
import { buildCollisionWorld, moveCircle } from '@/game/collision';
import { absorbBlockedVelocity, createMotion, stepMotion } from '@/game/movement';
import { PICKUP_RADIUS } from '@/shared/contracts';
import { planRoute } from './game';

const DT = 1 / 30;
const LIMIT_S = 120;
const LEG_TOLERANCE = 0.9;
const STOP_WITHIN = 0.4;

const results = LEVELS.flatMap((level) =>
  resolveObjectives(level, TARGETS).map((objective) => {
    const definition = getCity(objective.cityId);
    const world = buildCollisionWorld(definition);
    const target = [objective.position[0], objective.position[2]] as const;
    const motion = createMotion();
    let x = definition.spawn[0];
    let z = definition.spawn[2];
    let legs = planRoute(objective.cityId, [x, z], target);
    let seconds = 0;
    let reached = false;
    for (; seconds < LIMIT_S; seconds += DT) {
      if (Math.hypot(x - target[0], z - target[1]) < PICKUP_RADIUS) {
        reached = true;
        break;
      }
      const along = (axis: 'x' | 'z') => (axis === 'x' ? x : z);
      while (legs.length > 1 && Math.abs(legs[0]!.value - along(legs[0]!.axis)) <= LEG_TOLERANCE) legs.shift();
      const leg = legs[0]!;
      const delta = leg.value - along(leg.axis);
      let axisX = 0;
      let axisZ = 0;
      if (Math.abs(delta) > STOP_WITHIN) {
        if (leg.axis === 'x') axisX = Math.sign(delta);
        else axisZ = Math.sign(delta);
      } else {
        legs = planRoute(objective.cityId, [x, z], target);
      }
      stepMotion(motion, axisX, axisZ, DT);
      const dx = motion.vx * DT;
      const dz = motion.vz * DT;
      const [nx, nz] = moveCircle(world, x, z, dx, dz);
      absorbBlockedVelocity(motion, dx, dz, nx - x, nz - z);
      x = nx;
      z = nz;
    }
    return {
      levelId: level.id,
      cityId: objective.cityId,
      targetId: objective.targetId,
      reached,
      seconds: Math.round(seconds * 10) / 10,
      end: [Math.round(x * 10) / 10, Math.round(z * 10) / 10],
      target,
    };
  }),
);

process.stdout.write(JSON.stringify(results));
