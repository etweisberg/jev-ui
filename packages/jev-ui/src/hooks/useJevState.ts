'use client';

import { useEffect } from 'react';
import { useJev } from '../components/provider.js';
import { bucketTimeSpent } from '../core/state.js';
import type { BaseState, Json } from '../core/types.js';

export interface JevStateHandle {
  /** The state every question on the page is currently resolved against. */
  state: BaseState;
  /** Merge a patch into it. */
  setState(patch: Partial<BaseState>): void;
  /** Set one of your own fields under `app`. */
  setAppField(key: string, value: Json): void;
  /** Append a label to `recent_actions`, capped and oldest-first. */
  track(label: string): void;
  /** Clear the remembered answers — call it when the screen changes. */
  reset(): void;
}

/**
 * Read and update the state the model sees.
 *
 * The state lives in the provider rather than in a store you have to wire up, and every
 * judgment re-resolves when the state it receives changes. That is affordable because
 * what goes in is banded words, not raw telemetry.
 */
export function useJevState(): JevStateHandle {
  const { state, setState, setAppField, track, reset } = useJev();
  return { state, setState, setAppField, track, reset };
}

/** Band boundaries, in milliseconds. Matches bucketTimeSpent. */
const BOUNDARIES = [2_000, 10_000, 30_000, 120_000];

/**
 * Keeps `time_spent` current while someone stays on a screen.
 *
 * It sets timers for the band boundaries rather than polling: the value only has five
 * possible states, so it wakes at most four times and then stops. Anything finer would
 * re-resolve every judgment on a ticking interval for no gain in what the model can tell.
 */
export function useTimeOnScreen(enabled = true): void {
  const { setState } = useJev();

  useEffect(() => {
    if (!enabled) return;
    const startedAt = Date.now();
    setState({ time_spent: bucketTimeSpent(0) });

    const timers = BOUNDARIES.map((ms) =>
      setTimeout(() => setState({ time_spent: bucketTimeSpent(Date.now() - startedAt) }), ms),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [enabled, setState]);
}
