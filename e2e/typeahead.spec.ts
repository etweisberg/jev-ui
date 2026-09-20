import { expect, test } from '@playwright/test';
import { clickAndSettle } from './walks.mjs';

test.describe('Rank compete with take — typeahead', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/typeahead');
    await page.waitForSelector('[data-jev-status]', { state: 'attached' });
  });

  test('ranks nothing until code has found candidates', async ({ page }) => {
    await expect(page.getByTestId('typeahead-empty')).toBeVisible();
    await expect(page.getByTestId('suggestions')).toHaveCount(0);
    // No candidates means no judgment: there is nothing to spend a request on.
    expect(await page.getAttribute('[data-jev-status]', 'data-jev-resolutions')).toBe('0');
  });

  test('shows every candidate when there are fewer than take, and never more', async ({ page }) => {
    await clickAndSettle(page, 'query-bil');
    // Three commands mention billing, so take={4} has nothing to cut here.
    await expect(page.getByTestId('candidate-count')).toContainText('3 candidates');
    await expect(page.locator('[data-testid="suggestions"] li')).toHaveCount(3);

    for (const query of ['exp', 'who', 'card']) {
      await clickAndSettle(page, `query-${query}`);
      const shown = await page.locator('[data-testid="suggestions"] li').count();
      expect(shown, `take should cap "${query}" at 4`).toBeLessThanOrEqual(4);
      expect(shown).toBeGreaterThan(0);
    }
  });

  test('an unambiguous prefix puts the intended command first', async ({ page }) => {
    await clickAndSettle(page, 'query-card');
    const first = page.locator('[data-testid="suggestions"] li').first();
    await expect(first).toContainText('Change the card we bill');
  });

  test('a word that matches no label still finds the right destination', async ({ page }) => {
    // "who" appears in no command label — it matches by meaning, which is the whole point.
    await clickAndSettle(page, 'query-who');
    const first = page.locator('[data-testid="suggestions"] li').first();
    await expect(first).toContainText('Change who can see what');
  });

  test('the top suggestion tracks what was typed', async ({ page }) => {
    await clickAndSettle(page, 'query-card');
    const forCard = await page.locator('[data-testid="suggestions"] li').first().innerText();
    await clickAndSettle(page, 'query-exp');
    const forExp = await page.locator('[data-testid="suggestions"] li').first().innerText();
    expect(forExp).not.toBe(forCard);
    expect(forExp).toContain('Export');
  });

  test('a re-resolve keeps the previous ranking instead of collapsing to zeros', async ({ page }) => {
    await clickAndSettle(page, 'query-card');
    const before = await page.locator('[data-testid="suggestions"] li').first().innerText();
    expect(before).toContain('Change the card we bill');

    // Edit the question: while the new judgment is in flight the list must keep the
    // ordering it already has rather than reverting to the raw catalogue order.
    await page.getByTestId('ask-input').fill('Which command did they mean?');
    const during = await page.locator('[data-testid="suggestions"] li').first().innerText();
    expect(during).toContain('Change the card we bill');
  });

  test('suggestions only ever come from the code-supplied catalogue', async ({ page }) => {
    await clickAndSettle(page, 'query-bil');
    const shown = await page.locator('[data-testid="suggestions"] li').allInnerTexts();
    for (const item of shown) {
      expect(item.toLowerCase()).toMatch(/bill|invoice|plan|export|email|report|api|teammate|see/);
    }
  });
});
