'use client';

import { describeScore } from '../core/policy.js';
import type { Channel, Json } from '../core/types.js';
import { useDecision, type DecisionStatus } from './useDecision.js';

export interface UseScoreOptions {
  id?: string;
  ask: string;
  /** Ordered levels, each describing a concrete situation. */
  levels: readonly string[];
  data?: Json;
  /** Narrow which state channels this question receives. Default: all of them. */
  pick?: Channel[];
}

export interface UseScoreResult {
  status: DecisionStatus;
  /** Position along the levels; can fall between two of them. */
  score: number;
  /** score mapped to 0–1, for driving a prop. */
  normalized: number;
  level: string;
  confidence: number;
}

/**
 * A graded dimension, for when the answer drives props rather than which subtree
 * renders: how dense a view should be, how much help text to show, how many rows.
 *
 * Do not read the score as a magnitude between two levels — Jev's score levels are
 * weak in numeric calibration. Threshold it instead.
 */
export function useScore(options: UseScoreOptions): UseScoreResult {
  const { status, answer } = useDecision({
    ...(options.id === undefined ? {} : { id: options.id }),
    question: { type: 'score', instructions: options.ask, criteria: [...options.levels] },
    ...(options.data === undefined ? {} : { data: options.data }),
    ...(options.pick === undefined ? {} : { pick: options.pick }),
  });
  const described = answer
    ? describeScore(answer, options.levels)
    : { score: 0, normalized: 0, level: options.levels[0] ?? '', confidence: 0 };
  return { status, ...described };
}
