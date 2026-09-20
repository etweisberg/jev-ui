import { describe, expect, it } from 'vitest';
import {
  NO_MATCH,
  describeScore,
  dropBelow,
  orderCompete,
  orderGrade,
  pinTop,
  resolveBranch,
  resolveGate,
  takeTop,
} from '../src/core/policy.js';
import type { Answer } from '../src/core/types.js';

const keys = ['chart', 'table'];

function choice(choiceKey: string, confidence: number, probabilities: Record<string, number>): Answer {
  return { type: 'choice', choice: choiceKey, probabilities, confidence };
}

describe('resolveBranch', () => {
  it('selects a confident winner', () => {
    const verdict = resolveBranch(choice('chart', 0.9, { chart: 0.9, table: 0.1 }), keys, 0.6);
    expect(verdict).toMatchObject({ key: 'chart', reason: 'selected' });
  });

  it('falls back below the confidence floor rather than acting on a guess', () => {
    const verdict = resolveBranch(choice('chart', 0.4, { chart: 0.45, table: 0.4 }), keys, 0.6);
    expect(verdict).toMatchObject({ key: null, reason: 'low-confidence' });
    expect(verdict.confidence).toBe(0.4);
  });

  it('honours an explicit no-match even at high confidence', () => {
    const verdict = resolveBranch(choice(NO_MATCH, 0.95, { [NO_MATCH]: 0.95 }), keys, 0.6);
    expect(verdict).toMatchObject({ key: null, reason: 'no-match' });
  });

  it('refuses an option that is not on offer', () => {
    const verdict = resolveBranch(choice('pie', 0.99, { pie: 0.99 }), keys, 0);
    expect(verdict).toMatchObject({ key: null, reason: 'unknown-option' });
  });

  it('refuses a mistyped answer', () => {
    expect(resolveBranch({ type: 'noul', noul: 0.9 }, keys, 0)).toMatchObject({
      key: null,
      reason: 'unknown-option',
    });
  });

  it('acts with no floor when none is configured', () => {
    expect(resolveBranch(choice('table', 0.01, { table: 0.01 }), keys, 0).key).toBe('table');
  });
});

interface Item {
  id: string;
  label: string;
}
const items: Item[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
];
const idOf = (item: Item) => item.id;

describe('orderCompete', () => {
  it('orders by probability mass, highest first', () => {
    const ordered = orderCompete(choice('b', 0.6, { a: 0.2, b: 0.6, c: 0.2 }), items, idOf);
    expect(ordered.map((entry) => entry.id)).toEqual(['b', 'a', 'c']);
    expect(ordered[0]?.score).toBe(0.6);
  });

  it('keeps every candidate — compete mode never drops one', () => {
    const ordered = orderCompete(choice('a', 1, { a: 1 }), items, idOf);
    expect(ordered).toHaveLength(3);
    expect(ordered.at(-1)?.score).toBe(0);
  });
});

function score(value: number): Answer {
  return { type: 'score', score: value, probabilities: {}, confidence: 0.8 };
}

describe('orderGrade', () => {
  it('normalizes each score onto 0–1 so items compare across requests', () => {
    const ordered = orderGrade({ a: score(3), b: score(0), c: score(1.5) }, items, idOf, 4);
    expect(ordered.map((entry) => entry.id)).toEqual(['a', 'c', 'b']);
    expect(ordered[0]?.score).toBe(1);
    expect(ordered[1]?.score).toBe(0.5);
  });

  it('treats a missing answer as the bottom of the range', () => {
    const ordered = orderGrade({ a: score(2) }, items, idOf, 4);
    expect(ordered[0]?.id).toBe('a');
    expect(ordered.slice(1).every((entry) => entry.score === 0)).toBe(true);
  });
});

describe('shaping the ordered list', () => {
  it('pins the leading items in their original positions', () => {
    const ordered = orderCompete(choice('c', 0.8, { a: 0.1, b: 0.1, c: 0.8 }), items, idOf);
    const pinned = pinTop(ordered, items, 1, idOf);
    expect(pinned.map((entry) => entry.id)).toEqual(['a', 'c', 'b']);
    expect(pinned[0]?.pinned).toBe(true);
  });

  it('never duplicates a pinned item', () => {
    const ordered = orderCompete(choice('a', 0.9, { a: 0.9, b: 0.05, c: 0.05 }), items, idOf);
    const pinned = pinTop(ordered, items, 2, idOf);
    expect(pinned.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op when nothing is pinned', () => {
    const ordered = orderCompete(choice('c', 0.8, { a: 0.1, b: 0.1, c: 0.8 }), items, idOf);
    expect(pinTop(ordered, items, 0, idOf).map((entry) => entry.id)).toEqual(['c', 'a', 'b']);
  });

  it('truncates to take, and returns everything when take is absent', () => {
    const ordered = orderCompete(choice('b', 0.6, { a: 0.3, b: 0.6, c: 0.1 }), items, idOf);
    expect(takeTop(ordered, 2).map((entry) => entry.id)).toEqual(['b', 'a']);
    expect(takeTop(ordered)).toHaveLength(3);
  });

  it('drops low scorers but keeps pinned ones', () => {
    const ordered = orderGrade({ a: score(0), b: score(3), c: score(3) }, items, idOf, 4);
    const pinned = pinTop(ordered, items, 1, idOf);
    const filtered = dropBelow(pinned, 0.5);
    expect(filtered.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(dropBelow(ordered, 0.5).map((entry) => entry.id)).toEqual(['b', 'c']);
  });
});

describe('resolveGate', () => {
  it('opens at or above the threshold', () => {
    expect(resolveGate({ type: 'noul', noul: 0.7 }, 0.7)).toEqual({ open: true, probability: 0.7 });
    expect(resolveGate({ type: 'noul', noul: 0.69 }, 0.7).open).toBe(false);
  });

  it('stays shut for a non-noul answer', () => {
    expect(resolveGate(score(3), 0.5).open).toBe(false);
  });
});

describe('describeScore', () => {
  const levels = ['none', 'some', 'lots'];

  it('maps a position onto its nearest level label', () => {
    expect(describeScore(score(0), levels).level).toBe('none');
    expect(describeScore(score(1.4), levels).level).toBe('some');
    expect(describeScore(score(2), levels).level).toBe('lots');
  });

  it('normalizes onto 0–1 for driving a prop', () => {
    expect(describeScore(score(1), levels).normalized).toBe(0.5);
  });

  it('clamps rather than indexing past the levels', () => {
    expect(describeScore(score(99), levels).level).toBe('lots');
  });
});
