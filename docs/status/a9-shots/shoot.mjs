// Screenshot helper for A9 (San Francisco). Run: node docs/status/a9-shots/shoot.mjs (preview on :4174).
import { chromium } from '@playwright/test';

const out = 'docs/status/a9-shots';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:4174/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByRole('button', { name: 'Bay & Forum', exact: true }).click();
await page.getByRole('button', { name: 'Go', exact: true }).click();
await page.getByRole('button', { name: 'Fly to San Francisco' }).click();
await page.getByRole('button', { name: 'Globe', exact: true }).waitFor({ timeout: 60_000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/01-spawn.png` });

async function hold(key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(1200);
}

await hold('KeyW', 3500);
await hold('KeyA', 3200);
await page.screenshot({ path: `${out}/02-bridge-approach.png` });
await hold('KeyW', 2500);
await page.screenshot({ path: `${out}/03-bridge-close.png` });
await hold('KeyA', 3200);
await page.screenshot({ path: `${out}/03b-strait.png` });
await hold('KeyD', 3200);
await hold('KeyS', 4500);
await hold('KeyD', 5000);
await page.screenshot({ path: `${out}/04-cable-barn.png` });
await hold('KeyS', 4000);
await page.screenshot({ path: `${out}/05-wharf.png` });
await hold('KeyD', 3500);
await page.screenshot({ path: `${out}/06-pier.png` });
await hold('KeyW', 7000);
await page.screenshot({ path: `${out}/07-hill-terrace.png` });
await browser.close();
