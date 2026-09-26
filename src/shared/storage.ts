/** Versioned, failure-tolerant local storage. Owner: A0; consumed by A1 persistence. */

export const STORAGE_KEY = 'glint:v1';

export interface StorageResult<T> {
  readonly value: T;
  /** False when storage is unavailable or unreadable; the game stays playable. */
  readonly persistent: boolean;
}

export function readStorage<T>(fallback: T): StorageResult<T> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw == null) return { value: fallback, persistent: true };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') return { value: fallback, persistent: true };
    return { value: parsed as T, persistent: true };
  } catch {
    return { value: fallback, persistent: false };
  }
}

export function writeStorage(value: unknown): boolean {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
