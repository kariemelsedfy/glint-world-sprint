/**
 * BOOTSTRAP input aggregation created by A0. Owner after CONTRACT_READY: A1.
 * Keyboard + touch produce one normalized movement vector; the UI only emits intent.
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';

const keys = new Set<string>();
const touchAxis = { x: 0, z: 0 };

const MOVE_KEYS: Record<string, readonly [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function setTouchAxis(x: number, z: number): void {
  touchAxis.x = Math.max(-1, Math.min(1, x));
  touchAxis.z = Math.max(-1, Math.min(1, z));
}

export function resetInput(): void {
  keys.clear();
  touchAxis.x = 0;
  touchAxis.z = 0;
}

/** Normalized movement vector in city space; x east, z south. */
export function getMoveAxis(): readonly [number, number] {
  let x = touchAxis.x;
  let z = touchAxis.z;
  for (const code of keys) {
    const delta = MOVE_KEYS[code];
    if (!delta) continue;
    x += delta[0];
    z += delta[1];
  }
  const length = Math.hypot(x, z);
  if (length <= 0.0001) return [0, 0];
  if (length <= 1) return [x, z];
  return [x / length, z / length];
}

export function InputProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!MOVE_KEYS[event.code]) return;
      keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };
    const onBlurOrHide = () => resetInput();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrHide);
    document.addEventListener('visibilitychange', onBlurOrHide);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrHide);
      document.removeEventListener('visibilitychange', onBlurOrHide);
      resetInput();
    };
  }, []);

  return <>{children}</>;
}
