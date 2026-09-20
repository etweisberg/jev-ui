import { describe, expect, it } from 'vitest';
import { bucketFamiliarity, bucketProgress, bucketTimeSpent, capRecent } from '../src/core/state.js';

describe('projection to words', () => {
  it('bands time spent at its boundaries', () => {
    expect(bucketTimeSpent(0)).toBe('very short');
    expect(bucketTimeSpent(1_999)).toBe('very short');
    expect(bucketTimeSpent(2_000)).toBe('short');
    expect(bucketTimeSpent(9_999)).toBe('short');
    expect(bucketTimeSpent(10_000)).toBe('medium');
    expect(bucketTimeSpent(29_999)).toBe('medium');
    expect(bucketTimeSpent(30_000)).toBe('long');
    expect(bucketTimeSpent(119_999)).toBe('long');
    expect(bucketTimeSpent(120_000)).toBe('very long');
  });

  it('bands visit counts', () => {
    expect(bucketFamiliarity(0)).toBe('first visit');
    expect(bucketFamiliarity(1)).toBe('first visit');
    expect(bucketFamiliarity(2)).toBe('returning');
    expect(bucketFamiliarity(4)).toBe('returning');
    expect(bucketFamiliarity(5)).toBe('returns often');
  });

  it('bands scroll progress', () => {
    expect(bucketProgress(0)).toBe('just started');
    expect(bucketProgress(0.34)).toBe('partway through');
    expect(bucketProgress(0.79)).toBe('partway through');
    expect(bucketProgress(0.8)).toBe('near the end');
  });

  it('survives junk input rather than emitting NaN into the state', () => {
    expect(bucketTimeSpent(Number.NaN)).toBe('very short');
    expect(bucketProgress(Number.POSITIVE_INFINITY)).toBe('near the end');
  });

  it('keeps only the most recent labels, oldest first', () => {
    expect(capRecent(['a', 'b', 'c', 'd'], 2)).toEqual(['c', 'd']);
    expect(capRecent(['a'], 5)).toEqual(['a']);
  });
});
