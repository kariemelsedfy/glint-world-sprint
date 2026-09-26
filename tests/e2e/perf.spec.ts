/**
 * Measurement pass, not a performance gate: records menu-ready load time and rAF frame timing on
 * the production preview and writes test-results/perf/<label>.json. Assertions are sanity checks
 * only, because the default project renders WebGL through SwiftShader (CPU), not a GPU.
 * Set PERF_GPU=1 to add a run without the SwiftShader flags (hardware GL where available).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { flyTo, openFresh, startLevel } from './support/game';

const SAMPLE_MS = 5_000;
const WARMUP_FRAMES = 30;
/** Chosen throttle profile, documented in docs/qa/PERFORMANCE.md: 9 Mbit/s down, 60 ms RTT, cache off. */
const THROTTLE = { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 };

interface FrameStats {
  readonly frames: number;
  readonly meanMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly fps: number;
  readonly over25Ms: number;
  readonly over40Ms: number;
}

interface LoadStats {
  readonly menuReadyMs: number;
  readonly domContentLoadedMs: number;
  readonly loadEventMs: number;
  readonly transferredBytes: number;
}

async function measureLoad(page: Page): Promise<LoadStats> {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(() => {
    const heading = [...document.querySelectorAll('h1,h2')].some((node) => node.textContent === 'GLINT World Sprint');
    const canvas = document.querySelector('canvas');
    return heading && canvas !== null && canvas.width > 0 && canvas.height > 0;
  }, undefined, { polling: 'raf', timeout: 30_000 });
  return page.evaluate(() => {
    const menuReadyMs = performance.now();
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const transferredBytes = (nav?.transferSize ?? 0) + resources.reduce((sum, entry) => sum + entry.transferSize, 0);
    return {
      menuReadyMs: Math.round(menuReadyMs),
      domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd ?? -1),
      loadEventMs: Math.round(nav?.loadEventEnd ?? -1),
      transferredBytes,
    };
  });
}

async function measureFrames(page: Page): Promise<FrameStats> {
  const deltas = await page.evaluate(
    ({ sampleMs, warmup }) =>
      new Promise<number[]>((done) => {
        const out: number[] = [];
        let last = -1;
        let seen = 0;
        let start = -1;
        const tick = (now: number) => {
          if (last >= 0 && ++seen > warmup) {
            if (start < 0) start = now;
            out.push(now - last);
          }
          last = now;
          if (start >= 0 && now - start >= sampleMs) done(out);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { sampleMs: SAMPLE_MS, warmup: WARMUP_FRAMES },
  );
  const sorted = [...deltas].sort((a, b) => a - b);
  const pick = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  const mean = deltas.reduce((sum, value) => sum + value, 0) / Math.max(1, deltas.length);
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    frames: deltas.length,
    meanMs: round(mean),
    medianMs: round(pick(0.5)),
    p95Ms: round(pick(0.95)),
    maxMs: round(sorted.at(-1) ?? 0),
    fps: round(1000 / Math.max(mean, 0.001)),
    over25Ms: deltas.filter((value) => value > 25).length,
    over40Ms: deltas.filter((value) => value > 40).length,
  };
}

async function renderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no WebGL';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  });
}

function record(label: string, data: object): void {
  const dir = resolve(import.meta.dirname, '../../test-results/perf');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${label}.json`), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`[perf:${label}] ${JSON.stringify(data)}`);
}

async function measureAll(page: Page, label: string): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const loadLocal = await measureLoad(page);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...THROTTLE });
  const loadThrottled = await measureLoad(page);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  await openFresh(page);
  const menu = await measureFrames(page);
  await startLevel(page, 'icons');
  const globe = await measureFrames(page);
  await flyTo(page, 'paris');
  const paris = await measureFrames(page);

  const environment = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    viewport: `${innerWidth}x${innerHeight}`,
    devicePixelRatio: devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency,
  }));
  const data = {
    label,
    measuredAt: new Date().toISOString(),
    renderer: await renderer(page),
    ...environment,
    quality: 'standard (default settings)',
    sampleMsPerScene: SAMPLE_MS,
    warmupFrames: WARMUP_FRAMES,
    load: { localPreview: loadLocal, throttled9MbitRtt60: loadThrottled },
    frames: { menu, globe, paris },
  };
  record(label, data);

  expect(loadLocal.menuReadyMs).toBeLessThan(15_000);
  for (const stats of [menu, globe, paris]) expect(stats.frames).toBeGreaterThan(20);
}

test('measures load and frame timing (SwiftShader, default project)', async ({ page }) => {
  test.setTimeout(120_000);
  await measureAll(page, 'swiftshader');
});

test('measures load and frame timing (no SwiftShader flags)', async ({ playwright, baseURL }) => {
  test.skip(!process.env.PERF_GPU, 'set PERF_GPU=1 to measure without the SwiftShader flags');
  test.setTimeout(120_000);
  const browser = await playwright.chromium.launch({ args: [] });
  try {
    const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 720 } });
    await measureAll(await context.newPage(), 'hardware-gl');
  } finally {
    await browser.close();
  }
});
