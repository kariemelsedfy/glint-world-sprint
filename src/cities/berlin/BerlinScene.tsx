/**
 * Berlin scenery. Owner: A10.
 * Renders only what berlin/definition.ts declares; it never scores or collects.
 */
import { CityScenery } from '@/cities/CityScenery';
import type { CitySceneProps } from '@/cities/CityScenery';

export function BerlinScene(props: CitySceneProps) {
  return <CityScenery {...props} />;
}
