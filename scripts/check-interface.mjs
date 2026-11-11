/** Geometry regression for touch filters, plus the user's shared surface constraints. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => { if (!localStorage.getItem('word-atlas:settings')) localStorage.setItem('word-atlas:settings', JSON.stringify({ onboarded: true, splash: false, theme: 'dark', sfx: false, ambience: 'off' })); });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const checkControls = async (label) => {
    const failures = await page.locator('.chips-scroll button, .segmented button, .search-pill').evaluateAll(buttons => buttons.flatMap(button => {
      const bounds = button.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return [];
      const range = document.createRange();
      range.selectNodeContents(button);
      const text = range.getBoundingClientRect();
      return text.left < bounds.left - 1 || text.right > bounds.right + 1 || text.top < bounds.top - 1 || text.bottom > bounds.bottom + 1
        ? [{ text: button.textContent.trim(), control: { width: bounds.width, height: bounds.height }, content: { width: text.width, height: text.height } }] : [];
    }));
    assert.deepEqual(failures, [], `${label}: control contents must fit their own boundary`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: page overflow`);
  };
  for (const size of [{ width: 360, height: 800 }, { width: 412, height: 870 }, { width: 870, height: 412 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(size);
    for (const route of ['/', '/atlas', '/practice', '/me', '/about', '/atlas?w=thursday']) {
      await page.goto(`${origin}/?interface=${size.width}-${encodeURIComponent(route)}#${route}`);
      await page.locator(route.includes('w=') ? '.entry .headword' : '.page').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await checkControls(`${size.width} ${route}`);
      const decorativeSurfaces = await page.locator('.panel, .tile, .illo, .mode-card, .choice, .sheet, .onboard-card, .galaxy-full, .summary-sky').evaluateAll(nodes => nodes.flatMap(el => {
        const s = getComputedStyle(el);
        const radius = Math.max(...[s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius, s.borderBottomRightRadius].map(parseFloat));
        return radius > 8 ? [{ className: el.className, radius }] : [];
      }));
      assert.deepEqual(decorativeSurfaces, [], `${size.width} ${route}: large-radius content surface`);
      assert.equal(await page.locator('.page-head .lede, .atlas-head .lede, .journey-lede, .summary-note, .mode-card small, .choice small').count(), 0, 'no decorative descriptive text');
      report.push(`${size.width} ${route}: control boundaries, page width, small radii and concise copy`);
      if (size.width === 412 || size.width === 1280) {
        const name = route.includes('w=') ? 'word' : route.replaceAll('/', '') || 'today';
        await page.screenshot({ animations: 'disabled', path: `output/playwright/refine-${name}-${size.width}.png` });
      }
    }
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`${origin}/#/atlas`);
  await page.getByRole('group', { name: '主题', exact: true }).waitFor();
  const enlarged = await page.addStyleTag({ content: '.chip-btn, .segmented button { font-size: 20px; }' });
  await checkControls('360 enlarged filter labels');
  const topics = page.getByRole('group', { name: '主题', exact: true });
  await topics.getByRole('button', { name: '历史', exact: true }).click();
  await page.waitForURL('**topic=history*');
  await checkControls('last topic after horizontal scroll');
  await topics.getByRole('button', { name: '所有主题', exact: true }).click();
  await page.waitForFunction(() => !location.hash.includes('topic='));
  await page.getByRole('group', { name: '难度', exact: true }).getByRole('button', { name: 'C2', exact: true }).click();
  await page.waitForURL('**level=C2*');
  await checkControls('last difficulty after horizontal scroll');
  report.push('360 enlarged labels: complete topic/difficulty text fits, last and first filters remain operable');
  await enlarged.evaluate(el => el.remove());
  await page.goto(`${origin}/#/atlas`);
  await page.getByRole('button', { name: '列表视图', exact: true }).click();
  await page.locator('.vlist .row').first().waitFor();
  await checkControls('list view');
  await page.getByRole('button', { name: '星图视图', exact: true }).click();
  await page.locator('.galaxy-full canvas').waitFor();
  await checkControls('galaxy view');
  report.push('list and galaxy views remain available');
  await page.evaluate(() => localStorage.setItem('word-atlas:settings', JSON.stringify({ onboarded: false, splash: false, theme: 'dark', sfx: false, ambience: 'off' })));
  await page.goto(origin);
  await page.getByRole('button', { name: '完成设置', exact: true }).waitFor();
  await checkControls('onboarding');
  await page.screenshot({ animations: 'disabled', path: 'output/playwright/refine-onboarding-360.png' });
  report.push('first setup: concise controls fit at 360px');
  assert.deepEqual(errors, []);
  await fs.writeFile('output/playwright/interface-report.json', JSON.stringify({ passed: report, errors }, null, 2));
  console.log(`PASS: ${report.length} interface checks`);
} finally {
  await browser.close();
}
