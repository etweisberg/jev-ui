/**
 * Server entry point. Everything here runs where the API key lives — a Server Action,
 * a route handler, or a script. Nothing in this module should reach the browser.
 */
export type {
  Answer,
  BaseState,
  ChoiceAnswer,
  Decision,
  Json,
  NoulAnswer,
  Question,
  ResolveFn,
  ResolveMeta,
  ResolveOutcome,
  ScoreAnswer,
  SentPayload,
} from './core/types.js';
export { buildPayload, isolatePayload, auditDecision } from './core/payload.js';
export { fingerprint, stableStringify } from './core/hash.js';
export { createFixtureStore, fixtureKey, type FixtureRecord, type FixtureStore } from './transport/fixtures.js';
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
export { createLiveTransport } from './transport/live.js';
export { createMockTransport } from './transport/mock.js';
export { createRecordTransport } from './transport/record.js';
export { createReplayTransport } from './transport/replay.js';
export type { Transport, TransportContext } from './transport/types.js';

import type { ModelPrice } from './core/pricing.js';
import type { BaseState, Decision, ResolveOutcome } from './core/types.js';
import { createLiveTransport } from './transport/live.js';
import { createMockTransport } from './transport/mock.js';
import { createRecordTransport } from './transport/record.js';
import { createReplayTransport } from './transport/replay.js';
import type { Transport } from './transport/types.js';

export const DEFAULT_MODEL = 'jev-latest';

export type TransportName = 'live' | 'record' | 'replay' | 'mock';

export interface ResolverOptions {
  /** Where fixtures live. Required for replay and record. */
  fixturesDir?: string;
  model?: string;
  /** Defaults to JEV_TRANSPORT, then live when a key is present, else replay. */
  transport?: TransportName | Transport;
  /** Override the published per-model rates used to report cost. */
  pricing?: Record<string, ModelPrice>;
}

export function pickTransportName(): TransportName {
  const fromEnv = process.env.JEV_TRANSPORT as TransportName | undefined;
  if (fromEnv) return fromEnv;
  return process.env.TYPESAFE_API_KEY ? 'live' : 'replay';
}

/**
 * Configuration read from the environment, so the zero-config setup needs no code.
 *
 * JEV_TRANSPORT    live | record | replay | mock
 * JEV_MODEL        model id, default jev-latest
 * JEV_FIXTURES_DIR where record writes and replay reads, default ./fixtures
 */
export function resolverOptionsFromEnv(): ResolverOptions {
  return {
    fixturesDir: process.env.JEV_FIXTURES_DIR ?? 'fixtures',
    model: process.env.JEV_MODEL ?? DEFAULT_MODEL,
  };
}

function buildTransport(
  name: TransportName,
  fixturesDir?: string,
  pricing?: Record<string, ModelPrice>,
): Transport {
  switch (name) {
    case 'live':
      return createLiveTransport(pricing);
    case 'mock':
      return createMockTransport();
    case 'record':
      if (!fixturesDir) throw new Error('jev-ui: record transport needs a fixturesDir');
      return createRecordTransport(fixturesDir, pricing);
    case 'replay':
      if (!fixturesDir) throw new Error('jev-ui: replay transport needs a fixturesDir');
      return createReplayTransport(fixturesDir);
    default:
      throw new Error(`jev-ui: unknown transport "${name}"`);
  }
}

/**
 * Builds the function a Server Action hands to the client. The client never names a
 * transport, a model, or a state channel it was not given — it passes decisions and
 * data, and this side decides how they are answered.
 */
export function createResolver(options: ResolverOptions = {}) {
  const model = options.model ?? DEFAULT_MODEL;
  const requested = options.transport ?? pickTransportName();
  const transport =
    typeof requested === 'string'
      ? buildTransport(requested, options.fixturesDir, options.pricing)
      : requested;

  return async function resolve(
    decisions: readonly Decision[],
    base: BaseState = {},
  ): Promise<ResolveOutcome> {
    if (decisions.length === 0) {
      return {
        answers: {},
        meta: { transport: transport.name, requests: 0, decisions: 0, model, ms: 0 },
        sent: { state: {}, questions: {} },
      };
    }
    return transport.resolve(decisions, base, { model });
  };
}
