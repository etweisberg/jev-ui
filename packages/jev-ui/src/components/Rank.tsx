'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { DecisionCost } from '../core/batch.js';
import {
  dropBelow,
  orderCompete,
  orderGrade,
  pinTop as applyPinTop,
  takeTop,
  type Ranked,
} from '../core/policy.js';
import type { Channel, Json, Question } from '../core/types.js';
import { useDecisions, type DecisionStatus } from '../hooks/useDecision.js';

export type RankMode = 'compete' | 'grade';

export interface RankProps<T> {
  id?: string;
  items: readonly T[];
  /** The judgment. In grade mode it should reference `data.item`. */
  ask: string;
  idOf: (item: T) => string;
  /** How each candidate is described to the model. The model cannot pick what it cannot see. */
  labelOf: (item: T) => string;
  /**
   * compete (Choice): probabilities sum to 1, so something always wins. Right for
   * "which one did they mean".
   * grade (one Score per item): comparable across items and across requests. Required
   * for filtering, and for paged lists where page 2 must rank against page 1.
   */
  mode?: RankMode;
  /** Grade mode only: ordered levels describing concrete situations. */
  levels?: readonly string[];
  /** Shared context for the judgment, read as `data.*`. */
  data?: Json;
  /** Narrow which state channels this question receives. Default: all of them. */
  pick?: Channel[];
  take?: number;
  /** Hold the first N items in place. Muscle memory outranks fit in a menu. */
  pinTop?: number;
  /** Grade mode only: drop anything scoring below this (0–1). */
  minScore?: number;
  /** What the request that answered this Rank cost. */
  onResolved?: (cost: DecisionCost) => void;
  children: (
    ranked: Ranked<T>[],
    meta: { status: DecisionStatus; mode: RankMode; cost?: DecisionCost },
  ) => ReactNode;
}

const DEFAULT_LEVELS = [
  'Not relevant to what the state describes',
  'Loosely related',
  'Clearly relevant',
  'Exactly what the state describes',
];

/** Orders, filters, and truncates a candidate set. Typeahead is this with `take`. */
export function Rank<T>({
  id,
  items,
  ask,
  idOf,
  labelOf,
  mode = 'compete',
  levels,
  data,
  take,
  pinTop = 0,
  minScore,
  onResolved,
  children,
}: RankProps<T>) {
  const gradeLevels = levels ?? DEFAULT_LEVELS;

  const specs = useMemo(() => {
    if (mode === 'compete') {
      const criteria: Record<string, string> = {};
      for (const item of items) criteria[idOf(item)] = labelOf(item);
      const question: Question = { type: 'choice', instructions: ask, criteria };
      return [
        { ...(id === undefined ? {} : { id }), question, ...(data === undefined ? {} : { data }) },
      ];
    }
    // Grade mode fans out: one comparable Score per candidate, all in the same request.
    const shared = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    return items.map((item) => ({
      id: id ? `${id}_${idOf(item)}` : undefined,
      question: { type: 'score', instructions: ask, criteria: [...gradeLevels] } as Question,
      data: { ...shared, item: labelOf(item) } as Json,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ask, id, JSON.stringify(items.map(idOf)), JSON.stringify(items.map(labelOf)), JSON.stringify(data ?? null), JSON.stringify(gradeLevels)]);

  const normalizedSpecs = useMemo(
    () => specs.map((spec) => (spec.id === undefined ? { question: spec.question, data: spec.data } : spec)),
    [specs],
  );

  const { status, answers, decisions, cost } = useDecisions(normalizedSpecs);

  // Keep the last good ordering while a new judgment is in flight. Falling back to the
  // raw candidate order with zeroed scores makes a working list look broken, and the
  // previous answer is the best information available until the next one lands.
  const lastGood = useRef<Ranked<T>[] | undefined>(undefined);

  const ranked = useMemo<Ranked<T>[]>(() => {
    if (status !== 'ready') {
      const previous = lastGood.current;
      const ids = new Set(items.map(idOf));
      if (previous && previous.length > 0 && previous.every((entry) => ids.has(entry.id))) {
        return previous;
      }
      return items.map((item) => ({ item, id: idOf(item), score: 0, pinned: false }));
    }

    let ordered: Ranked<T>[];
    if (mode === 'compete') {
      const only = decisions[0] ? answers[decisions[0].id] : undefined;
      ordered = only ? orderCompete(only, items, idOf) : items.map((item) => ({ item, id: idOf(item), score: 0, pinned: false }));
    } else {
      const byItemId: Record<string, (typeof answers)[string]> = {};
      items.forEach((item, index) => {
        const decision = decisions[index];
        if (decision) byItemId[idOf(item)] = answers[decision.id];
      });
      ordered = orderGrade(byItemId, items, idOf, gradeLevels.length);
      if (minScore !== undefined) ordered = dropBelow(ordered, minScore);
    }

    if (pinTop > 0) ordered = applyPinTop(ordered, items, pinTop, idOf);
    const result = takeTop(ordered, take);
    lastGood.current = result;
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, answers, decisions, items, mode, pinTop, take, minScore, gradeLevels.length]);

  // Keyed on scalars: costFromMeta builds a fresh object every render, so comparing the
  // object itself would fire this on every pass.
  useEffect(() => {
    if (cost && onResolved) onResolved(cost);
  }, [cost?.batchUsd, cost?.decisions, cost?.ms]);

  return <>{children(ranked, { status, mode, ...(cost === undefined ? {} : { cost }) })}</>;
}
