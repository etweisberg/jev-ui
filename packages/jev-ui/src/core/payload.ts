import { extractPaths, namespaceDataPaths, rootOf, unknownRoots } from './paths.js';
import { CHANNELS, type BaseState, type Channel, type Decision, type Json, type Question, type SentPayload } from './types.js';

/** Which channels a decision receives: all of them, unless it narrows with `pick`. */
export function channelsFor(decision: Decision): readonly Channel[] {
  return decision.pick ?? CHANNELS;
}

/**
 * Turn N decisions into one request.
 *
 * Each decision's `data` is namespaced under its id so several decisions can share one
 * state, and its ask's `data.*` paths are rewritten to match. Every channel the provider
 * holds travels with the request; a decision that wants less says so with `pick`.
 */
export function buildPayload(decisions: readonly Decision[], base: BaseState): SentPayload {
  const state: Record<string, Json> = {};
  const data: Record<string, Json> = {};
  const questions: Record<string, Question> = {};

  for (const decision of decisions) {
    const ask = decision.question.instructions;

    for (const channel of channelsFor(decision)) {
      const value = base[channel];
      if (value !== undefined) state[channel] = value as Json;
    }

    if (decision.data !== undefined) data[decision.id] = decision.data;

    questions[decision.id] = {
      ...decision.question,
      instructions: namespaceDataPaths(ask, decision.id),
    } as Question;
  }

  if (Object.keys(data).length > 0) state.data = data;
  return { state, questions };
}

/**
 * The state one decision sees on its own, ignoring batch composition. Fixture keys
 * are built from this so recording stays stable when other decisions come and go.
 */
export function isolatePayload(decision: Decision, base: BaseState): SentPayload {
  const state: Record<string, Json> = {};
  for (const channel of channelsFor(decision)) {
    const value = base[channel];
    if (value !== undefined) state[channel] = value as Json;
  }
  if (decision.data !== undefined) state.data = decision.data;
  return { state, questions: { [decision.id]: decision.question } };
}

/** Dev-time check: an ask naming a path nothing provides is a bug, not a nuance. */
export function auditDecision(decision: Decision, base: BaseState): string[] {
  const ask = decision.question.instructions;
  const problems = unknownRoots(ask).map(
    (root) => `ask references \`${root}\` but that is not a state channel or \`data\``,
  );
  const available = new Set(channelsFor(decision));
  for (const root of new Set(extractPaths(ask).map(rootOf))) {
    if (root === 'data') continue;
    if (!CHANNELS.includes(root as Channel)) continue;
    if (!available.has(root as Channel)) {
      problems.push(`ask references \`${root}\` but pick excludes it`);
    } else if (base[root as Channel] === undefined) {
      problems.push(`ask references \`${root}\` but no ${root} state was provided`);
    }
  }
  if (/`data/.test(ask) && decision.data === undefined) {
    problems.push('ask references `data` but no data prop was provided');
  }
  return problems;
}
