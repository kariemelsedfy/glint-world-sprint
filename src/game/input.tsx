/**
 * Input aggregation. Owner: A1.
 * Keyboard + touch produce one normalized movement vector in city space; the UI only
 * emits intent through setTouchAxis and never moves the player itself.
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';

const keys = new Set<string>();
const touchAxis = { x: 0, z: 0 };

const TOUCH_DEADZONE = 0.12;

/** x east, z south. QWERTY, arrows and AZERTY (ZQSD) all map to the same vector. */
const MOVE_KEYS: Record<string, readonly [number, number]> = {
  KeyW: [0, -1],
  KeyZ: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  KeyQ: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

/**
 * Touch stick intent from the UI layer. Values are clamped, a small dead zone is
 * removed, and the remaining range is rescaled so a light push still walks slowly.
 */
export function setTouchAxis(x: number, z: number): void {
  const cx = clampUnit(x);
  const cz = clampUnit(z);
  const length = Math.hypot(cx, cz);
  if (length <= TOUCH_DEADZONE) {
    touchAxis.x = 0;
    touchAxis.z = 0;
    return;
  }
  const scaled = Math.min(1, (length - TOUCH_DEADZONE) / (1 - TOUCH_DEADZONE)) / length;
  touchAxis.x = cx * scaled;
  touchAxis.z = cz * scaled;
}

export function clearTouchAxis(): void {
  touchAxis.x = 0;
  touchAxis.z = 0;
}

export function resetInput(): void {
  keys.clear();
  clearTouchAxis();
}

/** Normalized movement vector in city space; x east, z south. Length is at most 1. */
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

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function InputProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!MOVE_KEYS[event.code]) return;
      if (isTextEntry(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      keys.add(event.code);
      // Arrow keys would otherwise scroll the itch.io page around the canvas.
      if (event.code.startsWith('Arrow')) event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };
    const onBlur = () => resetInput();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') resetInput();
    };
    const onPointerCancel = () => clearTouchAxis();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('touchcancel', onPointerCancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('touchcancel', onPointerCancel);
      document.removeEventListener('visibilitychange', onVisibility);
      resetInput();
    };
  }, []);

  return <>{children}</>;
}
