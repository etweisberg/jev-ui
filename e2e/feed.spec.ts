import { expect, test } from '@playwright/test';
import { clickAndSettle, settled } from './walks.mjs';

async function cardIds(page: import('@playwright/test').Page): Promise<string[]> {
  const ids = await page.locator('[data-testid^="card-"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-testid')?.replace('card-', '') ?? ''),
  );
  return ids;
}

test.describe('Rank grade — order a feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feed');
    await settled(page);
  });

  test('grades every card in one request', async ({ page }) => {
    // Six cards means six Score questions — batched, not six requests.
    await expect(page.locator('[data-testid^="card-"]')).toHaveCount(6);
    await expect(page.locator('[data-jev-decisions]')).toHaveText('6');
    await expect(page.locator('[data-jev-requests]')).toHaveText('0');
  });

  test('what the person was doing decides what rises', async ({ page }) => {
    await clickAndSettle(page, 'interest-import');
    const forImport = await cardIds(page);
    // p1e is the rejected-rows alert; it should outrank the unrelated release note.
    expect(forImport.indexOf('p1e')).toBeLessThan(forImport.indexOf('p1d'));

    await clickAndSettle(page, 'interest-revenue');
    const forRevenue = await cardIds(page);
    expect(forRevenue).not.toEqual(forImport);
    expect(forRevenue.indexOf('p1b')).toBeLessThan(forRevenue.indexOf('p1e'));
  });

  test('a second page is graded against the first, not appended to it', async ({ page }) => {
    await clickAndSettle(page, 'interest-import');
    await clickAndSettle(page, 'load-more');
    const ids = await cardIds(page);
    expect(ids).toHaveLength(12);

    // Interleaving is the proof: page-two cards outranking page-one cards can only
    // happen because grade scores are comparable across requests.
    const firstPageTwoIndex = ids.findIndex((id) => id.startsWith('p2'));
    const lastPageOneIndex = ids.map((id) => id.startsWith('p1')).lastIndexOf(true);
    expect(firstPageTwoIndex).toBeLessThan(lastPageOneIndex);

    // And specifically: the page-two import guide should beat page-one's dark-mode note.
    expect(ids.indexOf('p2e')).toBeLessThan(ids.indexOf('p1d'));
  });

  test('grade mode can drop weak matches, which compete mode cannot', async ({ page }) => {
    await clickAndSettle(page, 'interest-import');
    const before = (await cardIds(page)).length;
    await clickAndSettle(page, 'toggle-filter');
    const after = (await cardIds(page)).length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  test('filtering re-derives in code without a new judgment', async ({ page }) => {
    await clickAndSettle(page, 'interest-import');
    const before = await page.getAttribute('[data-jev-status]', 'data-jev-resolutions');
    await page.getByTestId('toggle-filter').click();
    await expect(page.getByTestId('feed')).toHaveAttribute('data-status', 'ready');
    expect(await page.getAttribute('[data-jev-status]', 'data-jev-resolutions')).toBe(before);
  });
});
