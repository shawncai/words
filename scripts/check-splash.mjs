/** Regression: Android can mount the first WebView with a zero-sized viewport. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

let server;
let browser;
try {
  let origin = process.env.ATLAS_TEST_URL;
  if (!origin) {
    server = await createServer({
      server: { host: "127.0.0.1", port: 0, strictPort: false, watch: null },
    });
    await server.listen();
    origin = server.resolvedUrls.local[0];
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 412, height: 870 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      "word-atlas:settings",
      JSON.stringify({
        onboarded: true,
        splash: true,
        sfx: false,
        ambience: "off",
      }),
    );
    const probe = { zero: true, samples: [] };
    window.__splashProbe = probe;
    const width = Object.getOwnPropertyDescriptor(window, "innerWidth");
    const height = Object.getOwnPropertyDescriptor(window, "innerHeight");
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      get: () =>
        probe.zero ? 0 : width.get ? width.get.call(window) : width.value,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      get: () =>
        probe.zero ? 0 : height.get ? height.get.call(window) : height.value,
    });
    const bounds = HTMLCanvasElement.prototype.getBoundingClientRect;
    HTMLCanvasElement.prototype.getBoundingClientRect = function () {
      return probe.zero && this.classList.contains("splash-canvas")
        ? new DOMRect(0, 0, 0, 0)
        : bounds.call(this);
    };
    const sample = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      probe.samples.push([args[2], args[3]]);
      return sample.apply(this, args);
    };
  });
  await page.goto(origin);
  await page.waitForFunction(
    () =>
      document.querySelector(".splash-skip") ||
      window.__splashProbe.samples.length,
  );
  await page.waitForTimeout(100);
  assert.deepEqual(
    errors,
    [],
    "zero-sized mount must not unmount the application",
  );
  assert.equal(
    await page.evaluate(() => window.__splashProbe.samples.length),
    0,
    "wait for a real layout before sampling pixels",
  );
  await page.evaluate(() => {
    window.__splashProbe.zero = false;
    window.dispatchEvent(new Event("resize"));
  });
  await page.waitForFunction(() =>
    window.__splashProbe.samples.some(([w, h]) => w > 0 && h > 0),
  );
  await page.locator(".splash.is-ready").waitFor();
  const sampleCount = await page.evaluate(
    () => window.__splashProbe.samples.length,
  );
  await page.setViewportSize({ width: 870, height: 412 });
  await page.waitForFunction(
    (previous) => window.__splashProbe.samples.length > previous,
    sampleCount,
  );
  assert.ok(
    await page.evaluate(() =>
      window.__splashProbe.samples.every(([w, h]) => w > 0 && h > 0),
    ),
    "never pass zero dimensions to getImageData",
  );
  await page.getByRole("button", { name: "跳过", exact: true }).click();
  await page.locator(".splash").waitFor({ state: "detached" });
  await page
    .getByRole("button", { name: "开始学习", exact: true })
    .waitFor();
  assert.deepEqual(
    errors,
    [],
    "normal sizing, rotation and skipping must stay usable",
  );
  console.log(
    "PASS: splash waits at 0×0, initializes at 412×870, resizes, and skips to Today without errors",
  );
} finally {
  await browser?.close();
  await server?.close();
}
