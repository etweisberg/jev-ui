import { buildPayload } from '../core/payload.js';
import type { Answer, BaseState, Decision, ResolveOutcome } from '../core/types.js';
import { createFixtureStore, fixtureKey, type FixtureRecord } from './fixtures.js';
import type { Transport, TransportContext } from './types.js';

/**
 * Replayed cost is the sum of each decision's recorded share of the request it was
 * captured in. It is reported as an estimate because this batch's composition may differ
 * from the one that was recorded — the figure answers "what did these judgments cost when
 * they were real", not "what did this call cost", which is zero.
 */
function recordedCost(records: FixtureRecord[]): {
  costUsd?: number;
  usage?: { inputTokens?: number };
} {
  let cost = 0;
  let tokens = 0;
  let sawCost = false;
  let sawTokens = false;

  for (const record of records) {
    const batch = record.batch;
    if (!batch) continue;
    const shared = Math.max(1, batch.decisions);
    if (batch.costUsd !== undefined) {
      cost += batch.costUsd / shared;
      sawCost = true;
    }
    if (batch.inputTokens !== undefined) {
      tokens += batch.inputTokens / shared;
      sawTokens = true;
    }
  }

  return {
    ...(sawCost ? { costUsd: cost } : {}),
    ...(sawTokens ? { usage: { inputTokens: Math.round(tokens) } } : {}),
  };
}

/**
 * Fixtures only — no network, no key. A miss throws rather than falling through to a
 * live call, so a missing fixture is a loud CI failure instead of an accidental charge
 * and a nondeterministic test.
 */
export function createReplayTransport(dir: string): Transport {
  const store = createFixtureStore(dir);
  return {
    name: 'replay',
    async resolve(
      decisions: readonly Decision[],
      base: BaseState,
      context: TransportContext,
    ): Promise<ResolveOutcome> {
      const answers: Record<string, Answer> = {};
      const found: FixtureRecord[] = [];
      const misses: string[] = [];

      for (const decision of decisions) {
        const key = fixtureKey(decision, base, context.model);
        const record = store.read(key);
        if (!record) {
          misses.push(`  ${decision.id} -> ${key}.json`);
          continue;
        }
        answers[decision.id] = record.answer;
        found.push(record);
      }

      if (misses.length > 0) {
        throw new Error(
          `jev-ui: no fixture for ${misses.length} decision(s) in ${dir}\n${misses.join('\n')}\n` +
            'Record them with: bun run --filter demo record',
        );
      }

      const { costUsd, usage } = recordedCost(found);
      return {
        answers,
        meta: {
          transport: 'replay',
          requests: 0,
          decisions: decisions.length,
          model: context.model,
          ...(usage === undefined ? {} : { usage }),
          ...(costUsd === undefined ? {} : { costUsd }),
          estimated: true,
          ms: 0,
        },
        sent: buildPayload(decisions, base),
      };
    },
  };
}
