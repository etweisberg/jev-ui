import { TypeSafeClient } from '@typesafe-ai/sdk';
import { buildPayload } from '../core/payload.js';
import { costOf, type ModelPrice } from '../core/pricing.js';
import type { Answer, BaseState, Decision, ResolveOutcome } from '../core/types.js';
import type { Transport, TransportContext } from './types.js';

/**
 * One upstream call for the whole batch. Jev ingests the state once and evaluates
 * every question against it in parallel, so N decisions cost N questions' tokens
 * rather than N requests.
 */
function normalizeAnswer(raw: unknown): Answer {
  const value = raw as Record<string, unknown>;
  const type = value.type as string;
  if (type === 'choice') {
    return {
      type: 'choice',
      choice: String(value.choice),
      probabilities: (value.probabilities ?? {}) as Record<string, number>,
      confidence: Number(value.confidence ?? 0),
    };
  }
  if (type === 'score') {
    return {
      type: 'score',
      score: Number(value.score ?? 0),
      probabilities: (value.probabilities ?? {}) as Record<string, number>,
      confidence: Number(value.confidence ?? 0),
    };
  }
  return { type: 'noul', noul: Number(value.noul ?? 0) };
}

function pick(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
  }
  return undefined;
}

/** The API reports snake_case; the SDK may normalize. Accept either. */
function readUsage(usage: unknown): { inputTokens?: number; outputTokens?: number } | undefined {
  if (!usage || typeof usage !== 'object') return undefined;
  const record = usage as Record<string, unknown>;
  const inputTokens = pick(record, ['inputTokens', 'input_tokens']);
  const outputTokens = pick(record, ['outputTokens', 'output_tokens']);
  if (inputTokens === undefined && outputTokens === undefined) return undefined;
  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
  };
}

let cached: TypeSafeClient | undefined;
function client(): TypeSafeClient {
  if (!process.env.TYPESAFE_API_KEY) {
    throw new Error(
      'jev-ui: TYPESAFE_API_KEY is not set. Put it in the demo app environment file, ' +
        'or run with JEV_TRANSPORT=replay to serve recorded fixtures instead.',
    );
  }
  cached ??= new TypeSafeClient();
  return cached;
}

export function createLiveTransport(pricing?: Record<string, ModelPrice>): Transport {
  return {
    name: 'live',
    async resolve(
      decisions: readonly Decision[],
      base: BaseState,
      context: TransportContext,
    ): Promise<ResolveOutcome> {
      const sent = buildPayload(decisions, base);
      const startedAt = Date.now();
      // The SDK's question types mirror this wire shape; raw objects are what the API takes.
      const result = (await client().systemOne({
        state: sent.state as never,
        questions: sent.questions as never,
        model: context.model,
      })) as unknown as { answers: Record<string, unknown>; model?: string; usage?: unknown };

      const answers: Record<string, Answer> = {};
      for (const decision of decisions) {
        const raw = result.answers?.[decision.id];
        if (raw === undefined) throw new Error(`jev-ui: API returned no answer for "${decision.id}"`);
        answers[decision.id] = normalizeAnswer(raw);
      }

      const usage = readUsage(result.usage);
      const model = result.model ?? context.model;

      return {
        answers,
        meta: {
          transport: 'live',
          requests: 1,
          decisions: decisions.length,
          model,
          ...(usage === undefined ? {} : { usage }),
          ...(costOf(usage, model, pricing) === undefined
            ? {}
            : { costUsd: costOf(usage, model, pricing) }),
          ms: Date.now() - startedAt,
        },
        sent,
      };
    },
  };
}
