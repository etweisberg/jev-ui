import type { Answer, ChoiceAnswer, NoulAnswer, ScoreAnswer } from './types.js';

/** The option a Branch offers when nothing fits. Never rendered; it selects the fallback. */
export const NO_MATCH = '__none__';

export function isChoice(answer: Answer): answer is ChoiceAnswer {
  return answer.type === 'choice';
}
export function isScore(answer: Answer): answer is ScoreAnswer {
  return answer.type === 'score';
}
export function isNoul(answer: Answer): answer is NoulAnswer {
  return answer.type === 'noul';
}

export interface BranchVerdict {
  /** null means "render the fallback": low confidence, or an explicit no-match. */
  key: string | null;
  confidence: number;
  probabilities: Record<string, number>;
  reason: 'selected' | 'low-confidence' | 'no-match' | 'unknown-option';
}

/**
 * Typed output guarantees the interface, not the truth, so a Branch never acts on a
 * verdict the model reports as uncertain — it falls back instead.
 */
export function resolveBranch(
  answer: Answer,
  optionKeys: readonly string[],
  minConfidence = 0,
): BranchVerdict {
  if (!isChoice(answer)) {
    return { key: null, confidence: 0, probabilities: {}, reason: 'unknown-option' };
  }
  const { choice, confidence, probabilities } = answer;
  if (choice === NO_MATCH) return { key: null, confidence, probabilities, reason: 'no-match' };
  if (!optionKeys.includes(choice)) {
    return { key: null, confidence, probabilities, reason: 'unknown-option' };
  }
  if (confidence < minConfidence) {
    return { key: null, confidence, probabilities, reason: 'low-confidence' };
  }
  return { key: choice, confidence, probabilities, reason: 'selected' };
}

export interface Ranked<T> {
  item: T;
  id: string;
  /** Compete mode: probability mass. Grade mode: normalized 0–1 position on the levels. */
  score: number;
  pinned: boolean;
}

/**
 * Compete mode (Choice): probabilities sum to 1, so something always wins even when
 * nothing fits. Right for "which did they mean" — typeahead, a palette.
 */
export function orderCompete<T>(
  answer: Answer,
  items: readonly T[],
  idOf: (item: T) => string,
): Ranked<T>[] {
  const probabilities = isChoice(answer) ? answer.probabilities : {};
  return items
    .map((item) => ({ item, id: idOf(item), score: probabilities[idOf(item)] ?? 0, pinned: false }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Grade mode (one Score per item): comparable across items AND across requests, so a
 * second page of a feed can be ranked against the first. A per-page Choice cannot do
 * that, and the breakage is invisible in a demo.
 */
export function orderGrade<T>(
  answers: Record<string, Answer | undefined>,
  items: readonly T[],
  idOf: (item: T) => string,
  levelCount: number,
): Ranked<T>[] {
  const divisor = Math.max(1, levelCount - 1);
  return items
    .map((item) => {
      const answer = answers[idOf(item)];
      const raw = answer && isScore(answer) ? answer.score : 0;
      return { item, id: idOf(item), score: raw / divisor, pinned: false };
    })
    .sort((a, b) => b.score - a.score);
}

/** Hold the first `count` items in their original positions — muscle memory outranks fit. */
export function pinTop<T>(
  ordered: readonly Ranked<T>[],
  original: readonly T[],
  count: number,
  idOf: (item: T) => string,
): Ranked<T>[] {
  if (count <= 0) return [...ordered];
  const pinnedIds = new Set(original.slice(0, count).map(idOf));
  const byId = new Map(ordered.map((entry) => [entry.id, entry]));
  const head: Ranked<T>[] = [];
  for (const item of original.slice(0, count)) {
    const entry = byId.get(idOf(item));
    if (entry) head.push({ ...entry, pinned: true });
  }
  return [...head, ...ordered.filter((entry) => !pinnedIds.has(entry.id))];
}

export function takeTop<T>(ordered: readonly Ranked<T>[], count?: number): Ranked<T>[] {
  return count === undefined ? [...ordered] : ordered.slice(0, Math.max(0, count));
}

/** Grade mode can drop items nothing matched; compete mode cannot. */
export function dropBelow<T>(ordered: readonly Ranked<T>[], minScore: number): Ranked<T>[] {
  return ordered.filter((entry) => entry.pinned || entry.score >= minScore);
}

/**
 * A Noul near 0.5 means yes and no are equally likely — not "medium intensity".
 * Gate reads it as a probability and nothing else.
 */
export function resolveGate(answer: Answer, threshold = 0.5): { open: boolean; probability: number } {
  const probability = isNoul(answer) ? answer.noul : 0;
  return { open: probability >= threshold, probability };
}

/** A Score's position mapped onto its own level labels, for driving props. */
export function describeScore(
  answer: Answer,
  levels: readonly string[],
): { score: number; normalized: number; level: string; confidence: number } {
  if (!isScore(answer)) return { score: 0, normalized: 0, level: levels[0] ?? '', confidence: 0 };
  const index = Math.min(levels.length - 1, Math.max(0, Math.round(answer.score)));
  return {
    score: answer.score,
    normalized: answer.score / Math.max(1, levels.length - 1),
    level: levels[index] ?? '',
    confidence: answer.confidence,
  };
}
