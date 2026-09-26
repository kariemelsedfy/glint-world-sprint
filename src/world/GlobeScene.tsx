/**
 * BOOTSTRAP cartoon globe created by A0. Owner after CONTRACT_READY: A2.
 * Geometry and selectable pins only; it never reads or mutates run state.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { CityId } from '@/shared/contracts';

export const GLOBE_RADIUS = 10;

export interface GlobeCity {
  readonly id: CityId;
  readonly label: string;
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly accentColor: string;
}

export interface GlobeSceneProps {
  readonly cities: readonly GlobeCity[];
  readonly interactive: boolean;
  onSelectCity(id: CityId): void;
}

export function latLonToVec3(latDeg: number, lonDeg: number, radius: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return [
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  ];
}

export function GlobeScene({ cities, interactive, onSelectCity }: GlobeSceneProps) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 32]} />
        <meshLambertMaterial color="#24b8e8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={latLonToVec3(30, 20, GLOBE_RADIUS * 0.94)}>
        <circleGeometry args={[4.2, 24]} />
        <meshLambertMaterial color="#78d896" />
      </mesh>
      <mesh rotation={[-Math.PI / 2.2, 0, 0]} position={latLonToVec3(48, -6, GLOBE_RADIUS * 0.94)}>
        <circleGeometry args={[2.6, 20]} />
        <meshLambertMaterial color="#8fd9a0" />
      </mesh>

      {cities.map((city) => {
        const anchor = latLonToVec3(city.latDeg, city.lonDeg, GLOBE_RADIUS + 0.9);
        return (
          <mesh
            key={city.id}
            position={anchor}
            onPointerDown={(event) => {
              if (!interactive) return;
              event.stopPropagation();
              onSelectCity(city.id);
            }}
          >
            <sphereGeometry args={[0.85, 16, 12]} />
            <meshLambertMaterial color={city.accentColor} emissive="#ffc857" emissiveIntensity={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}
