import { UIModel, MapVM, ResultVM, ObjectiveCardVM, LevelId, CityId } from '@/contracts/game';

export const MOCK_LEVELS: readonly { id: LevelId; title: string }[] = [
  { id: 'icons', title: 'Icons of History' },
  { id: 'sky-sun', title: 'Sky & Sun' },
  { id: 'small-wonders', title: 'Small Wonders' },
];

export const MOCK_CITIES: readonly { id: CityId; label: string }[] = [
  { id: 'paris', label: 'Paris, France' },
  { id: 'giza', label: 'Giza, Egypt' },
];

export const MOCK_CARDS_ICONS: readonly ObjectiveCardVM[] = [
  {
    targetId: 'paris-iron',
    title: 'The Iron Lattice',
    clue: 'Puddle reflections reveal an iron giant towering above the Seine.',
    collected: false,
    selected: true,
    hintTier: 1,
    purchasedHints: ['City identified: Paris (Île-de-France)'],
    nextHintLabel: 'Reveal District',
    nextHintCostMs: 20_000,
  },
  {
    targetId: 'giza-crown',
    title: 'The Gilded Capstone',
    clue: 'Where royal limestone whispers beneath the midday desert zenith.',
    collected: false,
    selected: false,
    hintTier: 0,
    purchasedHints: [],
    nextHintLabel: 'Reveal City',
    nextHintCostMs: 10_000,
  },
];

export const MOCK_CARDS_COLLECTED: readonly ObjectiveCardVM[] = [
  {
    targetId: 'paris-iron',
    title: 'The Iron Lattice',
    clue: 'Puddle reflections reveal an iron giant towering above the Seine.',
    collected: true,
    selected: false,
    hintTier: 2,
    purchasedHints: [
      'City identified: Paris (Île-de-France)',
      'District identified: Champ de Mars sector',
    ],
    nextHintLabel: null,
    nextHintCostMs: null,
  },
  {
    targetId: 'giza-crown',
    title: 'The Gilded Capstone',
    clue: 'Where royal limestone whispers beneath the midday desert zenith.',
    collected: false,
    selected: true,
    hintTier: 2,
    purchasedHints: [
      'City identified: Giza (Nile West Bank)',
      'District identified: Khufu Plateau Enclosure',
    ],
    nextHintLabel: 'Narrow Search Radius',
    nextHintCostMs: 35_000,
  },
];

export const MOCK_MAP_PARIS: MapVM = {
  cityLabel: 'Paris',
  bounds: { minX: -72, maxX: 72, minZ: -72, maxZ: 72 },
  roads: [
    { minX: -72, maxX: 72, minZ: -6, maxZ: 6 },
    { minX: -8, maxX: 8, minZ: -72, maxZ: 72 },
    { minX: -50, maxX: -40, minZ: -50, maxZ: 50 },
    { minX: 35, maxX: 45, minZ: -50, maxZ: 50 },
  ],
  blockers: [
    { id: 'b1', minX: -60, maxX: -20, minZ: -60, maxZ: -20 },
    { id: 'b2', minX: 20, maxX: 60, minZ: -60, maxZ: -20 },
    { id: 'b3', minX: -60, maxX: -20, minZ: 20, maxZ: 60 },
    { id: 'b4', minX: 20, maxX: 60, minZ: 20, maxZ: 60 },
  ],
  landmarks: [
    {
      id: 'eiffel',
      label: 'Eiffel Tower Pavilion',
      center: [-35, -35],
      footprint: { minX: -45, maxX: -25, minZ: -45, maxZ: -25 },
      silhouette: 'tower',
    },
    {
      id: 'louvre',
      label: 'Louvre Courtyard',
      center: [35, 35],
      footprint: { minX: 25, maxX: 45, minZ: 25, maxZ: 45 },
      silhouette: 'museum',
    },
  ],
  player: [-10, 15],
  searchAreas: [
    {
      targetId: 'paris-iron',
      center: [-35, -35],
      radius: 18,
    },
  ],
};

export const MOCK_RESULT: ResultVM = {
  adjustedMs: 84_300,
  activeMs: 64_300,
  hintPenaltyMs: 15_000,
  travelPenaltyMs: 5_000,
  points: 4_850,
  medal: 'gold',
  practice: false,
  bestMs: 92_100,
  isNewBest: true,
  sessionOnly: true,
};

export function createBaseMockModel(): UIModel {
  return {
    phase: 'menu',
    levelId: 'icons',
    levels: MOCK_LEVELS,
    cities: MOCK_CITIES,
    cityId: null,
    cards: MOCK_CARDS_ICONS,
    activeMs: 0,
    adjustedMs: 0,
    penaltyMs: 0,
    practice: false,
    paused: false,
    map: null,
    result: null,
    settings: {
      muted: false,
      reducedMotion: false,
      quality: 'standard',
    },
    statusMessage: null,
  };
}
