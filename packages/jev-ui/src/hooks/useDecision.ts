'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useJev } from '../components/provider.js';
import { sanitizeId } from '../core/ids.js';
import { channelsFor } from '../core/payload.js';
import { costFromMeta, type DecisionCost } from '../core/batch.js';
import type {
  Answer,
  BaseState,
  Channel,
  Decision,
  Json,
  Question,
  ResolveMeta,
} from '../core/types.js';

export interface DecisionSpec {
  /** Optional readable id. Shows up in the Inspector; does not affect fixture keys. */
  id?: string;
  question: Question;
  data?: Json;
  /** Narrow which state channels this question receives. Default: all of them. */
  pick?: Channel[];
}

export type DecisionStatus = 'pending' | 'ready' | 'error';

export interface UseDecisionsResult {
  status: DecisionStatus;
  answers: Record<string, Answer | undefined>;
  error?: Error;
  decisions: Decision[];
  /** What the request that answered these decisions cost. */
  cost?: DecisionCost;
}

/**
 * A judgment re-resolves when its question, its data, or any state it receives changes.
 *
 * That is only affordable because the ambient state is banded words rather than raw
 * telemetry: dwell time in milliseconds would churn on every tick, while
 * "glanced" -> "read" happens at most twice.
 */
function dependencyKey(spec: DecisionSpec, base: BaseState): string {
  const seen: Record<string, unknown> = {};
  const picked = channelsFor({
    id: '',
    question: spec.question,
    ...(spec.pick ? { pick: spec.pick } : {}),
  });
  for (const channel of picked) seen[channel] = base[channel];
  return JSON.stringify([spec.question, spec.data ?? null, seen]);
}

export function useDecisions(specs: readonly DecisionSpec[]): UseDecisionsResult {
  const { ask, state: base, epoch } = useJev();
  const scopeId = sanitizeId(useId());

  const decisions = useMemo<Decision[]>(
    () =>
      specs.map((spec, index) => ({
        id: spec.id ? sanitizeId(spec.id) : `${scopeId}_${index}`,
        question: spec.question,
        ...(spec.data === undefined ? {} : { data: spec.data }),
        ...(spec.pick === undefined ? {} : { pick: spec.pick }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [specs, scopeId],
  );

  const key = useMemo(
    () => JSON.stringify(specs.map((spec) => dependencyKey(spec, base))),
    [specs, base],
  );

  const decisionsRef = useRef(decisions);
  decisionsRef.current = decisions;

  const [result, setResult] = useState<{
    status: DecisionStatus;
    answers: Record<string, Answer | undefined>;
    error?: Error;
    meta?: ResolveMeta;
  }>({ status: 'pending', answers: {} });

  useEffect(() => {
    let alive = true;
    const batch = decisionsRef.current;
    setResult({ status: 'pending', answers: {} });
    if (batch.length === 0) {
      setResult({ status: 'ready', answers: {} });
      return;
    }
    Promise.all(
      batch.map((decision) =>
        ask(decision).then((resolved) => [decision.id, resolved] as const),
      ),
    )
      .then((pairs) => {
        if (!alive) return;
        const answers = Object.fromEntries(pairs.map(([id, resolved]) => [id, resolved.answer]));
        // Every decision in a batch shares one request, so any of them carries its meta.
        const meta = pairs[0]?.[1].meta;
        setResult({ status: 'ready', answers, ...(meta === undefined ? {} : { meta }) });
      })
      .catch((error: unknown) => {
        if (alive) {
          setResult({
            status: 'error',
            answers: {},
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [key, epoch, ask]);

  const cost = costFromMeta(result.meta);
  return {
    status: result.status,
    answers: result.answers,
    ...(result.error === undefined ? {} : { error: result.error }),
    decisions,
    ...(cost === undefined ? {} : { cost }),
  };
}

export interface UseDecisionResult {
  status: DecisionStatus;
  answer?: Answer;
  error?: Error;
  id: string;
  cost?: DecisionCost;
}

export function useDecision(spec: DecisionSpec): UseDecisionResult {
  const specs = useMemo(
    () => [spec],
    [JSON.stringify([spec.question, spec.data ?? null, spec.id ?? null, spec.pick ?? null])],
  );
  const { status, answers, error, decisions, cost } = useDecisions(specs);
  const id = decisions[0]?.id ?? 'unknown';
  const answer = answers[id];
  return {
    status,
    ...(answer === undefined ? {} : { answer }),
    ...(error === undefined ? {} : { error }),
    id,
    ...(cost === undefined ? {} : { cost }),
  };
}
