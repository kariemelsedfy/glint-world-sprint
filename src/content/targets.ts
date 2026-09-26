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
  {
    id: 'rome-arena',
    cityId: 'rome',
    landmarkId: 'colosseum',
    districtId: 'arena',
    clueTitle: 'The broken ring',
    clueText: 'A huge stone ring of arches still remembers the roar of a crowd.',
    revealName: 'Colosseum souvenir',
    iconKind: 'arena-token',
    hintText: [
      'Travel to Rome.',
      'Search the Arena quarter, north-west of where you arrive.',
      'The souvenir sits on the paving around the arena’s outer wall — circle the stone, never enter it.',
    ],
    socketIds: ['arena-a', 'arena-b', 'arena-c'],
  },
  {
    id: 'rome-laurel',
    cityId: 'rome',
    landmarkId: 'fountain',
    districtId: 'piazza',
    clueTitle: 'The victor’s crown',
    clueText: 'Leaves of gold, worn by winners, rest where coins are thrown.',
    revealName: 'Laurel wreath',
    iconKind: 'laurel',
    hintText: [
      'Travel to Rome.',
      'Search the Fountain piazza, east of where you arrive.',
      'The wreath lies on open ground beside the fountain basin, a few strides outside its stone rim.',
    ],
    socketIds: ['piazza-a', 'piazza-b', 'piazza-c'],
  },
  {
    id: 'sf-cable-car',
    cityId: 'san-francisco',
    landmarkId: 'cable-barn',
    districtId: 'cable',
    clueTitle: 'The hill climber',
    clueText: 'A little wooden carriage is hauled uphill by a cable under the street.',
    revealName: 'Cable-car model',
    iconKind: 'cable-car-model',
    hintText: [
      'Travel to San Francisco.',
      'Search the Cable-car street, east of where you arrive.',
      'The model stands on the sidewalk outside the car barn, at the edge of the painted curb.',
    ],
    socketIds: ['cable-a', 'cable-b', 'cable-c'],
  },
  {
    id: 'sf-bridge',
    cityId: 'san-francisco',
    landmarkId: 'golden-gate',
    districtId: 'bridge',
    clueTitle: 'The red crossing',
    clueText: 'Two tall towers carry a red road above cold water and fog.',
    revealName: 'Bridge postcard',
    iconKind: 'bridge-postcard',
    hintText: [
      'Travel to San Francisco.',
      'Search the Bridge overlook, north-west of where you arrive.',
      'The postcard waits on the overlook ground near the bridge approach — stay outside the roadway.',
    ],
    socketIds: ['bridge-a', 'bridge-b', 'bridge-c'],
  },
  {
    id: 'berlin-gate',
    cityId: 'berlin',
    landmarkId: 'brandenburg-gate',
    districtId: 'gate',
    clueTitle: 'The chariot gate',
    clueText: 'Tall columns hold a chariot above a boulevard once split in two.',
    revealName: 'Gate miniature',
    iconKind: 'gate-miniature',
    hintText: [
      'Travel to Berlin.',
      'Search the Gate boulevard, north-west of where you arrive.',
      'The miniature rests on the broad paving outside the gate, never between its columns.',
    ],
    socketIds: ['gate-a', 'gate-b', 'gate-c'],
  },
  {
    id: 'berlin-tower',
    cityId: 'berlin',
    landmarkId: 'tv-tower',
    districtId: 'tower',
    clueTitle: 'The sphere on a spike',
    clueText: 'A silver ball is skewered high on a needle above the rooftops.',
    revealName: 'TV Tower souvenir',
    iconKind: 'tv-tower-souvenir',
    hintText: [
      'Travel to Berlin.',
      'Search the Tower square, north-east of where you arrive.',
      'The souvenir sits on the square’s paving around the tower base, a short run from its shaft.',
    ],
    socketIds: ['tower-a', 'tower-b', 'tower-c'],
  },
];

const BY_ID = new Map<TargetId, TargetDefinition>(TARGETS.map((target) => [target.id, target]));

export function getTarget(id: TargetId): TargetDefinition {
  const target = BY_ID.get(id);
  if (!target) throw new Error(`Unknown target ${id}`);
  return target;
}
