/** Content barrel. Owner after CONTRACT_READY: A6. */
export { TARGETS, getTarget } from '@/content/targets';
export { LEVELS, DEFAULT_LEVEL_ID, getLevel } from '@/content/levels';
export { resolveObjectives } from '@/content/resolveObjectives';
export {
  assertContentValid,
  buildReachabilityMap,
  errorsOf,
  formatIssues,
  validateContent,
  validateSocketPlacement,
  validateTarget,
  warningsOf,
} from '@/content/validate';
export type { ContentIssue, IssueSeverity, ReachabilityMap } from '@/content/validate';
