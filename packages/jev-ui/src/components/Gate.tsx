'use client';

import { useEffect, type ReactNode } from 'react';
import type { DecisionCost } from '../core/batch.js';
import { resolveGate } from '../core/policy.js';
import type { Channel, Json } from '../core/types.js';
import { useDecision } from '../hooks/useDecision.js';

export interface GateProps {
  id?: string;
  /** A yes/no condition about the state. */
  ask: string;
  data?: Json;
  /** Narrow which state channels this question receives. Default: all of them. */
  pick?: Channel[];
  /** Probability at or above which the gate opens. */
  threshold?: number;
  /** Rendered when the gate stays closed. Usually nothing. */
  otherwise?: ReactNode;
  onProbability?: (probability: number) => void;
  /** What the request that answered this Gate cost. */
  onResolved?: (cost: DecisionCost) => void;
  children: ReactNode;
}

/**
 * Shows an affordance when a condition holds — a hint for someone who looks stuck, an
 * advanced panel, an optional field that now applies.
 *
 * Use it to ADD things, never to hide primary content: content removed by a judgment
 * is an accessibility and SEO problem, and it is invisible to the person who needed it.
 */
export function Gate({
  id,
  ask,
  data,
  threshold = 0.5,
  otherwise = null,
  onProbability,
  onResolved,
  children,
}: GateProps) {
  const { status, answer, cost } = useDecision({
    ...(id === undefined ? {} : { id }),
    question: { type: 'noul', instructions: ask },
    ...(data === undefined ? {} : { data }),
  });

  const gate = answer ? resolveGate(answer, threshold) : undefined;

  useEffect(() => {
    if (gate && onProbability) onProbability(gate.probability);
  }, [gate?.probability]);

  useEffect(() => {
    if (cost && onResolved) onResolved(cost);
  }, [cost?.batchUsd, cost?.decisions, cost?.ms]);

  // Closed while resolving: an affordance that flashes in and out is worse than late.
  if (status !== 'ready' || !gate?.open) return <>{otherwise}</>;
  return <>{children}</>;
}
