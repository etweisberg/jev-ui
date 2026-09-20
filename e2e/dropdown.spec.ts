import { expect, test } from '@playwright/test';
import { clickAndSettle, settled } from './walks.mjs';

async function labels(page: import('@playwright/test').Page): Promise<string[]> {
  return (await page.locator('[data-testid="menu"] li').allInnerTexts()).map((text) =>
    text.split(' ·')[0]!.trim(),
  );
}

test.describe('Rank compete — order a menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dropdown');
    await settled(page);
  });

  test('a failed import puts the error view at the top of the unpinned items', async ({ page }) => {
    await clickAndSettle(page, 'situation-import-failed');
    const ordered = await labels(page);
    // pinTop=2 holds the first two menu entries, so the judgment's winner follows them.
    expect(ordered.slice(0, 2)).toEqual(['New report', 'Open recent']);
    expect(ordered[2]).toBe('View import errors');
  });

  test('turning pinTop off lets the winner take the first slot', async ({ page }) => {
    await clickAndSettle(page, 'situation-import-failed');
    await clickAndSettle(page, 'toggle-pin');
    const ordered = await labels(page);
    expect(ordered[0]).toBe('View import errors');
    await expect(page.getByTestId('pinned-new_report')).toHaveCount(0);
  });

  test('reshaping the list with pinTop does not spend a new request', async ({ page }) => {
    await clickAndSettle(page, 'situation-import-failed');
    const before = await page.getAttribute('[data-jev-status]', 'data-jev-resolutions');
    await page.getByTestId('toggle-pin').click();
    await expect(page.getByTestId('menu')).toHaveAttribute('data-status', 'ready');
    // Changing a display rule re-derives in code; the evidence and question are unchanged.
    expect(await page.getAttribute('[data-jev-status]', 'data-jev-resolutions')).toBe(before);
  });

  test('a different action log produces a different order', async ({ page }) => {
    await clickAndSettle(page, 'situation-import-failed');
    await clickAndSettle(page, 'toggle-pin');
    const afterFailure = await labels(page);

    await clickAndSettle(page, 'situation-exported');
    const afterExport = await labels(page);

    expect(afterExport).not.toEqual(afterFailure);
    expect(afterExport[0]).not.toBe('View import errors');
  });

  test('every action survives ranking — compete mode drops nothing', async ({ page }) => {
    await clickAndSettle(page, 'situation-exported');
    expect(await labels(page)).toHaveLength(8);
  });
});
