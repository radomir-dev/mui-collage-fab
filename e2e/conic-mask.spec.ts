import { expect, test } from '@playwright/test';

// The radial mode will clip every child with a conic-gradient window whose apex is
// compensated by the travel vector. This fixture is that construction in isolation:
// a 56px circle sitting at the centre of a 200px stage, masked by a half-disc window
// whose mask image is slid back by the circle's offset.
const STAGE = 200;
const CIRCLE = 56;
const OFFSET = (STAGE - CIRCLE) / 2;

const FIXTURE = `<!doctype html>
<style>
  html, body { margin: 0; background: #101010; }
  #stage { position: relative; width: ${STAGE}px; height: ${STAGE}px; background: #101010; }
  #wedge {
    position: absolute;
    left: ${OFFSET}px;
    top: ${OFFSET}px;
    width: ${CIRCLE}px;
    height: ${CIRCLE}px;
    border-radius: 50%;
    background: #4caf50;
    mask-image: conic-gradient(from 90deg, #000 0deg, #000 180deg, transparent 180deg);
    mask-size: ${STAGE}px ${STAGE}px;
    mask-position: -${OFFSET}px -${OFFSET}px;
    mask-repeat: no-repeat;
  }
</style>
<div id="stage"><div id="wedge"></div></div>`;

const numbers = (value: string) => (value.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

// The device scale is pinned so every project shoots the same pixels: the baseline
// is shared, and that is the point of this spec.
test.use({ deviceScaleFactor: 1 });

test('a compensated conic-gradient mask computes and clips the same in every engine', async ({
  page,
}) => {
  await page.setContent(FIXTURE);

  const wedge = page.locator('#wedge');
  const style = await wedge.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      maskImage: computed.maskImage,
      maskSize: computed.maskSize,
      maskPosition: computed.maskPosition,
    };
  });

  expect(style.maskImage).toContain('conic-gradient');
  expect(style.maskImage).toContain('from 90deg');
  expect(numbers(style.maskSize)).toEqual([STAGE, STAGE]);
  expect(numbers(style.maskPosition)).toEqual([-OFFSET, -OFFSET]);

  // The apex lands on the circle's centre because the image is slid by the circle's
  // offset, so exactly the bottom half disc survives the mask.
  await expect(page.locator('#stage')).toHaveScreenshot('conic-wedge.png');
});
