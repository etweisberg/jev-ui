'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createBatcher, type Batcher, type Resolved } from '../core/batch.js';
import { stableStringify } from '../core/stable.js';
import { capRecent } from '../core/state.js';
import type {
  Answer,
  BaseState,
  Decision,
  Json,
  Question,
  ResolveFn,
  ResolveMeta,
  ResolveOutcome,
} from '../core/types.js';

/** An answer with the question that produced it, so levels and criteria stay readable. */
export interface AnsweredDecision {
  id: string;
  answer: Answer;
  question: Question;
  meta: ResolveMeta;
}

export interface JevContextValue {
  /**
   * Register a decision. Everything registered in one tick resolves in one request, and
   * the answer comes back with that request's metadata, including what it cost.
   */
  ask(decision: Decision): Promise<Resolved>;
  /** The state every question is resolved against, right now. */
  state: BaseState;
  /** Bump to force every mounted decision to resolve again. */
  epoch: number;
  revalidate(): void;
  /**
   * Forget the remembered answers. Call it when the page changes: the accumulated map is
   * per-screen, and carrying one screen's judgments onto the next is just noise.
   */
  reset(): void;
  /** Append a label to the action log. Labels are what the model reads, not raw events. */
  track(label: string): void;
  /** Merge a patch into the state. */
  setState(patch: Partial<BaseState>): void;
  /** Set or replace one key under `app`, leaving the rest alone. */
  setAppField(key: string, value: Json): void;
  outcomes: ResolveOutcome[];
  /**
   * The latest answer for every decision still on the page, keyed by id.
   *
   * `outcomes[0]` only holds the most recent request, so a page that re-resolves one
   * judgment would appear to have forgotten the other three. This keeps each one until
   * it is answered again.
   */
  answers: Record<string, AnsweredDecision>;
  /** Decisions awaiting an answer right now. 0 means everything on the page has settled. */
  inflight: number;
  /**
   * Failed judgments, newest first. Components fall back when a judgment fails, which
   * is correct behaviour but indistinguishable from a confident fallback — so the
   * failure is recorded here and shown in the Inspector rather than swallowed.
   */
  errors: string[];
}

const JevContext = createContext<JevContextValue | undefined>(undefined);

export function useJev(): JevContextValue {
  const value = useContext(JevContext);
  if (!value) throw new Error('jev-ui: this component must be rendered inside <JevProvider>');
  return value;
}

export interface JevProviderProps {
  /**
   * A Server Action. The client passes decisions and data; the server owns the key,
   * the model, and the transport. Handing the client a generic endpoint instead would
   * make it an open proxy to your API key.
   */
  resolve: ResolveFn;
  /**
   * The state every question starts from. One prop rather than two: `app` is yours to
   * shape, `recent_actions` and `time_spent` are the two things the library can maintain
   * for you. Update any of it later with `useJevState()`.
   */
  state?: Partial<BaseState>;
  /**
   * Called after every state change, with the new state. Persist it, sync it to a store,
   * log it — the library never decides what it means. One handler: compose in the arrow
   * if you need several, the way you would with any other React change handler.
   */
  onStateChange?: (state: BaseState) => void;
  /** How much of the action log to keep. */
  track?: { cap?: number };
  children: ReactNode;
}

export function JevProvider({
  resolve,
  state: incoming,
  onStateChange,
  track: trackOptions,
  children,
}: JevProviderProps) {
  const [state, setStateInternal] = useState<BaseState>(() => ({
    recent_actions: [],
    ...incoming,
  }));
  /**
   * Keep the keys the prop supplies in sync with it, one key at a time.
   *
   * Per key rather than wholesale: merging the whole object whenever any part of it
   * changed meant that updating `app.user` also re-applied a statically-passed
   * `recent_actions: []`, wiping everything track() had collected. Only fields whose own
   * value changed are written back, so a static field stays out of the way for good.
   */
  const signatures = (value: Partial<BaseState> | undefined): Record<string, string> =>
    Object.fromEntries(
      Object.entries(value ?? {}).map(([key, entry]) => [key, stableStringify(entry)]),
    );

  const incomingKey = stableStringify(incoming ?? null);
  const lastIncoming = useRef<Record<string, string>>(signatures(incoming));
  useEffect(() => {
    if (!incoming) return;
    const next = signatures(incoming);
    const changed: Record<string, unknown> = {};
    for (const [key, signature] of Object.entries(next)) {
      if (lastIncoming.current[key] !== signature) {
        changed[key] = (incoming as Record<string, unknown>)[key];
      }
    }
    lastIncoming.current = next;
    if (Object.keys(changed).length > 0) {
      setStateInternal((previous) => ({ ...previous, ...(changed as Partial<BaseState>) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingKey]);

  // Report changes after commit, so a handler that sets state elsewhere cannot tear.
  const changeRef = useRef<((state: BaseState) => void) | undefined>(onStateChange);
  changeRef.current = onStateChange;
  const firstReport = useRef(true);
  useEffect(() => {
    if (firstReport.current) {
      firstReport.current = false;
      return;
    }
    changeRef.current?.(state);
  }, [state]);

  const [epoch, setEpoch] = useState(0);
  const [outcomes, setOutcomes] = useState<ResolveOutcome[]>([]);
  const [inflight, setInflight] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnsweredDecision>>({});
  const [errors, setErrors] = useState<string[]>([]);

  // The batcher closes over refs so a changed prop never strands an in-flight batch.
  const stateRef = useRef<BaseState>(state);
  stateRef.current = state;
  const resolveRef = useRef<ResolveFn>(resolve);
  resolveRef.current = resolve;

  const batcherRef = useRef<Batcher | undefined>(undefined);
  if (!batcherRef.current) {
    batcherRef.current = createBatcher({
      resolve: (decisions) => resolveRef.current(decisions, stateRef.current),
      onOutcome: (outcome) => {
        setOutcomes((prev) => [outcome, ...prev].slice(0, 20));
        setAnswers((prev) => {
          const next = { ...prev };
          for (const [id, answer] of Object.entries(outcome.answers)) {
            const question = outcome.sent.questions[id];
            if (question) next[id] = { id, answer, question, meta: outcome.meta };
          }
          return next;
        });
      },
    });
  }
  const batcher = batcherRef.current;

  const ask = useCallback(
    (decision: Decision) => {
      setInflight((count) => count + 1);
      return batcher
        .ask(decision)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setErrors((previous) => [message, ...previous].slice(0, 10));
          throw error;
        })
        .finally(() => setInflight((count) => count - 1));
    },
    [batcher],
  );

  const track = useCallback(
    (label: string) => {
      const cap = trackOptions?.cap ?? 12;
      setStateInternal((prev) => ({
        ...prev,
        recent_actions: capRecent([...(prev.recent_actions ?? []), label], cap),
      }));
    },
    [trackOptions?.cap],
  );

  const setState = useCallback((patch: Partial<BaseState>) => {
    setStateInternal((prev) => ({ ...prev, ...patch }));
  }, []);

  const setAppField = useCallback((key: string, value: Json) => {
    setStateInternal((prev) => {
      const app = prev.app && typeof prev.app === 'object' && !Array.isArray(prev.app)
        ? (prev.app as Record<string, Json>)
        : {};
      return { ...prev, app: { ...app, [key]: value } };
    });
  }, []);

  const reset = useCallback(() => setAnswers({}), []);

  const revalidate = useCallback(() => {
    // Drop the remembered answers too: they describe the state before this change.
    setAnswers({});
    setEpoch((value) => value + 1);
  }, []);

  const value = useMemo<JevContextValue>(
    () => ({
      ask,
      state,
      epoch,
      revalidate,
      reset,
      track,
      setState,
      setAppField,
      outcomes,
      answers,
      inflight,
      errors,
    }),
    [ask, state, epoch, revalidate, reset, track, setState, setAppField, outcomes, answers, inflight, errors],
  );

  return <JevContext.Provider value={value}>{children}</JevContext.Provider>;
}
