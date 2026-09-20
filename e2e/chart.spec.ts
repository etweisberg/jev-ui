import { expect, test } from '@playwright/test';
import { clickAndSettle, settled } from './walks.mjs';

/**
 * The point of these assertions is not that a particular view is "correct" — it is that
 * the rendered subtree actually follows the judgment. A demo that always renders its
 * fallback looks identical to a working one from the outside.
 */
test.describe('Branch — which chart answers the question', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chart');
    await settled(page);
  });

  test('renders a different view for each kind of question', async ({ page }) => {
    const rendered: string[] = [];
    for (const ask of ['trend', 'compare', 'exact', 'single']) {
      await clickAndSettle(page, `ask-${ask}`);
      const views = ['line', 'bars', 'table', 'stat'];
      const visible: string[] = [];
      for (const view of views) {
        if (await page.getByTestId(`view-${view}`).count()) visible.push(view);
      }
      expect(visible, `exactly one view should render for "${ask}"`).toHaveLength(1);
      rendered.push(visible[0]!);
    }
    // If the judgment were being ignored, every question would land on the same view.
    expect(new Set(rendered).size).toBeGreaterThanOrEqual(3);
  });

  test('a trend question renders the time series', async ({ page }) => {
    await clickAndSettle(page, 'ask-trend');
    await expect(page.getByTestId('view-line')).toBeVisible();
  });

  test('a comparison question renders bars', async ({ page }) => {
    await clickAndSettle(page, 'ask-compare');
    await expect(page.getByTestId('view-bars')).toBeVisible();
  });

  test('a single-number question renders the headline stat', async ({ page }) => {
    await clickAndSettle(page, 'ask-single');
    await expect(page.getByTestId('view-stat')).toBeVisible();
  });

  test('what renders always agrees with the answer and the floor', async ({ page }) => {
    await clickAndSettle(page, 'ask-exact');

    // Read the judgment the page actually got, rather than hard-coding one. The same
    // question and state produced bars at 0.52 in one recording and 0.42 in the next —
    // right on the 0.5 floor — so asserting a particular view would test the weather.
    const panel = await page.locator('[data-jev-answer="chart_view"]').innerText();
    const confidence = Number(/conf ([0-9.]+)/.exec(panel)?.[1] ?? '0');
    const winner = /^chart_view.*\n\s*(\w+) conf/m.exec(panel)?.[1] ?? panel.split(/\s+/)[3];

    const visible: string[] = [];
    for (const view of ['line', 'bars', 'table', 'stat']) {
      if (await page.getByTestId(`view-${view}`).count()) visible.push(view);
    }
    expect(visible, 'exactly one view should render').toHaveLength(1);

    if (confidence >= 0.5) {
      expect(visible[0]).toBe(winner);
    } else {
      // Below the floor the fallback renders instead of a guess.
      expect(visible[0]).toBe('table');
    }
  });
});
