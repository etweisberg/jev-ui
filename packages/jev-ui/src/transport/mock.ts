import { buildPayload } from '../core/payload.js';
import { NO_MATCH } from '../core/policy.js';
import type { Answer, Decision, Question } from '../core/types.js';
import type { Transport } from './types.js';

/** Deterministic answers with no network and no key — the unit-test transport. */
function synthesize(question: Question): Answer {
  if (question.type === 'choice') {
    const keys = Object.keys(question.criteria).filter((key) => key !== NO_MATCH);
    const winner = keys[0];
    const probabilities: Record<string, number> = {};
    const all = Object.keys(question.criteria);
    for (const key of all) probabilities[key] = key === winner ? 0.7 : 0.3 / Math.max(1, all.length - 1);
    return { type: 'choice', choice: winner ?? NO_MATCH, probabilities, confidence: 0.7 };
  }
  if (question.type === 'score') {
    const middle = (question.criteria.length - 1) / 2;
    const probabilities: Record<string, number> = {};
    question.criteria.forEach((_, index) => {
      probabilities[String(index)] = index === Math.round(middle) ? 0.6 : 0.4 / Math.max(1, question.criteria.length - 1);
    });
    return { type: 'score', score: middle, probabilities, confidence: 0.6 };
  }
  return { type: 'noul', noul: 0.5 };
}

export interface MockOptions {
  /** Fixed answers by decision id; anything missing is synthesized. */
  answers?: Record<string, Answer>;
  onResolve?: (decisions: readonly Decision[]) => void;
}

export function createMockTransport(options: MockOptions = {}): Transport & { calls: number } {
  const transport = {
    name: 'mock',
    calls: 0,
    async resolve(decisions: readonly Decision[], base: Parameters<Transport['resolve']>[1]) {
      transport.calls += 1;
      options.onResolve?.(decisions);
      const answers: Record<string, Answer> = {};
      for (const decision of decisions) {
        answers[decision.id] = options.answers?.[decision.id] ?? synthesize(decision.question);
      }
      return {
        answers,
        meta: { transport: 'mock', requests: 1, decisions: decisions.length, ms: 0 },
        sent: buildPayload(decisions, base),
      };
    },
  };
  return transport;
}
