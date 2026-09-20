import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRICING,
  FALLBACK_PRICE,
  costOf,
  formatCost,
  formatPerThousand,
  priceFor,
} from '../src/core/pricing.js';

describe('pricing', () => {
  it('prices a real request off the published rate', () => {
    // 380 input tokens at $0.042 per million.
    expect(costOf({ inputTokens: 380 }, 'jev-1.13.0')).toBeCloseTo(0.00001596, 10);
  });

  it('charges nothing for output tokens', () => {
    const withOutput = costOf({ inputTokens: 380, outputTokens: 41 }, 'jev-1.13.0');
    const withoutOutput = costOf({ inputTokens: 380 }, 'jev-1.13.0');
    expect(withOutput).toBe(withoutOutput);
  });

  it('falls back to a default rate for an unknown model rather than reporting zero', () => {
    expect(priceFor('jev-2.0.0')).toEqual(FALLBACK_PRICE);
    expect(costOf({ inputTokens: 1_000_000 }, 'jev-2.0.0')).toBeCloseTo(0.042, 10);
  });

  it('accepts an override table', () => {
    const pricing = { 'jev-1.13.0': { inputPerMtokUsd: 1 } };
    expect(costOf({ inputTokens: 1_000_000 }, 'jev-1.13.0', pricing)).toBe(1);
  });

  it('returns undefined when token counts are unknown, instead of guessing', () => {
    expect(costOf(undefined, 'jev-1.13.0')).toBeUndefined();
    expect(costOf({}, 'jev-1.13.0')).toBeUndefined();
  });

  it('knows the shipping model', () => {
    expect(DEFAULT_PRICING['jev-1.13.0']?.inputPerMtokUsd).toBe(0.042);
  });
});

describe('formatting', () => {
  it('does not round a sub-cent cost away to $0.00', () => {
    expect(formatCost(0.00001596)).toBe('$0.000016');
    expect(formatCost(undefined)).toBe('—');
    expect(formatCost(0)).toBe('$0');
  });

  it('uses ordinary money formatting once a cost is worth reading in cents', () => {
    expect(formatCost(1.5)).toBe('$1.5000');
  });

  it('never prints a bare decimal point for a cost below its own precision', () => {
    expect(formatCost(1e-9)).toBe('<$0.0000001');
    expect(formatCost(1e-7)).toBe('$0.0000001');
  });

  it('gives the per-thousand rate, which is the number people can reason about', () => {
    expect(formatPerThousand(0.000016)).toBe('$0.02 / 1k');
  });
});
