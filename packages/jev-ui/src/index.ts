/**
 * jev-ui — client entry point.
 *
 * Three components mapping onto the three model primitives:
 *   <Branch>  Choice + no-match   pick one subtree
 *   <Rank>    Choice or Score     order, filter, truncate a candidate set
 *   <Gate>    Noul                show an affordance when a condition holds
 *
 * Plus useScore for judgments that drive props, and useDecision(s) for raw answers.
 * Typeahead is <Rank mode="compete" take={n}>, not a separate concept.
 */
export { Branch, Option, type BranchProps, type OptionProps } from './components/Branch.js';
export { Gate, type GateProps } from './components/Gate.js';
export { JevCost, type JevCostProps } from './components/Cost.js';
export { Rank, type RankMode, type RankProps } from './components/Rank.js';
export {
  JevAnswers,
  JevErrors,
  JevInspector,
  JevMeta,
  JevRequest,
  JevStateEditor,
  JevStatus,
  type JevInspectorProps,
} from './components/Inspector.js';
export {
  JevProvider,
  useJev,
  type JevContextValue,
  type JevProviderProps,
} from './components/provider.js';
export {
  useDecision,
  useDecisions,
  type DecisionSpec,
  type DecisionStatus,
  type UseDecisionResult,
  type UseDecisionsResult,
} from './hooks/useDecision.js';
export { useScore, type UseScoreOptions, type UseScoreResult } from './hooks/useScore.js';
export { useJevState, useTimeOnScreen, type JevStateHandle } from './hooks/useJevState.js';

export {
  NO_MATCH,
  describeScore,
  dropBelow,
  isChoice,
  isNoul,
  isScore,
  orderCompete,
  orderGrade,
  pinTop,
  resolveBranch,
  resolveGate,
  takeTop,
  type BranchVerdict,
  type Ranked,
} from './core/policy.js';
export {
  bucketFamiliarity,
  bucketProgress,
  bucketTimeSpent,
  capRecent,
  type FamiliarityBand,
  type ProgressBand,
  type TimeSpentBand,
} from './core/state.js';
export { channelsIn, extractPaths, namespaceDataPaths, rootOf, unknownRoots } from './core/paths.js';
export { auditDecision, buildPayload, channelsFor, isolatePayload } from './core/payload.js';
export { sanitizeId } from './core/ids.js';
export {
  createBatcher,
  costFromMeta,
  type Batcher,
  type BatcherOptions,
  type DecisionCost,
  type Resolved,
} from './core/batch.js';
export {
  DEFAULT_PRICING,
  FALLBACK_PRICE,
  costOf,
  formatCost,
  formatPerThousand,
  priceFor,
  type ModelPrice,
  type Usage,
} from './core/pricing.js';
export { CHANNELS } from './core/types.js';
export type {
  Answer,
  BaseState,
  Channel,
  ChoiceAnswer,
  ChoiceQuestion,
  Decision,
  Json,
  NoulAnswer,
  NoulQuestion,
  Question,
  ResolveFn,
  ResolveMeta,
  ResolveOutcome,
  ScoreAnswer,
  ScoreQuestion,
  SentPayload,
} from './core/types.js';
