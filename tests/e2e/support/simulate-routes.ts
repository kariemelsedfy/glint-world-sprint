/**
 * Run with vite-node. Walks every objective of every trial from its city spawn with the e2e
 * route planner, driving the game's own player simulation (movement, collision, pickup).
 * Catches blocker edits that would leave the browser walker without a path, in seconds.
 */
import { getCity } from '@/cities';
import { LEVELS, TARGETS, resolveObjectives } from '@/content';
import { buildCollisionWorld } from '@/game/collision';
import { absorbBlockedVelocity, createMotion } from '@/game/movement';
import { simulatePlayer } from '@/game/simulate';
import type { SimulationResult } from '@/game/simulate';
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
    const position = { x: definition.spawn[0], z: definition.spawn[2] };
    const out: SimulationResult = { pickup: -1, intendedDx: 0, intendedDz: 0, actualDx: 0, actualDz: 0 };
    let legs = planRoute(objective.cityId, [position.x, position.z], target);
    let seconds = 0;
    let reached = false;
    for (; seconds < LIMIT_S && !reached; seconds += DT) {
      const along = (axis: 'x' | 'z') => (axis === 'x' ? position.x : position.z);
      while (legs.length > 1 && Math.abs(legs[0]!.value - along(legs[0]!.axis)) <= LEG_TOLERANCE) legs.shift();
      const leg = legs[0]!;
      const delta = leg.value - along(leg.axis);
      let axisX = 0;
      let axisZ = 0;
      if (Math.abs(delta) > STOP_WITHIN) {
        if (leg.axis === 'x') axisX = Math.sign(delta);
        else axisZ = Math.sign(delta);
      } else {
        legs = planRoute(objective.cityId, [position.x, position.z], target);
      }
      simulatePlayer(world, motion, position, axisX, axisZ, DT, [objective], out);
      absorbBlockedVelocity(motion, out.intendedDx, out.intendedDz, out.actualDx, out.actualDz);
      reached = out.pickup === 0;
    }
    const x = position.x;
    const z = position.z;
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
