import { test } from '@playwright/test';
import { flyTo, level, measureFrameMs, openFresh, startLevel, walkToAndCollect } from './support/game';

test('probe: walker at ~1.7 fps', async ({ page }) => {
  test.setTimeout(1_500_000);
  const [first] = level('icons').objectives;
  await openFresh(page);
  await startLevel(page, 'icons');
  await flyTo(page, first!.cityId);
  await page.evaluate(() => {
    const burn = () => {
      const until = performance.now() + 560;
      while (performance.now() < until) { /* stall */ }
      requestAnimationFrame(burn);
    };
    requestAnimationFrame(burn);
  });
  console.log('frameMs', await measureFrameMs(page));
  const t = Date.now();
  await walkToAndCollect(page, first!);
  console.log('walk s', (Date.now() - t) / 1000);
});
