/**
 * Every scenario each demo can be in, as a sequence of interactions.
 *
 * Both the fixture recorder and the end-to-end tests import this module, so the states
 * that get recorded are exactly the states that get asserted. If they drifted, replay
 * would miss and the suite would fail loudly rather than quietly testing a fallback.
 */

const SETTLE_TIMEOUT = 45_000;
/** How long to wait for a NEW judgment before concluding the click needed none. */
const NEW_JUDGMENT_GRACE = 3_000;

/**
 * Waits for the page to be idle with no failures, and reports which happened. A single
 * poll rather than a race: racing a rejecting wait against a resolving one leaves the
 * loser pending, and its rejection surfaces later as an unrelated failure.
 */
async function waitForOutcome(page, minResolutions, timeout) {
  const handle = await page.waitForFunction(
    (floor) => {
      const panel = document.querySelector('[data-jev-status]');
      if (!panel) return null;
      if (Number(panel.getAttribute('data-jev-errors') ?? 0) > 0) return 'error';
      const resolved = Number(panel.getAttribute('data-jev-resolutions') ?? 0) > floor;
      const idle = Number(panel.getAttribute('data-jev-inflight') ?? 1) === 0;
      return resolved && idle ? 'settled' : null;
    },
    minResolutions,
    { timeout },
  );
  const outcome = await handle.jsonValue();
  await handle.dispose();

  if (outcome === 'error') {
    const messages = await page.locator('[data-jev-error]').allInnerTexts();
    throw new Error(`judgment failed:\n${messages.join('\n')}`);
  }
}

async function resolutionCount(page) {
  // The status element is deliberately display:none, so wait for it in the DOM
  // rather than on screen.
  await page.waitForSelector('[data-jev-status]', { state: 'attached', timeout: SETTLE_TIMEOUT });
  return Number((await page.getAttribute('[data-jev-status]', 'data-jev-resolutions')) ?? '0');
}

/** Wait until every judgment on the page has an answer. */
export async function settled(page) {
  // The status element is deliberately display:none, so wait for it in the DOM
  // rather than on screen.
  await page.waitForSelector('[data-jev-status]', { state: 'attached', timeout: SETTLE_TIMEOUT });
  await waitForOutcome(page, 0, SETTLE_TIMEOUT);
}

/**
 * Click something, then wait for the page to settle.
 *
 * Not every interaction produces a judgment: toggling a filter or a pin count reshapes
 * an answer already in hand, and selecting a state that matches what is already
 * resolved reuses it. Both are correct — changing a weight should not rerun inference —
 * so a click that produces no new resolution is accepted once the page is idle.
 */
export async function clickAndSettle(page, testId) {
  const before = await resolutionCount(page);
  await page.getByTestId(testId).click();
  try {
    await waitForOutcome(page, before, NEW_JUDGMENT_GRACE);
  } catch (error) {
    if (String(error?.message ?? '').startsWith('judgment failed')) throw error;
    // No new judgment within the grace period, or one still in flight. Either way the
    // page must end up idle and clean.
    await waitForOutcome(page, -1, SETTLE_TIMEOUT);
  }
}

export const CHART_ASKS = ['trend', 'compare', 'exact', 'single'];
/** 'fresh' is the page's initial state, so it is covered by the first load. */
export const DROPDOWN_SITUATIONS = ['exported', 'import-failed', 'fresh'];
export const TYPEAHEAD_QUERIES = ['bil', 'exp', 'who', 'card'];
export const FEED_INTERESTS = ['import', 'revenue'];
export const FORM_ORDERS = ['domestic', 'international', 'business'];

export const WALKS = {
  async chart(page) {
    await page.goto('/chart');
    await settled(page);
    // Editing one of your own fields must reach the payload. Done before the asks so the
    // default question is covered for both users.
    await page.getByTestId('toggle-state-editor').click();
    await page.locator('[data-jev-app-option="user:rob"]').click();
    await settled(page);
    await page.locator('[data-jev-app-option="user:ana"]').click();
    await settled(page);
    for (const ask of CHART_ASKS) await clickAndSettle(page, `ask-${ask}`);
  },

  async dropdown(page) {
    await page.goto('/dropdown');
    await settled(page);
    for (const situation of DROPDOWN_SITUATIONS) {
      await clickAndSettle(page, `situation-${situation}`);
    }
  },

  async typeahead(page) {
    await page.goto('/typeahead');
    // Nothing is ranked until there is a query, so there is no initial judgment.
    // The status element is deliberately display:none, so wait for it in the DOM
  // rather than on screen.
  await page.waitForSelector('[data-jev-status]', { state: 'attached', timeout: SETTLE_TIMEOUT });
    for (const query of TYPEAHEAD_QUERIES) await clickAndSettle(page, `query-${query}`);
  },

  async feed(page) {
    for (const interest of FEED_INTERESTS) {
      await page.goto('/feed');
      await settled(page);
      await clickAndSettle(page, `interest-${interest}`);
      // Page two has to be graded against page one, so record both depths.
      await clickAndSettle(page, 'load-more');
    }
  },

  async form(page) {
    await page.goto('/form');
    await settled(page);
    // Every judgment on this page receives every channel, so familiarity moves the gates
    // as well as the score. Both axes have to be walked together.
    for (const order of FORM_ORDERS) {
      await clickAndSettle(page, `order-${order}`);
      for (const band of [
        'familiarity-first-visit',
        'familiarity-returns-often',
        'familiarity-returning',
      ]) {
        await clickAndSettle(page, band);
      }
    }
  },
};

export const DEMO_NAMES = Object.keys(WALKS);
