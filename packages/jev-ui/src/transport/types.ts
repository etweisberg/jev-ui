import type { BaseState, Decision, ResolveOutcome } from '../core/types.js';

export interface TransportContext {
  model: string;
}

export interface Transport {
  name: string;
  resolve(
    decisions: readonly Decision[],
    base: BaseState,
    context: TransportContext,
  ): Promise<ResolveOutcome>;
}
