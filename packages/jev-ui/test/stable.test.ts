import { describe, expect, it } from 'vitest';
import { stableStringify } from '../src/core/stable.js';

/**
 * This is what decides whether an incoming `state` prop counts as changed. Getting it
 * wrong in either direction is bad: too eager and every render re-resolves every
 * judgment; too lazy and a real update is ignored.
 */
describe('value comparison for the state prop', () => {
  it('treats a re-created object with the same contents as unchanged', () => {
    const render = () => ({ app: { user: { id: 'u1', name: 'Ana' } }, time_spent: 'short' });
    expect(stableStringify(render())).toBe(stableStringify(render()));
  });

  it('ignores key order, which a store may not preserve', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it('notices a nested change', () => {
    const before = { app: { user: { id: 'u1', plan: 'team' } } };
    const after = { app: { user: { id: 'u1', plan: 'enterprise' } } };
    expect(stableStringify(before)).not.toBe(stableStringify(after));
  });

  it('respects array order, so a reordered action log counts as a change', () => {
    expect(stableStringify({ recent_actions: ['a', 'b'] })).not.toBe(
      stableStringify({ recent_actions: ['b', 'a'] }),
    );
  });

  it('distinguishes absent from undefined-valued, but not from omitted', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 1, b: null }));
  });

  it('handles the empty and null cases a provider actually passes', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify({})).toBe('{}');
  });
});
