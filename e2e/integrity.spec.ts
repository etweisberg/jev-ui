import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { clickAndSettle, settled } from './walks.mjs';

const DEMO_ROOT = resolve(process.cwd(), 'apps/demo');
const FIXTURES = join(DEMO_ROOT, 'fixtures');

const PAGES = [
  { path: '/chart', source: 'app/chart/Demo.tsx' },
  { path: '/dropdown', source: 'app/dropdown/Demo.tsx' },
  { path: '/typeahead', source: 'app/typeahead/Demo.tsx' },
  { path: '/feed', source: 'app/feed/Demo.tsx' },
  { path: '/form', source: 'app/form/Demo.tsx' },
];

test.describe('the demo tells the truth about itself', () => {
  for (const { path, source } of PAGES) {
    test(`${path} shows lines that really are in the file that ran`, async ({ page }) => {
      await page.goto(path);
      const shown = await page.getByTestId('demo-source').innerText();
      const onDisk = readFileSync(join(DEMO_ROOT, source), 'utf8').split('\n').map((line) => line.trimEnd());

      // The panel elides demo scaffolding, but every surviving line is verbatim and in
      // order — so the snippet can be shorter than the file, never different from it.
      let cursor = 0;
      for (const line of shown.split('\n')) {
        const trimmed = line.trimEnd();
        if (trimmed.trim().startsWith('// …') || trimmed.trim() === '') continue;
        // Lines wired to the demo controls show the live value, not the source text.
        if (trimmed.includes('← set by the controls above')) continue;
        const found = onDisk.indexOf(trimmed, cursor);
        expect(found, `"${trimmed.trim()}" should appear in ${source} after line ${cursor}`).toBeGreaterThan(-1);
        cursor = found + 1;
      }
    });
  }

  test('the omitted parts are marked, not silently dropped', async ({ page }) => {
    await page.goto('/chart');
    const shown = await page.getByTestId('demo-source').innerText();
    expect(shown).toContain('// …');
    // The markers themselves must never leak into the rendered snippet.
    expect(shown).not.toContain('docs:omit');
    expect(shown).not.toContain('docs:end');
  });

  test('the snippet keeps the library usage, and drops the scaffolding', async ({ page }) => {
    await page.goto('/chart');
    const shown = await page.getByTestId('demo-source').innerText();
    expect(shown).toContain("from 'jev-ui'");
    expect(shown).toContain('<Branch');
    expect(shown).toContain('minConfidence={0.5}');
    expect(shown).toContain('<Option fallback>');
    // Mock data and the presentational views are not what a reader came for.
    expect(shown).not.toContain('function TableView()');
    expect(shown).not.toContain("quarter: 'Q1 24'");
  });

  test('nothing reaches the live API during the suite', async ({ page }) => {
    await page.goto('/form');
    await settled(page);
    await expect(page.locator('[data-jev-transport]')).toHaveText('replay');
    await expect(page.locator('[data-jev-requests]')).toHaveText('0');
    expect(await page.getAttribute('[data-jev-status]', 'data-jev-errors')).toBe('0');
  });

  test('every channel the provider holds is sent by default', async ({ page }) => {
    await page.goto('/feed');
    await settled(page);
    await page.getByTestId('tab-state').click();
    const sent = JSON.parse(await page.locator('[data-jev-sent-state]').innerText());
    // Ambient state is a handful of banded words; withholding it would make the library
    // collect context and then ignore it.
    expect(Object.keys(sent)).toContain('recent_actions');
    expect(Object.keys(sent)).toContain('time_spent');
    expect(Object.keys(sent)).toContain('app');
    expect(Object.keys(sent)).toContain('data');
  });

  test('the picker narrows what is sent, and the snippet says so', async ({ page }) => {
    await page.goto('/chart');
    await settled(page);

    // Everything picked: no pick prop needed, and the snippet says as much.
    await expect(page.getByTestId('pick-summary')).toContainText('all channels');
    expect(await page.getByTestId('demo-source').innerText()).toContain('every channel');

    await page.getByTestId('pick-time_spent').click();
    await expect(page.getByTestId('pick-summary')).toContainText('pick={');
    // Two lines are live here (the ask and the pick), so assert on the snippet text
    // rather than on whichever happens to come first.
    expect(await page.getByTestId('demo-source').innerText()).toContain(
      "pick={['app', 'recent_actions']}",
    );
  });

  test('the question is editable, and the snippet shows the live wording', async ({ page }) => {
    await page.goto('/chart');
    await settled(page);
    const box = page.getByTestId('ask-input');
    await expect(box).toBeVisible();
    await box.fill('Which view answers this best?');
    await expect(page.getByTestId('ask-changed')).toBeVisible();
    const snippet = await page.getByTestId('demo-source').innerText();
    expect(snippet).toContain('ask="Which view answers this best?"');
  });

  test('inserting a state path keeps the question readable', async ({ page }) => {
    await page.goto('/chart');
    await settled(page);
    await page.getByTestId('insert-app.role').click();
    const ask = await page.getByTestId('ask-input').inputValue();
    // A clause before the question mark, not a fragment tacked on after it.
    expect(ask).toContain('given `app.role`?');
    expect(ask).not.toMatch(/\?\s+`app\.role`/);
  });

  test('changing one of your own fields reaches the next judgment', async ({ page }) => {
    await page.goto('/chart');
    await settled(page);
    await page.getByTestId('tab-state').click();
    const before = JSON.parse(await page.locator('[data-jev-sent-state]').innerText());
    expect(before.app.user).toBe('ana');

    // The provider's own reactivity — prop syncing, per-key merging, onStateChange — is
    // covered directly in packages/jev-ui/test/provider.test.tsx. This checks the last
    // mile: that an edited field actually reaches the payload.
    await page.getByTestId('toggle-state-editor').click();
    await page.locator('[data-jev-app-option="user:rob"]').click();
    await settled(page);
    const after = JSON.parse(await page.locator('[data-jev-sent-state]').innerText());
    expect(after.app.user).toBe('rob');
  });

  test('the question view explains the mapping and shows the real question', async ({ page }) => {
    await page.goto('/chart');
    await settled(page);
    await page.getByTestId('tab-question').click();
    await expect(page.getByTestId('tab-question-panel')).toBeVisible();

    const questions = JSON.parse(await page.locator('[data-jev-questions]').innerText());
    const question = Object.values(questions)[0] as { type: string; criteria: Record<string, string> };
    expect(question.type).toBe('choice');
    // Every Option key, plus the automatic no-match outcome.
    expect(Object.keys(question.criteria).sort()).toEqual(['__none__', 'bars', 'line', 'stat', 'table']);
    expect(question.criteria.line!.length).toBeGreaterThan(20);
  });

  test('the answer is shown next to the thing it decided', async ({ page }) => {
    await page.goto('/chart');
    await settled(page);
    await clickAndSettle(page, 'ask-trend');
    const strip = page.getByTestId('answer-strip');
    await expect(strip).toBeVisible();
    await expect(strip.locator('[data-jev-answer="chart_view"]')).toContainText('line');
  });

  /**
   * The test that separates a working library from one that always renders its fallback:
   * change the recorded judgment and the UI must follow.
   */
  test('the rendered view follows the judgment, not a hardcoded default', async ({ page }) => {
    const trendQuestion = 'How has revenue moved across the last seven quarters?';
    const files = readdirSync(FIXTURES).filter((name) => name.endsWith('.json'));

    let target: string | undefined;
    let original: string | undefined;
    for (const name of files) {
      const raw = readFileSync(join(FIXTURES, name), 'utf8');
      const record = JSON.parse(raw);
      const question = Object.values(record.sent.questions)[0] as { criteria?: Record<string, string> };
      const asked = (record.sent.state as { data?: { question?: string } }).data?.question;
      if (asked === trendQuestion && question.criteria && 'line' in question.criteria) {
        target = name;
        original = raw;
        break;
      }
    }
    expect(target, 'a fixture for the trend question should exist').toBeTruthy();

    await page.goto('/chart');
    await settled(page);
    await clickAndSettle(page, 'ask-trend');
    await expect(page.getByTestId('view-line')).toBeVisible();

    try {
      const record = JSON.parse(original!);
      record.answer = {
        type: 'choice',
        choice: 'stat',
        probabilities: { line: 0.05, bars: 0.05, table: 0.05, stat: 0.85 },
        confidence: 0.85,
      };
      writeFileSync(join(FIXTURES, target!), JSON.stringify(record, null, 2));

      await page.goto('/chart');
      await settled(page);
      await clickAndSettle(page, 'ask-trend');
      await expect(page.getByTestId('view-stat')).toBeVisible();
      await expect(page.getByTestId('view-line')).toHaveCount(0);

      // And below the floor, the fallback renders rather than the winner.
      record.answer.confidence = 0.2;
      writeFileSync(join(FIXTURES, target!), JSON.stringify(record, null, 2));
      await page.goto('/chart');
      await settled(page);
      await clickAndSettle(page, 'ask-trend');
      await expect(page.getByTestId('view-table')).toBeVisible();
      await expect(page.getByTestId('view-stat')).toHaveCount(0);
    } finally {
      writeFileSync(join(FIXTURES, target!), original!);
    }
  });
});

test.describe('cost', () => {
  test('every demo reports what its rendering decision cost', async ({ page }) => {
    await page.goto('/form');
    await settled(page);
    const strip = page.getByTestId('cost-strip');
    await expect(strip).toBeVisible();
    // Four judgments in one request, and a figure rather than a dash.
    await expect(page.locator('[data-jev-decisions]')).toHaveText('4');
    const value = await strip.locator('[data-jev-cost-value]').innerText();
    expect(value).toMatch(/^≈?\$/);
  });

  test('a replayed cost is marked as an estimate rather than passed off as real', async ({ page }) => {
    await page.goto('/chart');
    await settled(page);
    const value = await page.getByTestId('cost-strip').locator('[data-jev-cost-value]').innerText();
    expect(value.startsWith('≈')).toBe(true);
  });

  test('the per-decision share is smaller than the request it came from', async ({ page }) => {
    await page.goto('/form');
    await settled(page);
    const share = Number(
      await page.getByTestId('cost-strip').locator('[data-jev-cost]').getAttribute('data-jev-cost-usd'),
    );
    const total = await page.locator('[data-jev-cost-total]').innerText();
    const batch = Number(total.replace(/[^0-9.]/g, ''));
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(batch);
  });
});
