import { describe, expect, it } from 'vitest';
import { fingerprint, stableStringify } from '../src/core/hash.js';

describe('fingerprinting', () => {
  it('ignores key order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(fingerprint({ b: 1, a: 2 })).toBe(fingerprint({ a: 2, b: 1 }));
  });

  it('respects array order', () => {
    expect(fingerprint([1, 2])).not.toBe(fingerprint([2, 1]));
  });

  it('distinguishes different values', () => {
    expect(fingerprint({ ask: 'a' })).not.toBe(fingerprint({ ask: 'b' }));
  });

  it('drops undefined so an omitted option matches an absent one', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });

  it('is stable across calls', () => {
    const value = { state: { recent: ['x'] }, question: { type: 'noul' } };
    expect(fingerprint(value)).toBe(fingerprint(value));
  });
});
