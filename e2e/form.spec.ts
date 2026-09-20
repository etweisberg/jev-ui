import { expect, test } from '@playwright/test';
import { clickAndSettle, settled } from './walks.mjs';

test.describe('Gate and useScore — reveal what applies', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/form');
    await settled(page);
  });

  test('resolves all four judgments in a single request', async ({ page }) => {
    // Three Gates plus one Score. This is the batching claim, measured.
    await expect(page.locator('[data-jev-decisions]')).toHaveText('4');
    await expect(page.locator('[data-jev-requests]')).toHaveText('0');
  });

  test('a domestic order shows none of the conditional sections', async ({ page }) => {
    await clickAndSettle(page, 'order-domestic');
    await expect(page.getByTestId('customs-fields')).toHaveCount(0);
    await expect(page.getByTestId('tax-fields')).toHaveCount(0);
    await expect(page.getByTestId('dangerous-goods-notice')).toHaveCount(0);
    // The primary fields are never gated away.
    await expect(page.getByLabel('Recipient name')).toBeVisible();
    await expect(page.getByLabel('Delivery address')).toBeVisible();
  });

  test('crossing a border reveals customs, and a battery reveals the freight notice', async ({
    page,
  }) => {
    await clickAndSettle(page, 'order-international');
    await expect(page.getByTestId('customs-fields')).toBeVisible();
    await expect(page.getByTestId('dangerous-goods-notice')).toBeVisible();
    // An individual buyer must not be asked for a tax registration number.
    await expect(page.getByTestId('tax-fields')).toHaveCount(0);
  });

  test('a registered business is asked for a tax id, and t-shirts raise no freight notice', async ({
    page,
  }) => {
    await clickAndSettle(page, 'order-business');
    await expect(page.getByTestId('tax-fields')).toBeVisible();
    await expect(page.getByTestId('customs-fields')).toBeVisible();
    await expect(page.getByTestId('dangerous-goods-notice')).toHaveCount(0);
  });

  test('gates only add fields — the form never loses its primary inputs', async ({ page }) => {
    for (const order of ['domestic', 'international', 'business']) {
      await clickAndSettle(page, `order-${order}`);
      await expect(page.getByLabel('Recipient name')).toBeVisible();
      await expect(page.getByLabel('Delivery address')).toBeVisible();
    }
  });

  test('the controls are grouped so it is clear what replaces what', async ({ page }) => {
    // Two independent radio groups: the order, and who is filling the form in.
    await expect(page.getByTestId('group-the-order')).toBeVisible();
    await expect(page.getByTestId('group-who-is-filling-it-in')).toBeVisible();
    await expect(page.getByTestId('group-the-order')).toHaveAttribute('role', 'radiogroup');
  });

  test('editing the order JSON changes which fields the gates reveal', async ({ page }) => {
    await clickAndSettle(page, 'order-international');
    await expect(page.getByTestId('customs-fields')).toBeVisible();

    // The JSON is the data the gates read, so it has to be editable to be believable.
    const box = page.getByTestId('order-json');
    await expect(box).toBeVisible();
    await expect(box).toHaveValue(/Lyon, France/);
  });

  test('invalid JSON is reported rather than silently reverting', async ({ page }) => {
    const box = page.getByTestId('order-json');
    await box.fill('{ not json');
    await expect(page.getByTestId('order-json-error')).toBeVisible();
  });

  test('every answer says what it controls on screen', async ({ page }) => {
    const answers = page.getByTestId('answer-strip');
    await expect(answers).toContainText('shows the customs fieldset');
    await expect(answers).toContainText('how much help text');
  });

  test('a score is shown against its level text, not a bare index', async ({ page }) => {
    const guidance = page.locator('[data-jev-answer="guidance"]');
    await expect(guidance).toContainText('Knows this form well');
  });

  test('typing in the state editor does not drop focus after each keystroke', async ({ page }) => {
    // A component declared inside another component is a new type every render, so React
    // remounts its subtree and the caret is lost. This asserts it is declared outside.
    await page.getByTestId('toggle-state-editor').click();
    const box = page.locator('#jev-recent_actions');
    await box.click();
    await page.keyboard.type('uploaded contacts.csv', { delay: 20 });
    await expect(box).toHaveValue('uploaded contacts.csv');
    await expect(box).toBeFocused();
  });

  test('a Score drives how much help text appears', async ({ page }) => {
    await clickAndSettle(page, 'order-international');

    await clickAndSettle(page, 'familiarity-first-visit');
    await expect(page.getByTestId('guidance-level')).toContainText('verbose help is on');
    await expect(page.getByTestId('guidance-level')).toContainText('first visit');
    const withHelp = await page.getByTestId('field-help').count();
    expect(withHelp).toBeGreaterThan(0);

    await clickAndSettle(page, 'familiarity-returns-often');
    await expect(page.getByTestId('guidance-level')).toContainText('verbose help is off');
    await expect(page.getByTestId('field-help')).toHaveCount(0);
  });
});
