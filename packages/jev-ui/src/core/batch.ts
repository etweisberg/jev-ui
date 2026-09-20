import type { Answer, Decision, ResolveMeta, ResolveOutcome } from './types.js';

/** An answer plus the metadata of the request that produced it, including its cost. */
export interface Resolved {
  answer: Answer;
  meta: ResolveMeta;
}

/**
 * Collects every decision registered inside one tick and resolves them with a single
 * upstream call. This is the whole economic argument for the library: questions in one
 * request run in parallel and cost only their own tokens, because the state is ingested
 * once for all of them.
 *
 * Caveat worth knowing: a decision that only registers after another one's promise
 * resolves cannot join that batch. Siblings batch; waterfalls do not.
 */
export interface Batcher {
  ask(decision: Decision): Promise<Resolved>;
  /** Flush now instead of waiting for the microtask, for tests and explicit passes. */
  flush(): Promise<void>;
  /** Outcome of the most recent flush — what the Inspector reads. */
  last(): ResolveOutcome | undefined;
  pendingCount(): number;
}

type Waiter = {
  decision: Decision;
  resolve: (resolved: Resolved) => void;
  reject: (error: unknown) => void;
};

export interface BatcherOptions {
  resolve: (decisions: Decision[]) => Promise<ResolveOutcome>;
  onOutcome?: (outcome: ResolveOutcome) => void;
  /** Defaults to a microtask. Tests pass a manual scheduler. */
  schedule?: (flush: () => void) => void;
}

export function createBatcher(options: BatcherOptions): Batcher {
  const schedule = options.schedule ?? ((flush: () => void) => queueMicrotask(flush));
  let queue: Waiter[] = [];
  let scheduled = false;
  let inFlight: Promise<void> | undefined;
  let latest: ResolveOutcome | undefined;

  async function run(): Promise<void> {
    const batch = queue;
    queue = [];
    scheduled = false;
    if (batch.length === 0) return;

    try {
      const outcome = await options.resolve(batch.map((waiter) => waiter.decision));
      latest = outcome;
      options.onOutcome?.(outcome);
      for (const waiter of batch) {
        const answer = outcome.answers[waiter.decision.id];
        if (answer) waiter.resolve({ answer, meta: outcome.meta });
        else waiter.reject(new Error(`jev-ui: no answer returned for decision "${waiter.decision.id}"`));
      }
    } catch (error) {
      for (const waiter of batch) waiter.reject(error);
    }
  }

  return {
    ask(decision) {
      return new Promise<Resolved>((resolve, reject) => {
        queue.push({ decision, resolve, reject });
        if (!scheduled) {
          scheduled = true;
          schedule(() => {
            inFlight = run();
          });
        }
      });
    },
    async flush() {
      if (scheduled) {
        scheduled = false;
        inFlight = run();
      }
      await inFlight;
    },
    last: () => latest,
    pendingCount: () => queue.length,
  };
}

/**
 * What one decision inside a batch cost. The share is the request cost divided evenly —
 * an attribution, not a measurement, because the API reports tokens per request rather
 * than per question.
 */
export interface DecisionCost {
  /** USD for the whole request this decision travelled in. */
  batchUsd?: number;
  /** batchUsd divided by the number of decisions that shared the request. */
  shareUsd?: number;
  decisions: number;
  requests: number;
  inputTokens?: number;
  estimated: boolean;
  ms: number;
}

export function costFromMeta(meta: ResolveMeta | undefined): DecisionCost | undefined {
  if (!meta) return undefined;
  const decisions = Math.max(1, meta.decisions);
  return {
    ...(meta.costUsd === undefined ? {} : { batchUsd: meta.costUsd, shareUsd: meta.costUsd / decisions }),
    decisions: meta.decisions,
    requests: meta.requests,
    ...(meta.usage?.inputTokens === undefined ? {} : { inputTokens: meta.usage.inputTokens }),
    estimated: meta.estimated ?? false,
    ms: meta.ms,
  };
}
