/**
 * GLINT contract v1. Authoritative source of shared types and constants.
 * Adopted by A0 from contracts/game.ts, which is now a superseded snapshot.
 * Owner: A0. Plain data only — no React or Three.js imports.
 * Interface changes go through A0 and are recorded in docs/CONTRACTS.md.
 */
export const RULES_VERSION = 1;
export const CITY_HALF_EXTENT = 72;
export const PLAYER_RADIUS = 0.8;
export const PLAYER_SPEED = 11;
export const PICKUP_RADIUS = 2;
export const ENTRY_PENALTY_MS = 5_000;
/** Incremental, not cumulative. Index 0 is the price of tier 1. */
export const HINT_COST_MS = [10_000, 20_000, 35_000] as const;
export const FINE_SEARCH_RADIUS = 12;

export type CityId = 'paris' | 'giza' | 'rome' | 'san-francisco' | 'berlin';
export type LocationId = 'globe' | CityId;
export type TargetId =
  | 'paris-smile' | 'paris-iron' | 'paris-crescent'
  | 'giza-crown' | 'giza-guardian' | 'giza-beetle'
  | 'rome-arena' | 'rome-laurel'
  | 'sf-cable-car' | 'sf-bridge'
  | 'berlin-gate' | 'berlin-tower';
export type LevelId =
  | 'icons' | 'sky-sun' | 'small-wonders'
  | 'twin-capitals' | 'bay-and-forum' | 'wall-and-bay';
export type HintTier = 0 | 1 | 2 | 3;
export type PaidHintTier = 1 | 2 | 3;
export type Quality = 'low' | 'standard';
export type Vec2 = readonly [x: number, z: number];
export type Vec3 = readonly [x: number, y: number, z: number];
export type Phase = 'boot' | 'menu' | 'briefing' | 'globe' | 'travel' | 'city' | 'results' | 'error';

export interface RectXZ {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}
export interface SearchRegion {
  readonly center: Vec2;
  readonly radius: number;
}
export interface Blocker extends RectXZ { readonly id: string; }
export interface District {
  readonly id: string;
  readonly label: string;
  readonly broadSearch: SearchRegion;
  readonly narrowedSearch: SearchRegion;
}
export interface Landmark {
  readonly id: string;
  readonly label: string;
  readonly center: Vec2;
  readonly footprint: RectXZ;
  readonly silhouette:
    | 'tower' | 'pyramid' | 'museum' | 'sphinx' | 'cafe' | 'market'
    | 'colosseum' | 'fountain' | 'bridge' | 'cable-car' | 'gate' | 'tv-tower';
}
export interface SpawnSocket {
  readonly id: string;
  readonly districtId: string;
  /** Ground anchor reachable by the player. Collectible may hover above it. */
  readonly position: Vec3;
  /** Offset from position; radius FINE_SEARCH_RADIUS must contain position. */
  readonly fineSearchCenter: Vec2;
}
export interface CityDefinition {
  readonly id: CityId;
  readonly label: string;
  readonly globeAnchor: { readonly latDeg: number; readonly lonDeg: number };
  readonly bounds: RectXZ;
  readonly spawn: Vec3;
  readonly groundColor: string;
  readonly accentColor: string;
  readonly roads: readonly RectXZ[];
  readonly blockers: readonly Blocker[];
  readonly districts: readonly District[];
  readonly landmarks: readonly Landmark[];
  readonly sockets: readonly SpawnSocket[];
}
export interface TargetDefinition {
  readonly id: TargetId;
  readonly cityId: CityId;
  readonly landmarkId: string;
  readonly districtId: string;
  readonly clueTitle: string;
  readonly clueText: string;
  readonly revealName: string;
  readonly iconKind:
    | 'portrait' | 'tower-token' | 'croissant' | 'pyramidion' | 'sun-medallion' | 'scarab'
    | 'arena-token' | 'laurel' | 'cable-car-model' | 'bridge-postcard' | 'gate-miniature' | 'tv-tower-souvenir';
  readonly hintText: readonly [city: string, district: string, nearby: string];
  readonly socketIds: readonly string[];
}
export interface LevelDefinition {
  readonly id: LevelId;
  readonly title: string;
  readonly version: number;
  readonly seed: number;
  readonly targetIds: readonly TargetId[];
  readonly medalSeconds: { readonly gold: number; readonly silver: number; readonly bronze: number };
}
export interface ObjectiveInstance {
  readonly targetId: TargetId;
  readonly cityId: CityId;
  readonly socketId: string;
  readonly position: Vec3;
  readonly broadSearch: SearchRegion;
  readonly narrowedSearch: SearchRegion;
  readonly fineSearch: SearchRegion;
}
export interface TravelSpec {
  readonly id: string;
  readonly runId: string;
  readonly from: LocationId;
  readonly to: LocationId;
}
export interface RunSnapshot {
  readonly runId: string;
  readonly levelId: LevelId;
  readonly levelVersion: number;
  readonly rulesVersion: number;
  readonly seed: number;
  readonly objectives: readonly ObjectiveInstance[];
  readonly collected: readonly TargetId[];
  readonly hints: Readonly<Partial<Record<TargetId, HintTier>>>;
  readonly activeMs: number;
  readonly hintPenaltyMs: number;
  readonly travelPenaltyMs: number;
  readonly practice: boolean;
}
export interface Settings {
  readonly muted: boolean;
  readonly reducedMotion: boolean;
  readonly quality: Quality;
}
export type GameEvent =
  | { type: 'PREPARE_RUN'; run: RunSnapshot }
  | { type: 'GO' }
  | { type: 'SELECT_CITY'; cityId: CityId }
  | { type: 'LEAVE_CITY' }
  | { type: 'TRAVEL_COVERED'; runId: string; transitionId: string }
  | { type: 'TRAVEL_COMPLETE'; runId: string; transitionId: string }
  | { type: 'TRAVEL_FAILED'; runId: string; transitionId: string; message: string }
  | { type: 'TICK_ACTIVE'; elapsedMs: number }
  | { type: 'COLLECT'; targetId: TargetId; cityId: CityId }
  | { type: 'BUY_HINT'; targetId: TargetId; expectedTier: PaidHintTier }
  | { type: 'SELECT_OBJECTIVE'; targetId: TargetId }
  | { type: 'SET_MAP'; open: boolean }
  | { type: 'PAUSE'; reason: 'user' | 'blur' | 'hidden' }
  | { type: 'RESUME' }
  | { type: 'ABANDON' }
  | { type: 'SET_SETTINGS'; patch: Partial<Settings> };

export interface ObjectiveCardVM {
  readonly targetId: TargetId;
  readonly title: string;
  readonly clue: string;
  readonly collected: boolean;
  readonly selected: boolean;
  readonly hintTier: HintTier;
  readonly purchasedHints: readonly string[];
  readonly nextHintLabel: string | null;
  readonly nextHintCostMs: number | null;
  /** Resolved URL of the target's photo, from the A1-owned image registry. */
  readonly imageUrl: string;
  readonly imageAlt: string;
}
export type MapLandmarkVM = Omit<Landmark, 'label'> & {
  /** Null until the corresponding tier-2 hint permits the proper name. */
  readonly label: string | null;
};
export interface MapVM {
  readonly cityLabel: string;
  readonly bounds: RectXZ;
  readonly roads: readonly RectXZ[];
  readonly blockers: readonly Blocker[];
  readonly landmarks: readonly MapLandmarkVM[];
  readonly player: Vec2;
  readonly searchAreas: readonly (SearchRegion & { readonly targetId: TargetId })[];
}
export interface ResultVM {
  readonly adjustedMs: number;
  readonly activeMs: number;
  readonly hintPenaltyMs: number;
  readonly travelPenaltyMs: number;
  readonly points: number;
  readonly medal: 'gold' | 'silver' | 'bronze' | 'complete';
  readonly practice: boolean;
  readonly bestMs: number | null;
  readonly isNewBest: boolean;
  readonly sessionOnly: boolean;
}
export interface LevelSummaryVM {
  readonly id: LevelId;
  readonly title: string;
  readonly bestMs: number | null;
  readonly medal: ResultVM['medal'] | null;
}
export interface UIModel {
  readonly phase: Phase;
  readonly levelId: LevelId | null;
  readonly levels: readonly LevelSummaryVM[];
  readonly cities: readonly { id: CityId; label: string }[];
  readonly cityId: CityId | null;
  readonly cards: readonly ObjectiveCardVM[];
  readonly activeMs: number;
  readonly adjustedMs: number;
  readonly penaltyMs: number;
  readonly practice: boolean;
  readonly paused: boolean;
  readonly map: MapVM | null;
  readonly result: ResultVM | null;
  readonly settings: Settings;
  readonly statusMessage: string | null;
}
export interface UIActions {
  onSelectLevel(id: LevelId): void;
  onGo(): void;
  onSelectCity(id: CityId): void;
  onSelectObjective(id: TargetId): void;
  onHint(id: TargetId): void;
  onMap(open: boolean): void;
  onGlobe(): void;
  onPause(): void;
  onResume(): void;
  onRetry(): void;
  onNextTrial(): void;
  onMenu(): void;
  onSettings(patch: Partial<Settings>): void;
  onTouchAxis(x: number, z: number): void;
}
