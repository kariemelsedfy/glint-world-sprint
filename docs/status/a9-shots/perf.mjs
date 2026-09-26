// A9 perf probe: node docs/status/a9-shots/perf.mjs [city-label] [trial] [qualities] [repeats]
// (production preview on :4174, SwiftShader flags as in playwright.config).
// Prints fps (5 s rAF sample after 1 s warm-up, same method as tests/e2e/perf.spec.ts) and GL draw
// calls per frame for the given city at standard and low quality.
import { chromium } from '@playwright/test';

const cityLabel = process.argv[2] ?? 'San Francisco';
const trial = process.argv[3] ?? 'Bay & Forum';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', ...(process.env.NO_VSYNC ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [])],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.text().startsWith('SF-COUNTS')) console.log(m.text()); });
await page.addInitScript(() => {
  const counters = { draws: 0, indices: 0 };
  window.__glDraws = counters;
  for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = proto[name];
      if (!original) continue;
      proto[name] = function (...args) {
        counters.draws += 1;
        // drawElements(mode, count, type, offset[, instanceCount]) / drawArrays(mode, first, count[, instanceCount]).
        const count = name.startsWith('drawElements') ? args[1] : args[2];
        const instances = name.endsWith('Instanced') ? args[name.startsWith('drawElements') ? 4 : 3] : 1;
        counters.indices += count * instances;
        return original.apply(this, args);
      };
    }
  }
});

async function frames() {
  return page.evaluate(
    () =>
      new Promise((done) => {
        const out = [];
        const begin = performance.now();
        let last = -1;
        let start = -1;
        let drawsAtStart = 0;
        let indicesAtStart = 0;
        const tick = (now) => {
          if (start < 0 && now - begin >= 1000) {
            start = now;
            drawsAtStart = window.__glDraws.draws;
            indicesAtStart = window.__glDraws.indices;
          } else if (start >= 0) out.push(now - last);
          last = now;
          if (start >= 0 && now - start >= 5000) {
            const draws = window.__glDraws.draws - drawsAtStart;
            const triangles = (window.__glDraws.indices - indicesAtStart) / 3;
            const sorted = [...out].sort((a, b) => a - b);
            done({ frames: out.length, draws, triangles, median: sorted[Math.floor(sorted.length / 2)] ?? 0 });
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  ).then(({ frames, draws, triangles, median }) => ({
    fps: Math.round((frames / 5) * 10) / 10,
    medianFps: Math.round((1000 / median) * 10) / 10,
    drawsPerFrame: Math.round(draws / Math.max(1, frames)),
    trianglesPerFrame: Math.round(triangles / Math.max(1, frames)),
  }));
}

async function run(quality) {
  await page.goto('http://localhost:4174/');
  await page.evaluate((q) => {
    localStorage.clear();
    localStorage.setItem('glint:v1', JSON.stringify({ settings: { muted: true, reducedMotion: false, quality: q }, bests: {} }));
  }, quality);
  await page.reload();
  const button = page.getByRole('button', { name: /^Quality:/ });
  if (await button.isVisible().catch(() => false)) {
    const text = await button.textContent();
    const want = quality === 'low' ? 'Low' : 'Standard';
    if (!text.includes(want)) await button.click();
  }
  await page.getByRole('button', { name: trial, exact: true }).click();
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await page.getByRole('button', { name: `Fly to ${cityLabel}` }).click();
  await page.getByRole('button', { name: 'Globe', exact: true }).waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  const result = await frames();
  console.log(`${cityLabel} @ ${quality}: ${result.fps} fps mean, ${result.medianFps} fps median, ${result.drawsPerFrame} draw calls/frame, ${result.trianglesPerFrame} triangles/frame`);
}

const qualities = (process.argv[4] ?? 'standard,low').split(',');
const repeats = Number(process.argv[5] ?? 1);
for (const q of qualities) for (let i = 0; i < repeats; i += 1) await run(q);
await browser.close();
