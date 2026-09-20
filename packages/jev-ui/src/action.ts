'use server';

import { createResolver, resolverOptionsFromEnv } from './server.js';
import type { BaseState, Decision, ResolveOutcome } from './core/types.js';

/**
 * A ready-made Server Action, so the common setup needs no code of your own.
 *
 *   import { askJev } from 'jev-ui/action';
 *   <JevProvider resolve={askJev}>
 *
 * It reads its configuration from the environment: TYPESAFE_API_KEY, and optionally
 * JEV_TRANSPORT, JEV_MODEL and JEV_FIXTURES_DIR. Write your own with `createResolver`
 * when you need something the environment cannot express — a custom transport, per-request
 * model selection, or your own pricing table.
 *
 * The key stays here. The client passes decisions and data and never names a model or a
 * transport, so this cannot be turned into a general proxy to your key.
 */
const resolve = createResolver(resolverOptionsFromEnv());

export async function askJev(
  decisions: Decision[],
  state: BaseState,
): Promise<ResolveOutcome> {
  return resolve(decisions, state);
}
