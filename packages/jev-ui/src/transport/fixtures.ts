import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprint } from '../core/hash.js';
import { isolatePayload } from '../core/payload.js';
import type { Answer, BaseState, Decision } from '../core/types.js';

export interface FixtureRecord {
  key: string;
  model: string;
  recordedAt: string;
  /** Stored so a human reading the file can see exactly what was asked. */
  sent: ReturnType<typeof isolatePayload>;
  answer: Answer;
  /**
   * The request this answer travelled in, so replay can report what the judgment cost
   * when it was real. `decisions` is how many questions shared that request, which is
   * what makes the per-decision share meaningful.
   */
  batch?: {
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    decisions: number;
  };
}

/**
 * Fixtures are keyed per decision, not per batch, so adding or removing a decision
 * elsewhere on the page does not invalidate the ones already recorded.
 */
export function fixtureKey(decision: Decision, base: BaseState, model: string): string {
  const { state } = isolatePayload(decision, base);
  // Deliberately excludes decision.id: ids are per-instance (useId) and would make a
  // fixture unreplayable across reloads. Identity is the question plus what it saw.
  return fingerprint({ model, state, question: decision.question });
}

export interface FixtureStore {
  dir: string;
  path(key: string): string;
  read(key: string): FixtureRecord | undefined;
  write(record: FixtureRecord): void;
  list(): string[];
}

export function createFixtureStore(dir: string): FixtureStore {
  return {
    dir,
    path: (key) => join(dir, `${key}.json`),
    read(key) {
      const file = join(dir, `${key}.json`);
      if (!existsSync(file)) return undefined;
      return JSON.parse(readFileSync(file, 'utf8')) as FixtureRecord;
    },
    write(record) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${record.key}.json`), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    },
    list() {
      if (!existsSync(dir)) return [];
      return readdirSync(dir).filter((name) => name.endsWith('.json'));
    },
  };
}
