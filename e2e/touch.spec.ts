import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('.');
  await page.locator('.MuiToolbar-root').waitFor();
});

const group = (page: Page) =>
  page.getByTestId('direction-card').locator('.MuiCollageFab-root').nth(3);

test('a tap opens the group on touch devices', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch input only');

  const fab = group(page);
  await fab.scrollIntoViewIfNeeded();
  await expect(fab).toHaveClass(/MuiCollageFab-collapsed/);

  await fab.tap();

  await expect(fab).toHaveClass(/Mui-expanded/);
});

test('a tap outside collapses an open group on touch devices', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch input only');

  const fab = group(page);
  await fab.scrollIntoViewIfNeeded();
  await fab.tap();
  await expect(fab).toHaveClass(/Mui-expanded/);

  await page.locator('h3').first().tap();

  await expect(fab).toHaveClass(/MuiCollageFab-collapsed/);
});
