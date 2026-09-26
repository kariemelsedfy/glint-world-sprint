/**
 * Single scene host and camera authority. Owner: A0.
 * Exactly one Canvas and one camera controller exist in the app; city modules add scenery only.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { CityId, LocationId, Quality } from '@/shared/contracts';
import { playerTransform } from '@/shared/playerRef';
import { getCityModule, listCities, getCity } from '@/cities';
import { GlobeScene } from '@/world';
import { Player } from '@/game/Player';
import { Collectibles } from '@/game/Collectibles';

const CITY_CAMERA_OFFSET: readonly [number, number, number] = [0, 52, 36];
const GLOBE_CAMERA: readonly [number, number, number] = [0, 8, 30];

function CameraDirector({ location }: { location: LocationId }) {
  const camera = useThree((state) => state.camera);
  const initialized = useRef<LocationId | null>(null);

  useFrame((_, delta) => {
    if (location === 'globe') {
      const damping = 1 - Math.exp(-delta * 4);
      camera.position.x += (GLOBE_CAMERA[0] - camera.position.x) * damping;
      camera.position.y += (GLOBE_CAMERA[1] - camera.position.y) * damping;
      camera.position.z += (GLOBE_CAMERA[2] - camera.position.z) * damping;
      camera.lookAt(0, 0, 0);
      initialized.current = 'globe';
      return;
    }

    const targetX = playerTransform.x + CITY_CAMERA_OFFSET[0];
    const targetY = CITY_CAMERA_OFFSET[1];
    const targetZ = playerTransform.z + CITY_CAMERA_OFFSET[2];

    if (initialized.current !== location) {
      camera.position.set(targetX, targetY + 26, targetZ + 8);
      initialized.current = location;
    }

    const damping = 1 - Math.exp(-delta * 5);
    camera.position.x += (targetX - camera.position.x) * damping;
    camera.position.y += (targetY - camera.position.y) * damping;
    camera.position.z += (targetZ - camera.position.z) * damping;
    camera.lookAt(playerTransform.x, 1.5, playerTransform.z);
  });

  return null;
}

export interface SceneHostProps {
  readonly location: LocationId;
  readonly quality: Quality;
  readonly interactiveGlobe: boolean;
  onSelectCity(id: CityId): void;
}

export function SceneHost({ location, quality, interactiveGlobe, onSelectCity }: SceneHostProps) {
  const isCity = location !== 'globe';
  const cityModule = isCity ? getCityModule(location as CityId) : null;

  return (
    <>
      <color attach="background" args={[isCity ? '#bfe4f5' : '#0b1b2c']} />
      <hemisphereLight args={['#ffffff', '#8d8168', 0.9]} />
      <directionalLight position={[40, 80, 30]} intensity={1.1} />
      <CameraDirector location={location} />

      {!isCity && (
        <GlobeScene
          interactive={interactiveGlobe}
          quality={quality}
          onSelectCity={onSelectCity}
          cities={listCities().map(({ id }) => {
            const definition = getCity(id);
            return {
              id,
              label: definition.label,
              latDeg: definition.globeAnchor.latDeg,
              lonDeg: definition.globeAnchor.lonDeg,
              accentColor: definition.accentColor,
            };
          })}
        />
      )}

      {cityModule && (
        <>
          <cityModule.Scene definition={cityModule.definition} seed={0} quality={quality} />
          <Collectibles cityId={cityModule.definition.id} />
          <Player definition={cityModule.definition} />
        </>
      )}
    </>
  );
}
