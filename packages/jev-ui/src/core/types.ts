export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * The state channels a question can receive. The library collects `recent_actions` and
 * `time_spent`; `app` is yours.
 */
export const CHANNELS = ['app', 'recent_actions', 'time_spent'] as const;
export type Channel = (typeof CHANNELS)[number];

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string | null>;
}
export interface ScoreQuestion {
  type: 'score';
  instructions: string;
  criteria: string[];
}
export interface NoulQuestion {
  type: 'noul';
  instructions: string;
  criteria?: Record<string, string>;
}
export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}
export interface ScoreAnswer {
  type: 'score';
  score: number;
  probabilities: Record<string, number>;
  confidence: number;
}
export interface NoulAnswer {
  type: 'noul';
  noul: number;
}
export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

/** One judgment to resolve. `data` is the local state this judgment is about. */
export interface Decision {
  id: string;
  question: Question;
  data?: Json;
  /**
   * Narrow which state channels this question receives. Omitted, it gets all of them.
   *
   * The default is everything because the ambient state is deliberately tiny — a handful
   * of banded words — and a UI library whose collected context is withheld until you
   * hand-write a path is a library that does nothing by default. Reach for this when a
   * state grows big enough that irrelevant detail starts costing accuracy.
   */
  pick?: Channel[];
}

/**
 * Base state: what the library collected (ambient) plus what the developer
 * supplied at provider level (`app`). Ambient values are words, not numbers —
 * see `state.ts` for why.
 */
export interface BaseState {
  /** Yours. Any shape, any keys — the library never writes to it. */
  app?: Json;
  /** What the person just did, as labels, oldest first. */
  recent_actions?: string[];
  /** How long they have been on this screen, as a band rather than a number. */
  time_spent?: string;
}

export interface ResolveMeta {
  transport: string;
  /** Upstream API calls made. The whole point is that this stays 1. */
  requests: number;
  decisions: number;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  /**
   * USD for the whole request. A batch shares one cost because the state is ingested
   * once — which is exactly why adding a question is nearly free. Per-decision figures
   * are that cost divided by `decisions`, and are a share rather than a measurement.
   */
  costUsd?: number;
  /** True when the figures came from a recording rather than this call. */
  estimated?: boolean;
  ms: number;
}

/** What the model was actually sent — surfaced by the Inspector, verbatim. */
export interface SentPayload {
  /** Always an object: named fields beat one blob when a state has several parts. */
  state: Record<string, Json>;
  questions: Record<string, Question>;
}

export interface ResolveOutcome {
  answers: Record<string, Answer>;
  meta: ResolveMeta;
  sent: SentPayload;
}

export type ResolveFn = (
  decisions: Decision[],
  base: BaseState,
) => Promise<ResolveOutcome>;
