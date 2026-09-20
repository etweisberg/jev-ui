/**
 * Records one fixture per judgment by driving the real demo pages.
 *
 * Nothing here rebuilds the questions the components ask — it runs the components
 * themselves with the recording transport, so a fixture cannot disagree with the code
 * that will later replay it. The walks come from the same module the tests use.
 */
import { spawn } from 'node:child_process';
import { readdirSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { DEMO_NAMES, WALKS } from '../../../e2e/walks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = resolve(here, '..');
const fixturesDir = resolve(demoRoot, 'fixtures');
const ORIGIN = 'http://localhost:3111';

if (!process.env.TYPESAFE_API_KEY) {
  console.error('Recording needs TYPESAFE_API_KEY. Run it through the demo app env file:');
  console.error('  bun run --filter demo record');
  process.exit(1);
}

function countFixtures() {
  mkdirSync(fixturesDir, { recursive: true });
  return readdirSync(fixturesDir).filter((name) => name.endsWith('.json')).length;
}

async function waitForServer(timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(ORIGIN);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error('demo server did not start');
}

const server = spawn('bun', ['run', 'next', 'dev', '--port', '3111'], {
  cwd: demoRoot,
  env: { ...process.env, JEV_TRANSPORT: 'record' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => process.stdout.write(`[next] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`));

let browser;
let failed = false;
try {
  await waitForServer();
  const before = countFixtures();
  console.log(`\nrecording against ${ORIGIN} (transport=record), ${before} fixtures present\n`);

  browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: ORIGIN });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error(`  ! page error: ${error.message}`));

  const only = process.argv.slice(2);
  const names = only.length > 0 ? only : DEMO_NAMES;

  for (const name of names) {
    const walk = WALKS[name];
    if (!walk) throw new Error(`no walk defined for "${name}"`);
    const start = countFixtures();
    process.stdout.write(`  ${name} … `);
    await walk(page);
    console.log(`+${countFixtures() - start} fixtures`);
  }

  console.log(`\ndone: ${countFixtures()} fixtures in ${fixturesDir}`);
} catch (error) {
  failed = true;
  console.error(`\nrecording failed: ${error?.message ?? error}`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
process.exit(failed ? 1 : 0);
