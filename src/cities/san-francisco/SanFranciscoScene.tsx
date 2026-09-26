/**
 * San Francisco scenery. Owner: A9.
 * Renders only what san-francisco/definition.ts declares; it never scores or collects.
 */
import { CityScenery } from '@/cities/CityScenery';
import type { CitySceneProps } from '@/cities/CityScenery';

export function SanFranciscoScene(props: CitySceneProps) {
  return <CityScenery {...props} />;
}
