/** Verify visible progress geometry and transform-only interpolation in real Chrome. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const passed = [], errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 820 }, hasTouch: true, isMobile: true });
  await context.addInitScript(() => localStorage.setItem('word-atlas:settings', JSON.stringify({ onboarded: true, splash: false, theme: 'dark', autoplay: false, sfx: false, ambience: 'off', startLevel: 0, dailyNew: 5, spell: true })));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const origin = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:5188';
  const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const finish = locator => locator.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))));
  await page.goto(origin + '/#/');
  const bar = page.locator('.week li span').first();
  await bar.waitFor({ state: 'attached' });
  for (const value of [0, 0.5, 1]) {
    await bar.evaluate((el, value) => el.style.setProperty('--h', value), value);
    await finish(bar);
    const geometry = await bar.evaluate(el => ({ visible: el.getBoundingClientRect().height, layout: el.offsetHeight, transition: getComputedStyle(el).transitionProperty, origin: getComputedStyle(el).transformOrigin }));
    assert.ok(Math.abs(geometry.visible - geometry.layout * (0.1 + value * 0.9)) < 1);
    assert.equal(geometry.transition, 'transform');
    passed.push(`Weekly value ${value}: original height proportion and transform transition`);
  }
  await bar.evaluate(el => el.style.setProperty('--h', 0));
  await bar.evaluate(el => new Promise(resolve => requestAnimationFrame(resolve)));
  const weekFrames = await bar.evaluate(el => {
    const a = el.getAnimations()[0]; assertAnimation(a); a.pause(); a.currentTime = 300;
    function assertAnimation(a) { if (!a) throw new Error('Expected weekly transition'); }
    return { frames: a.effect.getKeyframes(), visible: el.getBoundingClientRect().height, layout: el.offsetHeight };
  });
  assert.ok(weekFrames.visible > weekFrames.layout * 0.1 && weekFrames.visible < weekFrames.layout);
  assert.ok(weekFrames.frames.every(f => 'transform' in f && !('height' in f)));
  await bar.evaluate(el => el.getAnimations().forEach(a => a.finish()));
  passed.push('Weekly mid-animation changes transform without changing layout height');

  await page.getByRole('button', { name: '开始学习', exact: true }).click();
  const fill = page.locator('.learn-progress span');
  await fill.waitFor({ state: 'attached' });
  for (const value of [0, 0.5, 1]) {
    await fill.evaluate((el, value) => el.style.setProperty('--progress', `${value * 100}%`), value);
    await finish(fill);
    const geometry = await fill.evaluate(el => {
      const a = el.getBoundingClientRect(), b = el.parentElement.getBoundingClientRect();
      return { visible: Math.min(a.right, b.right) - Math.max(a.left, b.left), track: b.width, layout: el.offsetWidth, transition: getComputedStyle(el).transitionProperty };
    });
    assert.ok(Math.abs(geometry.visible - Math.max(10, geometry.track * value)) < 1);
    assert.ok(Math.abs(geometry.layout - geometry.track) < 1);
    assert.equal(geometry.transition, 'transform');
    passed.push(`Learning value ${value}: original fill width, including 10px minimum`);
  }
  await fill.evaluate(el => el.style.setProperty('--progress', '0%'));
  await fill.evaluate(el => new Promise(resolve => requestAnimationFrame(resolve)));
  const frames = await fill.evaluate(el => {
    const a = el.getAnimations()[0]; if (!a) throw new Error('Expected progress transition'); a.pause(); a.currentTime = 300;
    return { keys: a.effect.getKeyframes(), width: el.offsetWidth, track: el.parentElement.offsetWidth };
  });
  assert.equal(frames.width, frames.track);
  assert.ok(frames.keys.every(f => 'transform' in f && !('width' in f)));
  await fill.evaluate(el => el.getAnimations().forEach(a => a.finish()));
  await page.getByRole('button', { name: '继续', exact: true }).click();
  assert.notEqual(await fill.evaluate(el => el.style.getPropertyValue('--progress')), '0%');
  passed.push('Learning advancement updates transform; animation retains fixed layout width');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await fill.evaluate(el => parseFloat(getComputedStyle(el).transitionDuration) <= 0.001));
  passed.push('Reduced-motion preference disables progress interpolation');

  for (const width of [375, 412, 752, 1280]) {
    await page.setViewportSize({ width, height: 835 });
    await page.goto(origin + '/#/atlas');
    await page.getByRole('button', { name: '星图视图', exact: true }).click();
    await page.locator('.atlas.is-galaxy .galaxy-full canvas').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await finish(page.locator('.page'));
    await page.locator('.atlas-head').evaluate((el, width) => { el.style.gap = `${width >= 600 ? 20 : 22}px`; el.style.marginBottom = '22px'; }, width);
    await page.locator('.filters').evaluate(el => { el.style.marginBottom = '22px'; });
    await frame();
    const before = await page.locator('.galaxy-full').boundingBox();
    await page.locator('.atlas-head').evaluate(el => el.removeAttribute('style'));
    await page.locator('.filters').evaluate(el => el.removeAttribute('style'));
    await frame();
    const after = await page.locator('.galaxy-full').boundingBox();
    assert.ok(before.y - after.y >= 21, `${width}: galaxy moves up without hiding controls (${before.y} -> ${after.y})`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await page.getByRole('group', { name: '视图', exact: true }).getByRole('button').count(), 3);
    await page.screenshot({ path: `output/playwright/motion-galaxy-${width}.png` });
    passed.push(`${width}px: galaxy moves up ${Math.round(before.y - after.y)}px, controls retained, no overflow`);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile('output/playwright/motion-report.json', JSON.stringify({ passed, errors }, null, 2));
  console.log(`PASS: ${passed.length} motion and spacing checks`);
} finally {
  await browser.close();
}
