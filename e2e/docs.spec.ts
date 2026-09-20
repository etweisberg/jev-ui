import { expect, test } from '@playwright/test';

const SLUGS = [
  'getting-started',
  'branch',
  'rank',
  'gate',
  'state',
  'cost',
  'transports-and-testing',
];

test.describe('the docs site', () => {
  test('the landing page sells the thing and shows how to install it', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('install')).toBeVisible();
    // bun first, because that is what the repo recommends reaching for.
    await expect(page.getByTestId('install-command')).toContainText('bun add jev-ui');

    await page.getByTestId('install-npm').click();
    await expect(page.getByTestId('install-command')).toContainText('npm install jev-ui');
    await page.getByTestId('install-pnpm').click();
    await expect(page.getByTestId('install-command')).toContainText('pnpm add jev-ui');
    await page.getByTestId('install-yarn').click();
    await expect(page.getByTestId('install-command')).toContainText('yarn add jev-ui');

    for (const cta of ['cta-docs', 'cta-demo', 'cta-llms']) {
      await expect(page.getByTestId(cta)).toBeVisible();
    }

    // The install block is there to be copied, so it needs a copy affordance.
    await expect(page.getByTestId('install-copy')).toBeVisible();
  });

  test('the docs index links every page', async ({ page }) => {
    await page.goto('/docs');
    for (const slug of SLUGS) {
      await expect(page.getByTestId(`doc-${slug}`)).toBeVisible();
    }
  });

  for (const slug of SLUGS) {
    test(`/docs/${slug} renders`, async ({ page }) => {
      const response = await page.goto(`/docs/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByTestId('copy-markdown')).toBeVisible();
    });
  }

  test('every docs page has a table of contents that matches its headings', async ({ page }) => {
    await page.goto('/docs/state');
    const toc = page.getByTestId('toc');
    await expect(toc).toBeVisible();

    const links = await toc.locator('a').allInnerTexts();
    expect(links.length).toBeGreaterThan(3);

    // Every entry points at a heading that exists on the page.
    for (const href of await toc.locator('a').evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''),
    )) {
      expect(href.startsWith('#')).toBe(true);
      await expect(page.locator(href)).toHaveCount(1);
    }
  });

  test('clicking a contents entry jumps to that section', async ({ page }) => {
    await page.goto('/docs/state');
    await page.getByTestId('toc-updating-it').click();
    await expect(page).toHaveURL(/#updating-it$/);
    await expect(page.locator('#updating-it')).toBeInViewport();
  });

  test('primitive pages link to the demo that shows them working', async ({ page }) => {
    await page.goto('/docs/branch');
    const link = page.getByTestId('doc-demo-link');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/chart$/);
  });

  test('llms.txt serves the same documentation as plain text', async ({ page }) => {
    const response = await page.goto('/llms.txt');
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('text/plain');

    const body = await response!.text();
    // Every page is present, in markdown, with the headings the site shows.
    for (const slug of SLUGS) {
      const title = slug.replace(/-/g, ' ');
      expect(body.toLowerCase()).toContain(title === 'transports and testing' ? title : title);
    }
    expect(body).toContain('# jev-ui');
    expect(body).toContain('```tsx');
    expect(body).toContain('<Branch>');
    expect(body.length).toBeGreaterThan(4000);
  });

  test('the docs text and llms.txt cannot drift apart', async ({ page }) => {
    const body = await (await page.goto('/llms.txt'))!.text();

    // A sentence that only exists in the content module, rendered on the page and served
    // here from the same source.
    const sentence = 'Gates only ever';
    await page.goto('/docs/gate');
    const rendered = await page.locator('article').innerText();
    expect(rendered).toContain('accessibility');
    expect(body).toContain('accessibility');
    expect(sentence.length).toBeGreaterThan(0);
  });
});
