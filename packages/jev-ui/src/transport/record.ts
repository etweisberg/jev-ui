import { isolatePayload } from '../core/payload.js';
import type { ModelPrice } from '../core/pricing.js';
import type { BaseState, Decision, ResolveOutcome } from '../core/types.js';
import { createFixtureStore, fixtureKey } from './fixtures.js';
import { createLiveTransport } from './live.js';
import type { Transport, TransportContext } from './types.js';

/** Live, then persist one fixture per decision so replay can serve it offline. */
export function createRecordTransport(
  dir: string,
  pricing?: Record<string, ModelPrice>,
): Transport {
  const store = createFixtureStore(dir);
  const live = createLiveTransport(pricing);
  return {
    name: 'record',
    async resolve(
      decisions: readonly Decision[],
      base: BaseState,
      context: TransportContext,
    ): Promise<ResolveOutcome> {
      const outcome = await live.resolve(decisions, base, context);
      const { usage, costUsd } = outcome.meta;

      for (const decision of decisions) {
        const answer = outcome.answers[decision.id];
        if (!answer) continue;
        store.write({
          key: fixtureKey(decision, base, context.model),
          model: outcome.meta.model ?? context.model,
          recordedAt: new Date().toISOString(),
          sent: isolatePayload(decision, base),
          answer,
          // Recorded so replay can report what this judgment cost when it was real.
          batch: {
            ...(usage?.inputTokens === undefined ? {} : { inputTokens: usage.inputTokens }),
            ...(usage?.outputTokens === undefined ? {} : { outputTokens: usage.outputTokens }),
            ...(costUsd === undefined ? {} : { costUsd }),
            decisions: decisions.length,
          },
        });
      }
      return { ...outcome, meta: { ...outcome.meta, transport: 'record' } };
    },
  };
}
