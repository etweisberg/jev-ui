import { describe, expect, it, vi } from 'vitest';
import { costFromMeta, createBatcher } from '../src/core/batch.js';
import type { Answer, Decision, ResolveOutcome } from '../src/core/types.js';

function decision(id: string): Decision {
  return { id, question: { type: 'noul', instructions: `judge ${id}` } };
}

function outcomeFor(decisions: readonly Decision[]): ResolveOutcome {
  const answers: Record<string, Answer> = {};
  for (const item of decisions) answers[item.id] = { type: 'noul', noul: 0.9 };
  return {
    answers,
    meta: {
      transport: 'test',
      requests: 1,
      decisions: decisions.length,
      costUsd: 0.000016,
      usage: { inputTokens: 380 },
      ms: 0,
    },
    sent: { state: {}, questions: {} },
  };
}

describe('batching', () => {
  it('collapses every decision registered in one tick into a single request', async () => {
    const resolve = vi.fn(async (decisions: readonly Decision[]) => outcomeFor(decisions));
    const batcher = createBatcher({ resolve });

    const results = await Promise.all([
      batcher.ask(decision('a')),
      batcher.ask(decision('b')),
      batcher.ask(decision('c')),
    ]);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve.mock.calls[0]?.[0].map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(results).toHaveLength(3);
    expect(batcher.last()?.meta.decisions).toBe(3);
  });

  it('does not batch across an await — siblings batch, waterfalls do not', async () => {
    const resolve = vi.fn(async (decisions: readonly Decision[]) => outcomeFor(decisions));
    const batcher = createBatcher({ resolve });

    await batcher.ask(decision('first'));
    await batcher.ask(decision('second'));

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('routes each answer back to the decision that asked for it', async () => {
    const batcher = createBatcher({
      resolve: async () => ({
        answers: {
          a: { type: 'noul', noul: 0.1 },
          b: { type: 'noul', noul: 0.8 },
        },
        meta: { transport: 'test', requests: 1, decisions: 2, ms: 0 },
        sent: { state: {}, questions: {} },
      }),
    });
    const [a, b] = await Promise.all([batcher.ask(decision('a')), batcher.ask(decision('b'))]);
    expect(a?.answer).toEqual({ type: 'noul', noul: 0.1 });
    expect(b?.answer).toEqual({ type: 'noul', noul: 0.8 });
  });

  it('rejects a decision the response left out instead of returning undefined', async () => {
    const batcher = createBatcher({
      resolve: async () => ({
        answers: {},
        meta: { transport: 'test', requests: 1, decisions: 1, ms: 0 },
        sent: { state: {}, questions: {} },
      }),
    });
    await expect(batcher.ask(decision('ghost'))).rejects.toThrow(/no answer returned/);
  });

  it('fails every waiter in a batch when the request fails', async () => {
    const batcher = createBatcher({
      resolve: async () => {
        throw new Error('network down');
      },
    });
    const results = await Promise.allSettled([batcher.ask(decision('a')), batcher.ask(decision('b'))]);
    expect(results.every((entry) => entry.status === 'rejected')).toBe(true);
  });

  it('reports the outcome once per flush for the Inspector', async () => {
    const seen: number[] = [];
    const batcher = createBatcher({
      resolve: async (decisions) => outcomeFor(decisions),
      onOutcome: (outcome) => seen.push(outcome.meta.decisions),
    });
    await Promise.all([batcher.ask(decision('a')), batcher.ask(decision('b'))]);
    expect(seen).toEqual([2]);
  });

  it('supports a manual scheduler so a caller can flush an explicit pass', async () => {
    const resolve = vi.fn(async (decisions: readonly Decision[]) => outcomeFor(decisions));
    const batcher = createBatcher({ resolve, schedule: () => {} });

    const pending = Promise.all([batcher.ask(decision('a')), batcher.ask(decision('b'))]);
    expect(resolve).not.toHaveBeenCalled();
    expect(batcher.pendingCount()).toBe(2);

    await batcher.flush();
    await pending;
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});

describe('cost attribution', () => {
  it('hands every decision the cost of the request it travelled in', async () => {
    const batcher = createBatcher({ resolve: async (decisions) => outcomeFor(decisions) });
    const [first, second] = await Promise.all([
      batcher.ask(decision('a')),
      batcher.ask(decision('b')),
    ]);
    // One request, one cost — both decisions see the same total.
    expect(first?.meta.costUsd).toBe(0.000016);
    expect(second?.meta.costUsd).toBe(0.000016);
    expect(first?.meta.decisions).toBe(2);
  });

  it('splits the request cost into a per-decision share', () => {
    const cost = costFromMeta({
      transport: 'live',
      requests: 1,
      decisions: 4,
      costUsd: 0.00002,
      usage: { inputTokens: 400 },
      ms: 12,
    });
    expect(cost?.batchUsd).toBe(0.00002);
    expect(cost?.shareUsd).toBe(0.000005);
    expect(cost?.inputTokens).toBe(400);
    expect(cost?.estimated).toBe(false);
  });

  it('reports no cost rather than a wrong one when usage is unknown', () => {
    const cost = costFromMeta({ transport: 'replay', requests: 0, decisions: 3, ms: 0 });
    expect(cost?.batchUsd).toBeUndefined();
    expect(cost?.shareUsd).toBeUndefined();
    expect(cost?.decisions).toBe(3);
  });

  it('never divides by zero on an empty batch', () => {
    const cost = costFromMeta({
      transport: 'live',
      requests: 1,
      decisions: 0,
      costUsd: 0.00001,
      ms: 0,
    });
    expect(cost?.shareUsd).toBe(0.00001);
  });

  it('marks replayed figures as estimated', () => {
    const cost = costFromMeta({
      transport: 'replay',
      requests: 0,
      decisions: 2,
      costUsd: 0.00001,
      estimated: true,
      ms: 0,
    });
    expect(cost?.estimated).toBe(true);
  });
});
