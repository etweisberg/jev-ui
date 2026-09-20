'use client';

import { Children, isValidElement, useEffect, type ReactNode } from 'react';
import type { DecisionCost } from '../core/batch.js';
import { NO_MATCH, resolveBranch, type BranchVerdict } from '../core/policy.js';
import type { Channel, Json } from '../core/types.js';
import { useDecision } from '../hooks/useDecision.js';

export interface OptionProps {
  /** The option key the model chooses between. */
  k?: string;
  /**
   * What this option means. This becomes the Choice criteria, and it is the single
   * highest-leverage string in the component: a bare key like "chart" gives the model
   * nothing to reason about.
   */
  when?: string;
  /** Rendered when confidence is too low, nothing fits, or the judgment failed. */
  fallback?: boolean;
  children: ReactNode;
}

/** Declarative marker. Branch reads its props; it never renders on its own. */
export function Option(_props: OptionProps): ReactNode {
  return null;
}

export interface BranchProps {
  id?: string;
  /** The judgment. Reference state with backticked paths, e.g. `data.question`. */
  ask: string;
  data?: Json;
  /** Narrow which state channels this question receives. Default: all of them. */
  pick?: Channel[];
  /** Below this, render the fallback instead of the winner. */
  minConfidence?: number;
  /** Rendered while resolving. Defaults to the fallback, so nothing flashes empty. */
  pending?: ReactNode;
  onVerdict?: (verdict: BranchVerdict) => void;
  /** What the request that answered this Branch cost. */
  onResolved?: (cost: DecisionCost) => void;
  children: ReactNode;
}

/**
 * Renders one of several subtrees. The judgment picks presentation; it never performs
 * an action — that stays in code, where it can be tested and reversed.
 */
export function Branch({
  id,
  ask,
  data,
  minConfidence = 0,
  pending,
  onVerdict,
  onResolved,
  children,
}: BranchProps) {
  const options: { key: string; when: string; node: ReactNode }[] = [];
  let fallback: ReactNode = null;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as OptionProps;
    if (props.fallback) {
      fallback = props.children;
      return;
    }
    if (props.k) options.push({ key: props.k, when: props.when ?? props.k, node: props.children });
  });

  const criteria: Record<string, string> = {};
  for (const option of options) criteria[option.key] = option.when;
  criteria[NO_MATCH] = 'None of the other options fits what the state describes.';

  const { status, answer, cost } = useDecision({
    ...(id === undefined ? {} : { id }),
    question: { type: 'choice', instructions: ask, criteria },
    ...(data === undefined ? {} : { data }),
  });

  const verdict =
    answer !== undefined
      ? resolveBranch(
          answer,
          options.map((option) => option.key),
          minConfidence,
        )
      : undefined;

  useEffect(() => {
    if (verdict && onVerdict) onVerdict(verdict);
  }, [verdict?.key, verdict?.reason, verdict?.confidence]);

  useEffect(() => {
    if (cost && onResolved) onResolved(cost);
  }, [cost?.batchUsd, cost?.decisions, cost?.ms]);

  if (status === 'pending') return <>{pending ?? fallback}</>;
  if (!verdict || verdict.key === null) return <>{fallback}</>;
  return <>{options.find((option) => option.key === verdict.key)?.node ?? fallback}</>;
}
