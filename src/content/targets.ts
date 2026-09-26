/**
 * Six target definitions. Owner: A6.
 *
 * Wording rules (enforced by `validateTarget`): the free clue evokes the landmark's imagery but
 * never names the city or the landmark; tier 1 names the city; tier 2 names the district / landmark
 * and its compass direction from the spawn crossroads; tier 3 describes where the fine patch lies
 * and must be true for every candidate socket. Starter wording from docs/CONTENT_AND_LEVELS.md,
 * revised by hand here; no AI Studio output was used.
 */
import type { TargetDefinition, TargetId } from '@/shared/contracts';

export const TARGETS: readonly TargetDefinition[] = [
  {
    id: 'paris-smile',
    cityId: 'paris',
    landmarkId: 'louvre',
    districtId: 'louvre',
    clueTitle: 'The secret smile',
    clueText: 'A famous smile waits near a glass triangle.',
    revealName: 'Mona Lisa replica',
    iconKind: 'portrait',
    hintText: [
      'Travel to Paris.',
      'Search the Louvre courtyard, north of where you arrive.',
      'The portrait stands on the paving just outside the museum walls — walk the building’s edge, never inside.',
    ],
    socketIds: ['louvre-a', 'louvre-b', 'louvre-c'],
  },
  {
    id: 'paris-iron',
    cityId: 'paris',
    landmarkId: 'eiffel',
    districtId: 'tower',
    clueTitle: 'The iron needle',
    clueText: 'An iron giant points at the sky. Its tiny twin waits below.',
    revealName: 'Eiffel Tower token',
    iconKind: 'tower-token',
    hintText: [
      'Travel to Paris.',
      'Search the Eiffel Tower plaza, north-west of where you arrive.',
      'The tiny tower stands on open plaza ground a few strides from the giant tower’s legs — circle its base.',
    ],
    socketIds: ['tower-a', 'tower-b', 'tower-c'],
  },
  {
    id: 'paris-crescent',
    cityId: 'paris',
    landmarkId: 'cafe',
    districtId: 'cafe',
    clueTitle: 'The crescent breakfast',
    clueText: 'Find a buttery crescent where coffee is poured under striped awnings.',
    revealName: 'Croissant souvenir',
    iconKind: 'croissant',
    hintText: [
      'Travel to Paris.',
      'Search the Cafe quarter, north-east of where you arrive.',
      'The croissant sits on the pavement outside the striped cafe, close to its walls — check every side.',
    ],
    socketIds: ['cafe-a', 'cafe-b', 'cafe-c'],
  },
  {
    id: 'giza-crown',
    cityId: 'giza',
    landmarkId: 'great-pyramid',
    districtId: 'pyramids',
    clueTitle: 'The lost crown',
    clueText: 'Find a golden crown where giant triangles meet the sand.',
    revealName: 'Imagined golden pyramidion',
    iconKind: 'pyramidion',
    hintText: [
      'Travel to Giza.',
      'Search the Pyramid plateau, north-west of where you arrive.',
      'The crown rests on a low pedestal on the open sand around the Great Pyramid, a short run from its base.',
    ],
    socketIds: ['pyramid-a', 'pyramid-b', 'pyramid-c'],
  },
  {
    id: 'giza-guardian',
    cityId: 'giza',
    landmarkId: 'sphinx',
    districtId: 'sphinx',
    clueTitle: 'The desert guardian',
    clueText: 'A stone guardian with a lion’s body watches over the sand.',
    revealName: 'Sphinx sun medallion',
    iconKind: 'sun-medallion',
    hintText: [
      'Travel to Giza.',
      'Search the Sphinx terrace, east of where you arrive.',
      'The medallion lies on the open ground beside the guardian, a few strides off its stone — walk around it.',
    ],
    socketIds: ['sphinx-a', 'sphinx-b', 'sphinx-c'],
  },
  {
    id: 'giza-beetle',
    cityId: 'giza',
    landmarkId: 'market',
    districtId: 'market',
    clueTitle: 'The blue beetle',
    clueText: 'A blue beetle gleams beneath bright canopies in the desert.',
    revealName: 'Scarab charm',
    iconKind: 'scarab',
    hintText: [
      'Travel to Giza.',
      'Search the Desert market, south-east of where you arrive.',
      'The scarab waits on the sand around the outer edge of the market stalls — never between them.',
    ],
    socketIds: ['market-a', 'market-b', 'market-c'],
  },
];

const BY_ID = new Map<TargetId, TargetDefinition>(TARGETS.map((target) => [target.id, target]));

export function getTarget(id: TargetId): TargetDefinition {
  const target = BY_ID.get(id);
  if (!target) throw new Error(`Unknown target ${id}`);
  return target;
}
