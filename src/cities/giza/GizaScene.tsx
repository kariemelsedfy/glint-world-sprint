/** STUB scenery. Owner after CONTRACT_READY: A4. Scenery only — no rules, pickups or players. */
import { CityScenery } from '@/cities/CityScenery';
import type { CitySceneProps } from '@/cities/CityScenery';

export function GizaScene(props: CitySceneProps) {
  return <CityScenery {...props} />;
}
