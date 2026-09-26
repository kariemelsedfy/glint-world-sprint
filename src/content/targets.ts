/**
 * STUB content created by A0 for bootstrap. Owner after CONTRACT_READY: A6.
 * Text copied from docs/CONTENT_AND_LEVELS.md; A6 owns final wording and validation.
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
      'Search the Louvre courtyard.',
      'Search outside the glass pyramid, at ground level.',
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
      'Search the Eiffel Tower plaza.',
      "The tiny tower stands outside the giant tower's feet.",
    ],
    socketIds: ['tower-a', 'tower-b', 'tower-c'],
  },
  {
    id: 'paris-crescent',
    cityId: 'paris',
    landmarkId: 'cafe',
    districtId: 'cafe',
    clueTitle: 'The crescent breakfast',
    clueText: 'Find a buttery crescent among striped cafe awnings.',
    revealName: 'Croissant souvenir',
    iconKind: 'croissant',
    hintText: [
      'Travel to Paris.',
      'Search the cafe quarter.',
      'Look beside a striped awning, outside the cafe.',
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
      'Search around the Great Pyramid.',
      "Circle the pyramid's base; the crown is on a low pedestal.",
    ],
    socketIds: ['pyramid-a', 'pyramid-b', 'pyramid-c'],
  },
  {
    id: 'giza-guardian',
    cityId: 'giza',
    landmarkId: 'sphinx',
    districtId: 'sphinx',
    clueTitle: 'The desert guardian',
    clueText: "A stone guardian with a lion's body watches over the sand.",
    revealName: 'Sphinx sun medallion',
    iconKind: 'sun-medallion',
    hintText: [
      'Travel to Giza.',
      'Search around the Sphinx.',
      'Look on the open ground beside the guardian.',
    ],
    socketIds: ['sphinx-a', 'sphinx-b', 'sphinx-c'],
  },
  {
    id: 'giza-beetle',
    cityId: 'giza',
    landmarkId: 'market',
    districtId: 'market',
    clueTitle: 'The blue beetle',
    clueText: "A blue beetle gleams beneath the desert market's canopies.",
    revealName: 'Scarab charm',
    iconKind: 'scarab',
    hintText: [
      'Travel to Giza.',
      'Search the market.',
      'Look around the outer edge of the market stalls.',
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
