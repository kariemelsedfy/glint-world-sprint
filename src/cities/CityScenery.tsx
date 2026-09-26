/**
 * Shared graybox scenery used by the A3/A4 stub scenes until real city art lands.
 * Owner: A0 (bootstrap only). City owners may stop importing it entirely.
 * Scenery only: no pickups, no players, no rules.
 */
import { useMemo } from 'react';
import type { CityDefinition, Quality } from '@/shared/contracts';

export interface CitySceneProps {
  readonly definition: CityDefinition;
  readonly seed: number;
  readonly quality: Quality;
}

const SILHOUETTE_HEIGHT: Record<string, number> = {
  tower: 34,
  pyramid: 26,
  museum: 12,
  sphinx: 9,
  cafe: 8,
  market: 7,
};

export function CityScenery({ definition }: CitySceneProps) {
  const { bounds, groundColor, accentColor, roads, landmarks, blockers } = definition;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;

  const decorativeBlockers = useMemo(
    () => blockers.filter((blocker) => !landmarks.some((landmark) => landmark.id === blocker.id)),
    [blockers, landmarks],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[width, depth]} />
        <meshLambertMaterial color={groundColor} />
      </mesh>

      {roads.map((road, index) => (
        <mesh
          key={`road-${index}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[(road.minX + road.maxX) / 2, 0.02, (road.minZ + road.maxZ) / 2]}
        >
          <planeGeometry args={[road.maxX - road.minX, road.maxZ - road.minZ]} />
          <meshLambertMaterial color="#e8e2d2" />
        </mesh>
      ))}

      {landmarks.map((landmark) => {
        const height = SILHOUETTE_HEIGHT[landmark.silhouette] ?? 10;
        const sizeX = landmark.footprint.maxX - landmark.footprint.minX;
        const sizeZ = landmark.footprint.maxZ - landmark.footprint.minZ;
        const cx = (landmark.footprint.minX + landmark.footprint.maxX) / 2;
        const cz = (landmark.footprint.minZ + landmark.footprint.maxZ) / 2;
        if (landmark.silhouette === 'pyramid') {
          return (
            <mesh key={landmark.id} position={[cx, height / 2, cz]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[Math.max(sizeX, sizeZ) * 0.72, height, 4]} />
              <meshLambertMaterial color="#e4c07a" />
            </mesh>
          );
        }
        return (
          <mesh key={landmark.id} position={[cx, height / 2, cz]}>
            <boxGeometry args={[sizeX, height, sizeZ]} />
            <meshLambertMaterial color={accentColor} />
          </mesh>
        );
      })}

      {decorativeBlockers.map((blocker) => {
        const sizeX = blocker.maxX - blocker.minX;
        const sizeZ = blocker.maxZ - blocker.minZ;
        return (
          <mesh
            key={blocker.id}
            position={[(blocker.minX + blocker.maxX) / 2, 5, (blocker.minZ + blocker.maxZ) / 2]}
          >
            <boxGeometry args={[sizeX, 10, sizeZ]} />
            <meshLambertMaterial color="#b9b2a4" />
          </mesh>
        );
      })}
    </group>
  );
}
