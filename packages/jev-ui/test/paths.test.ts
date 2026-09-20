import { describe, expect, it } from 'vitest';
import { channelsIn, extractPaths, namespaceDataPaths, rootOf, unknownRoots } from '../src/core/paths.js';

describe('path extraction', () => {
  it('reads backticked paths and ignores ordinary prose', () => {
    expect(extractPaths('Which view answers `data.question` given `recent_actions`?')).toEqual([
      'data.question',
      'recent_actions',
    ]);
    expect(extractPaths('no paths here at all')).toEqual([]);
  });

  it('handles array indexes and nesting', () => {
    expect(extractPaths('judge `data.messages[0].text`')).toEqual(['data.messages[0].text']);
    expect(rootOf('data.messages[0].text')).toBe('data');
  });

  it('deduplicates repeated references', () => {
    expect(extractPaths('`recent_actions` then `recent_actions` again')).toEqual(['recent_actions']);
  });
});

describe('channel scoping', () => {
  it('returns only channels the ask actually names', () => {
    expect(channelsIn('order by fit to `recent_actions` and `time_spent`')).toEqual([
      'recent_actions',
      'time_spent',
    ]);
  });

  it('does not treat data as a channel', () => {
    expect(channelsIn('rank `data.item`')).toEqual([]);
  });

  it('returns channels in declaration order, not mention order', () => {
    expect(channelsIn('`time_spent` then `app`')).toEqual(['app', 'time_spent']);
  });

  it('flags roots that are neither channels nor data', () => {
    expect(unknownRoots('check `tickets[0].text` and `recent_actions`')).toEqual(['tickets']);
    expect(unknownRoots('check `data.x` and `recent_actions`')).toEqual([]);
  });
});

describe('data namespacing', () => {
  it('rewrites data paths for the batched state and leaves channels alone', () => {
    expect(namespaceDataPaths('answer `data.question` using `recent_actions`', 'chart')).toBe(
      'answer `data.chart.question` using `recent_actions`',
    );
  });

  it('rewrites a bare data reference', () => {
    expect(namespaceDataPaths('judge `data`', 'feed_1')).toBe('judge `data.feed_1`');
  });

  it('rewrites an indexed data reference', () => {
    expect(namespaceDataPaths('judge `data[0]`', 'x')).toBe('judge `data.x[0]`');
  });
});
