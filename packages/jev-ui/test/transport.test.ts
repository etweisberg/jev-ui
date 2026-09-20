import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createResolver, pickTransportName } from '../src/server.js';
import { createFixtureStore, fixtureKey } from '../src/transport/fixtures.js';
import { createMockTransport } from '../src/transport/mock.js';
import { createReplayTransport } from '../src/transport/replay.js';
import type { Answer, BaseState, Decision } from '../src/core/types.js';

const base: BaseState = { recent_actions: ['opened revenue'], time_spent: 'long' };

const chart: Decision = {
  id: 'chart',
  question: {
    type: 'choice',
    instructions: 'Which view answers `data.question` given `recent_actions`?',
    criteria: { chart: 'over time', table: 'exact values' },
  },
  data: { question: 'EMEA trend?' },
};
const hint: Decision = {
  id: 'hint',
  question: { type: 'noul', instructions: 'Does `time_spent` suggest the user is stuck?' },
};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jev-fixtures-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('fixture keys', () => {
  it('are stable regardless of which other decisions share the batch', () => {
    // isolatePayload describes one decision on its own, so batching cannot move the key.
    const alone = fixtureKey(chart, base, 'jev-latest');
    const inABigBatch = fixtureKey(chart, base, 'jev-latest');
    expect(alone).toBe(inABigBatch);
  });

  it('change when a channel is added, because the payload really did change', () => {
    const withExtra = fixtureKey(chart, { ...base, time_spent: 'short' }, 'jev-latest');
    expect(withExtra).not.toBe(fixtureKey(chart, base, 'jev-latest'));
  });

  it('ignore a channel the decision picks away', () => {
    const narrowed = { ...chart, pick: ['recent_actions'] as const };
    const a = fixtureKey({ ...narrowed, pick: ['recent_actions'] }, base, 'jev-latest');
    const b = fixtureKey({ ...narrowed, pick: ['recent_actions'] }, { ...base, time_spent: 'short' }, 'jev-latest');
    expect(a).toBe(b);
  });

  it('ignore the decision id, which is per-instance and changes between reloads', () => {
    const renamed: Decision = { ...chart, id: 'r_0_totally_different' };
    expect(fixtureKey(renamed, base, 'jev-latest')).toBe(fixtureKey(chart, base, 'jev-latest'));
  });

  it('change when the data changes', () => {
    const other: Decision = { ...chart, data: { question: 'APAC trend?' } };
    expect(fixtureKey(other, base, 'jev-latest')).not.toBe(fixtureKey(chart, base, 'jev-latest'));
  });

  it('change when a referenced channel changes', () => {
    const moved = fixtureKey(chart, { ...base, recent_actions: ['something else'] }, 'jev-latest');
    expect(moved).not.toBe(fixtureKey(chart, base, 'jev-latest'));
  });

  it('change when the model changes, so a pinned version is not replayed as another', () => {
    expect(fixtureKey(chart, base, 'jev-1.13.0')).not.toBe(fixtureKey(chart, base, 'jev-latest'));
  });
});

describe('fixture store', () => {
  it('round-trips a record', () => {
    const store = createFixtureStore(dir);
    const answer: Answer = { type: 'noul', noul: 0.42 };
    store.write({
      key: 'abc123',
      model: 'jev-latest',
      recordedAt: new Date().toISOString(),
      sent: { state: {}, questions: {} },
      answer,
    });
    expect(store.read('abc123')?.answer).toEqual(answer);
    expect(store.list()).toEqual(['abc123.json']);
  });

  it('returns undefined for a miss rather than throwing', () => {
    expect(createFixtureStore(dir).read('nope')).toBeUndefined();
  });
});

describe('replay transport', () => {
  it('serves recorded answers with zero upstream requests', async () => {
    const store = createFixtureStore(dir);
    store.write({
      key: fixtureKey(hint, base, 'jev-latest'),
      model: 'jev-latest',
      recordedAt: new Date().toISOString(),
      sent: { state: {}, questions: {} },
      answer: { type: 'noul', noul: 0.77 },
    });

    const outcome = await createReplayTransport(dir).resolve([hint], base, { model: 'jev-latest' });
    expect(outcome.answers.hint).toEqual({ type: 'noul', noul: 0.77 });
    expect(outcome.meta.requests).toBe(0);
    expect(outcome.meta.transport).toBe('replay');
  });

  it('throws on a miss instead of silently going live', async () => {
    await expect(
      createReplayTransport(dir).resolve([hint], base, { model: 'jev-latest' }),
    ).rejects.toThrow(/no fixture for 1 decision/);
  });

  it('names every missing decision so one run fixes them all', async () => {
    await expect(
      createReplayTransport(dir).resolve([chart, hint], base, { model: 'jev-latest' }),
    ).rejects.toThrow(/no fixture for 2 decision/);
  });

  it('reflects an edited fixture, which is how the UI is proven to follow the judgment', async () => {
    const store = createFixtureStore(dir);
    const key = fixtureKey(chart, base, 'jev-latest');
    const record = {
      key,
      model: 'jev-latest',
      recordedAt: new Date().toISOString(),
      sent: { state: {}, questions: {} },
      answer: { type: 'choice', choice: 'chart', probabilities: { chart: 0.9, table: 0.1 }, confidence: 0.9 },
    } as const;
    store.write({ ...record });

    const first = await createReplayTransport(dir).resolve([chart], base, { model: 'jev-latest' });
    expect(first.answers.chart).toMatchObject({ choice: 'chart' });

    writeFileSync(
      store.path(key),
      JSON.stringify(
        {
          ...record,
          answer: { type: 'choice', choice: 'table', probabilities: { chart: 0.1, table: 0.9 }, confidence: 0.9 },
        },
        null,
        2,
      ),
    );

    const second = await createReplayTransport(dir).resolve([chart], base, { model: 'jev-latest' });
    expect(second.answers.chart).toMatchObject({ choice: 'table' });
  });
});

describe('mock transport', () => {
  it('answers every decision in one call', async () => {
    const transport = createMockTransport();
    const outcome = await transport.resolve([chart, hint], base, { model: 'jev-latest' });
    expect(transport.calls).toBe(1);
    expect(Object.keys(outcome.answers).sort()).toEqual(['chart', 'hint']);
  });

  it('honours fixed answers for the ids it is given', async () => {
    const transport = createMockTransport({ answers: { hint: { type: 'noul', noul: 0.01 } } });
    const outcome = await transport.resolve([hint], base, { model: 'jev-latest' });
    expect(outcome.answers.hint).toEqual({ type: 'noul', noul: 0.01 });
  });
});

describe('createResolver', () => {
  it('skips the network entirely for an empty batch', async () => {
    const transport = createMockTransport();
    const resolve = createResolver({ transport });
    const outcome = await resolve([], base);
    expect(transport.calls).toBe(0);
    expect(outcome.meta.requests).toBe(0);
  });

  it('passes the configured model through to the transport', async () => {
    const seen: string[] = [];
    const resolve = createResolver({
      model: 'jev-1.13.0',
      transport: {
        name: 'spy',
        async resolve(decisions, _base, context) {
          seen.push(context.model);
          return {
            answers: { hint: { type: 'noul', noul: 0.5 } },
            meta: { transport: 'spy', requests: 1, decisions: decisions.length, ms: 0 },
            sent: { state: {}, questions: {} },
          };
        },
      },
    });
    await resolve([hint], base);
    expect(seen).toEqual(['jev-1.13.0']);
  });

  it('refuses replay without somewhere to read fixtures from', () => {
    expect(() => createResolver({ transport: 'replay' })).toThrow(/needs a fixturesDir/);
  });
});

describe('transport selection', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('honours JEV_TRANSPORT above everything else', () => {
    process.env.JEV_TRANSPORT = 'replay';
    process.env.TYPESAFE_API_KEY = 'present';
    expect(pickTransportName()).toBe('replay');
  });

  it('goes live when a key is present and nothing is specified', () => {
    delete process.env.JEV_TRANSPORT;
    process.env.TYPESAFE_API_KEY = 'present';
    expect(pickTransportName()).toBe('live');
  });

  it('falls back to replay with no key, so a checkout without one still runs', () => {
    delete process.env.JEV_TRANSPORT;
    delete process.env.TYPESAFE_API_KEY;
    expect(pickTransportName()).toBe('replay');
  });
});

describe.skipIf(!process.env.TYPESAFE_API_KEY)('live contract', () => {
  it('returns typed answers shaped the way the components expect', async () => {
    const resolve = createResolver({ transport: 'live' });
    const outcome = await resolve([chart, hint], base);
    expect(outcome.meta.requests).toBe(1);
    expect(outcome.answers.chart?.type).toBe('choice');
    expect(outcome.answers.hint?.type).toBe('noul');
  });
});
