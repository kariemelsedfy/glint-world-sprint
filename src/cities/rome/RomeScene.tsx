/**
 * Rome scenery. Owner: A8.
 * Renders only what rome/definition.ts declares; it never scores or collects.
 */
import { CityScenery } from '@/cities/CityScenery';
import type { CitySceneProps } from '@/cities/CityScenery';

export function RomeScene(props: CitySceneProps) {
  return <CityScenery {...props} />;
}
