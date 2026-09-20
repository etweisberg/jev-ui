import { describe, expect, it } from 'vitest';
import { auditDecision, buildPayload, isolatePayload } from '../src/core/payload.js';
import type { BaseState, Decision } from '../src/core/types.js';

const base: BaseState = {
  app: { role: 'admin', tier: 'enterprise' },
  recent_actions: ['opened Q3 revenue', 'filtered to EMEA'],
  time_spent: 'long',
};

const chart: Decision = {
  id: 'chart',
  question: {
    type: 'choice',
    instructions: 'Which view answers `data.question` given `recent_actions`?',
    criteria: { chart: 'comparing a measure over time', table: 'exact per-row values' },
  },
  data: { question: 'how did EMEA trend?' },
};

const hint: Decision = {
  id: 'hint',
  question: { type: 'noul', instructions: 'Does `time_spent` suggest the user is stuck?' },
};

describe('buildPayload', () => {
  it('sends every channel the provider holds, by default', () => {
    // The ambient state is a handful of banded words. Withholding it until an ask names
    // it by path would make a UI library that collects context and then ignores it.
    const { state } = buildPayload([chart], base);
    expect(Object.keys(state).sort()).toEqual(['app', 'data', 'recent_actions', 'time_spent']);
  });

  it('sends only the picked channels when a decision narrows', () => {
    const narrowed: Decision = { ...chart, pick: ['recent_actions'] };
    const { state } = buildPayload([narrowed], base);
    expect(Object.keys(state).sort()).toEqual(['data', 'recent_actions']);
    expect(state).not.toHaveProperty('app');
  });

  it('omits a channel the provider never set, picked or not', () => {
    const { state } = buildPayload([chart], { recent_actions: ['x'] });
    expect(Object.keys(state).sort()).toEqual(['data', 'recent_actions']);
  });

  it('lets two decisions in one request receive different channels', () => {
    const narrowed: Decision = { ...chart, pick: ['recent_actions'] };
    const wide: Decision = { ...hint, id: 'hint' };
    const { state } = buildPayload([narrowed, wide], base);
    // The union travels; each question is still told which paths to read.
    expect(Object.keys(state).sort()).toEqual(['app', 'data', 'recent_actions', 'time_spent']);
  });

  it('namespaces each decision data under its id and rewrites the paths to match', () => {
    const { state, questions } = buildPayload([chart], base);
    expect(state.data).toEqual({ chart: { question: 'how did EMEA trend?' } });
    expect(questions.chart?.instructions).toBe(
      'Which view answers `data.chart.question` given `recent_actions`?',
    );
  });

  it('merges several decisions into one request without collisions', () => {
    const { state, questions } = buildPayload([chart, hint], base);
    expect(Object.keys(questions).sort()).toEqual(['chart', 'hint']);
    expect(state.data).toEqual({ chart: { question: 'how did EMEA trend?' } });
  });

  it('omits data entirely when no decision supplies any', () => {
    const { state } = buildPayload([hint], base);
    expect(state).not.toHaveProperty('data');
  });

  it('keeps the payload stable when a pick is reordered', () => {
    const a: Decision = { ...chart, pick: ['recent_actions', 'time_spent'] };
    const b: Decision = { ...chart, pick: ['time_spent', 'recent_actions'] };
    expect(Object.keys(buildPayload([a], base).state).sort()).toEqual(
      Object.keys(buildPayload([b], base).state).sort(),
    );
  });

  it('leaves the caller question objects untouched', () => {
    buildPayload([chart], base);
    expect(chart.question.instructions).toBe('Which view answers `data.question` given `recent_actions`?');
  });
});

describe('isolatePayload', () => {
  it('is independent of batch composition, so fixtures survive page edits', () => {
    const alone = isolatePayload(chart, base);
    const together = isolatePayload(chart, base);
    expect(alone).toEqual(together);
    expect(alone.state.data).toEqual({ question: 'how did EMEA trend?' });
    expect(alone.questions.chart?.instructions).toBe(
      'Which view answers `data.question` given `recent_actions`?',
    );
  });
});

describe('auditDecision', () => {
  it('passes a well-formed decision', () => {
    expect(auditDecision(chart, base)).toEqual([]);
  });

  it('catches a channel the state does not provide', () => {
    expect(auditDecision(hint, { app: {} })).toEqual([
      'ask references `time_spent` but no time_spent state was provided',
    ]);
  });

  it('catches an ask that reads a channel its own pick excludes', () => {
    const narrowed: Decision = { ...hint, pick: ['recent_actions'] };
    expect(auditDecision(narrowed, base)).toEqual(['ask references `time_spent` but pick excludes it']);
  });

  it('catches a typo that is neither a channel nor data', () => {
    const typo: Decision = {
      id: 'typo',
      question: { type: 'noul', instructions: 'is `recnt` interesting?' },
    };
    expect(auditDecision(typo, base)).toEqual([
      'ask references `recnt` but that is not a state channel or `data`',
    ]);
  });

  it('catches an ask that references data with no data supplied', () => {
    const missing: Decision = {
      id: 'missing',
      question: { type: 'noul', instructions: 'judge `data.item`' },
    };
    expect(auditDecision(missing, base)).toContain('ask references `data` but no data prop was provided');
  });
});
