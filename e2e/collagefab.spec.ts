import { expect, test, type Locator, type Page } from '@playwright/test';

const card = (page: Page, direction: string) =>
  page
    .locator('.MuiPaper-root')
    .filter({ has: page.getByRole('heading', { name: direction, exact: true }) });

const readSlice = (slice: Locator) =>
  slice.evaluate((element) => {
    const style = getComputedStyle(element);
    const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    const [x, y] = style.maskPosition.split(' ').map(Number.parseFloat);

    return { translateX: matrix.m41, translateY: matrix.m42, maskX: x, maskY: y };
  });

test.beforeEach(async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on('requestfailed', (request) =>
    problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`http ${response.status()}: ${response.url()}`);
    }
  });

  await page.goto('.');
  try {
    await page.locator('.MuiCollageFab-root').first().waitFor({ timeout: 15_000 });
  } catch {
    const html = (await page.content()).slice(0, 600);
    throw new Error(
      `app never rendered. Problems:\n${problems.join('\n') || '(none reported)'}\nHTML: ${html}`,
    );
  }
});

test('expanding moves the slice and its mask by the same pitch, in opposite directions', async ({
  page,
}) => {
  for (const [direction, axis] of [
    ['left', 'x'],
    ['up', 'y'],
  ] as const) {
    const group = card(page, direction).locator('.MuiCollageFab-root');
    await group.scrollIntoViewIfNeeded();

    const slices = group.locator('.MuiCollageFab-item');
    const count = await slices.count();
    const slice = slices.nth(1);

    const closedWidth = axis === 'x' ? (await group.boundingBox())!.width : 0;
    const closedHeight = axis === 'y' ? (await group.boundingBox())!.height : 0;
    const before = await readSlice(slice);

    await group.hover();
    await page.waitForTimeout(700);

    const openWidth = axis === 'x' ? (await group.boundingBox())!.width : 0;
    const openHeight = axis === 'y' ? (await group.boundingBox())!.height : 0;
    const after = await readSlice(slice);

    const pitch =
      axis === 'x'
        ? (openWidth - closedWidth) / (count - 1)
        : (openHeight - closedHeight) / (count - 1);
    expect(pitch).toBeGreaterThan(0);

    const translate =
      axis === 'x' ? after.translateX - before.translateX : after.translateY - before.translateY;
    const mask = axis === 'x' ? after.maskX - before.maskX : after.maskY - before.maskY;

    expect(Math.abs(translate)).toBeCloseTo(pitch, 0);
    expect(Math.abs(mask)).toBeCloseTo(pitch, 0);
    expect(translate * mask).toBeLessThan(0);
    expect(after.maskX + after.translateX).toBeCloseTo(before.maskX + before.translateX, 0);
  }
});

test('a mixed group fans along both axes', async ({ page }) => {
  const group = card(page, 'Left and down').locator('.MuiCollageFab-root');
  await group.scrollIntoViewIfNeeded();

  const slices = group.locator('.MuiCollageFab-item');
  await group.hover();
  await page.waitForTimeout(700);

  const left = await readSlice(slices.nth(1));
  const down = await readSlice(slices.nth(3));

  expect(left.translateX).toBeLessThan(-50);
  expect(left.translateY).toBe(0);
  expect(down.translateY).toBeGreaterThan(50);
  expect(down.translateX).toBe(0);

  const box = (await group.boundingBox())!;
  expect(box.width).toBeGreaterThan(150);
  expect(box.height).toBeGreaterThan(100);
});

test('a radial group rings the anchor without moving it', async ({ page }) => {
  const group = card(page, 'Radial').locator('.MuiCollageFab-root');
  await group.scrollIntoViewIfNeeded();

  const slices = group.locator('.MuiCollageFab-item');
  const count = await slices.count();
  const centre = async (index: number) => {
    const box = (await slices.nth(index).boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  await expect(slices.first()).toHaveCSS('mask-image', 'none');
  const closed = await centre(0);

  await group.hover();
  await page.waitForTimeout(700);

  const opened = await centre(0);
  expect(opened.x).toBeCloseTo(closed.x, 0);
  expect(opened.y).toBeCloseTo(closed.y, 0);

  for (let index = 1; index < count; index += 1) {
    const point = await centre(index);
    expect(Math.hypot(point.x - opened.x, point.y - opened.y)).toBeCloseTo(60, 0);
    const maskImage = await slices
      .nth(index)
      .evaluate((element) => getComputedStyle(element).maskImage);
    expect(maskImage).toContain('conic-gradient');
  }
});

test('collapsed slices leave the accessibility tree and the tab order', async ({ page }) => {
  const group = card(page, 'left').locator('.MuiCollageFab-root');
  const slices = group.locator('.MuiCollageFab-item');

  await expect(group).toHaveClass(/MuiCollageFab-collapsed/);
  await expect(slices.first()).toHaveAttribute('aria-hidden', 'true');
  await expect(slices.first()).toHaveJSProperty('inert', true);
});

test('opens from the keyboard, focuses the first action and collapses on Escape', async ({
  page,
}) => {
  const group = card(page, 'left').locator('.MuiCollageFab-root');
  await group.scrollIntoViewIfNeeded();

  await group.focus();
  await page.keyboard.press('Enter');

  await expect(group).toHaveClass(/Mui-expanded/);
  await expect(group.locator('button').first()).toBeFocused();

  await page.keyboard.press('Escape');

  await expect(group).toHaveClass(/MuiCollageFab-collapsed/);
  await expect(group).toBeFocused();
});
