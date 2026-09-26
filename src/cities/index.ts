/** Explicit city registry. Owner: A0. City owners edit only their own subdirectory. */
import type { ComponentType } from 'react';
import type { CityDefinition, CityId } from '@/shared/contracts';
import type { CitySceneProps } from '@/cities/CityScenery';
import { parisDefinition } from '@/cities/paris/definition';
import { gizaDefinition } from '@/cities/giza/definition';
import { ParisScene } from '@/cities/paris/ParisScene';
import { GizaScene } from '@/cities/giza/GizaScene';

export interface CityModule {
  readonly definition: CityDefinition;
  readonly Scene: ComponentType<CitySceneProps>;
}

const REGISTRY: Readonly<Record<CityId, CityModule>> = {
  paris: { definition: parisDefinition, Scene: ParisScene },
  giza: { definition: gizaDefinition, Scene: GizaScene },
};

export const CITY_IDS: readonly CityId[] = ['paris', 'giza'];

export function getCityModule(id: CityId): CityModule {
  return REGISTRY[id];
}

export function getCity(id: CityId): CityDefinition {
  return REGISTRY[id].definition;
}

export function listCities(): readonly { id: CityId; label: string }[] {
  return CITY_IDS.map((id) => ({ id, label: REGISTRY[id].definition.label }));
}
