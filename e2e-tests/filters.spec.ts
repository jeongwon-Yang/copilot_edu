import { test, expect } from '@playwright/test';

test.describe('Game filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('filters by category and clears', async ({ page }) => {
    const cards = page.getByTestId('game-card');
    const total = await cards.count();
    const checkbox = page.locator('[data-testid^="filter-category-"]').first();

    await test.step('Select a category', async () => {
      await checkbox.check();
      const visible = await cards.filter({ visible: true }).count();
      expect(visible).toBeGreaterThan(0);
      expect(visible).toBeLessThan(total);
      await expect(page.getByTestId('filter-status')).toContainText(`of ${total} games`);
      await expect(page).toHaveURL(/category=\d+/);
    });

    await test.step('Clear filters', async () => {
      await page.getByTestId('filter-reset').click();
      await expect(cards.filter({ visible: true })).toHaveCount(total);
      await expect(checkbox).not.toBeChecked();
    });
  });

  test('filters by publisher and combines with category', async ({ page }) => {
    const cards = page.getByTestId('game-card');
    const select = page.getByTestId('filter-publisher');

    await select.selectOption({ index: 1 });
    const publisherName = await select.locator('option:checked').innerText();
    const byPublisher = cards.filter({ visible: true });
    for (const card of await byPublisher.all()) {
      await expect(card.getByTestId('game-publisher')).toHaveText(publisherName);
    }
    const publisherCount = await byPublisher.count();

    await page.locator('[data-testid^="filter-category-"]').first().check();
    expect(await cards.filter({ visible: true }).count()).toBeLessThanOrEqual(publisherCount);
  });

  test('shows empty state when nothing matches and supports keyboard use', async ({ page }) => {
    const select = page.getByTestId('filter-publisher');
    await select.selectOption({ index: 1 });
    // Select every category until the combination yields no results, if any
    const boxes = page.locator('[data-testid^="filter-category-"]');
    const n = await boxes.count();
    let empty = false;
    for (let i = 0; i < n && !empty; i++) {
      await page.getByTestId('filter-reset').click();
      await select.selectOption({ index: 1 });
      await boxes.nth(i).check();
      empty = (await page.getByTestId('game-card').filter({ visible: true }).count()) === 0;
    }
    if (empty) await expect(page.getByTestId('empty-state')).toBeVisible();

    await boxes.first().focus();
    await page.keyboard.press('Space');
    await expect(boxes.first()).toBeChecked();
  });

  test('multi-category filter unions categories, ANDs with publisher, and restores all from the URL', async ({ page }) => {
    const cards = page.getByTestId('game-card');
    const total = await cards.count();
    const boxes = page.locator('[data-testid^="filter-category-"]');
    const select = page.getByTestId('filter-publisher');
    const publisherId = await select.locator('option').nth(1).getAttribute('value');

    await test.step('Select two categories', async () => {
      await boxes.nth(0).check();
      const one = await cards.filter({ visible: true }).count();
      await boxes.nth(1).check();
      const two = await cards.filter({ visible: true }).count();
      expect(two).toBeGreaterThan(one);
      await expect(page.getByTestId('filter-status')).toHaveText(`Showing ${two} of ${total} games`);
      await expect(page).toHaveURL(/category=\d+&category=\d+/);
    });

    await test.step('Add a publisher and reload', async () => {
      await select.selectOption(publisherId!);
      await expect(page).toHaveURL(new RegExp(`publisher=${publisherId}`));
      const filtered = await cards.filter({ visible: true }).count();
      await page.reload();
      await expect(boxes.nth(0)).toBeChecked();
      await expect(boxes.nth(1)).toBeChecked();
      await expect(select).toHaveValue(publisherId!);
      await expect(cards.filter({ visible: true })).toHaveCount(filtered);
    });
  });

  test('restores filters from the URL', async ({ page }) => {
    const id = await page.locator('[data-testid^="filter-category-"]').first().getAttribute('value');
    await page.goto(`/?category=${id}`);
    await expect(page.locator('[data-testid^="filter-category-"]').first()).toBeChecked();
  });
});
