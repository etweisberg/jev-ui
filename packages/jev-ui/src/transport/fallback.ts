import type { BaseState, Decision, ResolveOutcome } from '../core/types.js';
import type { Transport, TransportContext } from './types.js';

/**
 * Try one transport, fall back to another when it fails.
 *
 * Built for a deployed demo or documentation site: call the real API so what people see
 * is real, but serve recorded answers rather than a 500 when the key is missing, the
 * quota is spent, or the API is down. The outcome reports which transport actually
 * answered, so a fallback is visible rather than silent.
 */
export function createFallbackTransport(
  primary: Transport,
  backup: Transport,
  onFallback?: (error: Error) => void,
): Transport {
  return {
    name: `${primary.name}-or-${backup.name}`,
    async resolve(
      decisions: readonly Decision[],
      state: BaseState,
      context: TransportContext,
    ): Promise<ResolveOutcome> {
      try {
        return await primary.resolve(decisions, state, context);
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        onFallback?.(failure);
        const outcome = await backup.resolve(decisions, state, context);
        return {
          ...outcome,
          meta: { ...outcome.meta, transport: `${backup.name} (${primary.name} failed)` },
        };
      }
    },
  };
}
