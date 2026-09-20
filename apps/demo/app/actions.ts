'use server';

import { resolve as resolvePath } from 'node:path';
import { createResolver } from 'jev-ui/server';
import type { BaseState, Decision, ResolveOutcome } from 'jev-ui/server';

/**
 * The one place the API key is used. The client calls this with decisions and data;
 * it never names a model or a transport, so it cannot be turned into an open proxy
 * to the key.
 *
 * Transport comes from JEV_TRANSPORT: live in development, record to capture
 * fixtures, replay for the end-to-end tests.
 */
const resolveDecisions = createResolver({
  fixturesDir: resolvePath(process.cwd(), 'fixtures'),
});

export async function askJev(
  decisions: Decision[],
  base: BaseState,
): Promise<ResolveOutcome> {
  return resolveDecisions(decisions, base);
}
