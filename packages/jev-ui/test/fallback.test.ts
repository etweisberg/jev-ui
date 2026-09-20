import { describe, expect, it, vi } from 'vitest';
import { createFallbackTransport } from '../src/transport/fallback.js';
import { createMockTransport } from '../src/transport/mock.js';
import type { Decision, ResolveOutcome } from '../src/core/types.js';
import type { Transport } from '../src/transport/types.js';

const decision: Decision = {
  id: 'd',
  question: { type: 'noul', instructions: 'is this true?' },
};

const failing = (message: string): Transport => ({
  name: 'live',
  async resolve(): Promise<ResolveOutcome> {
    throw new Error(message);
  },
});

describe('fallback transport', () => {
  it('uses the primary when it works, and never touches the backup', async () => {
    const backup = createMockTransport();
    const primary = createMockTransport({ answers: { d: { type: 'noul', noul: 0.9 } } });
    const transport = createFallbackTransport(primary, backup);

    const outcome = await transport.resolve([decision], {}, { model: 'jev-latest' });
    expect(outcome.answers.d).toEqual({ type: 'noul', noul: 0.9 });
    expect(backup.calls).toBe(0);
  });

  it('serves the backup when the primary fails, rather than throwing', async () => {
    const backup = createMockTransport({ answers: { d: { type: 'noul', noul: 0.1 } } });
    const transport = createFallbackTransport(failing('no key'), backup);

    const outcome = await transport.resolve([decision], {}, { model: 'jev-latest' });
    expect(outcome.answers.d).toEqual({ type: 'noul', noul: 0.1 });
    expect(backup.calls).toBe(1);
  });

  it('says which transport answered, so a fallback is never silent', async () => {
    const transport = createFallbackTransport(failing('quota'), createMockTransport());
    const outcome = await transport.resolve([decision], {}, { model: 'jev-latest' });
    // The Inspector shows this, so a degraded page is visibly degraded.
    expect(outcome.meta.transport).toBe('mock (live failed)');
  });

  it('reports the failure to the caller', async () => {
    const onFallback = vi.fn();
    const transport = createFallbackTransport(failing('boom'), createMockTransport(), onFallback);
    await transport.resolve([decision], {}, { model: 'jev-latest' });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback.mock.calls[0]![0].message).toBe('boom');
  });

  it('propagates when the backup fails too — there is nothing left to try', async () => {
    const transport = createFallbackTransport(failing('primary'), failing('backup'));
    await expect(transport.resolve([decision], {}, { model: 'jev-latest' })).rejects.toThrow('backup');
  });
});
