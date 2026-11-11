/** Fold/unfold continuity checks in an isolated browser; never touches device data. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:5188';
const key = 'word-atlas:v2:word-atlas-open';
// CSS test windows preserve Fold8 Ultra screen ratios; device density is user-dependent.
const outer = { width: 360, height: 840 };
const fold8 = { width: 752, height: 835 };
const inner = { width: 673, height: 841 };
const sizes = [outer, fold8, { width: 835, height: 752 }, inner, { width: 717, height: 805 }, { width: 840, height: 900 }, { width: 841, height: 673 }, { width: 900, height: 840 }, { width: 540, height: 720 }];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const passed = [];
const errors = [];
let current = 'startup';
try {
  const context = await browser.newContext({ viewport: outer, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    if (!localStorage.getItem('word-atlas:settings')) localStorage.setItem('word-atlas:settings', JSON.stringify({ onboarded: true, splash: false, theme: 'dark', autoplay: false, sfx: false, ambience: 'off', startLevel: 0, dailyNew: 5, spell: true }));
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const fit = async () => {
    await frame();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${current}: horizontal overflow`);
  };
  const navigate = async route => {
    await page.goto(`${origin}/?fold=${encodeURIComponent(route)}#${route}`);
    await page.locator('.page').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const route of ['/', '/atlas', '/practice', '/me', '/about']) {
      current = `${size.width}×${size.height} ${route}`;
      await navigate(route);
      await fit();
      assert.equal(await page.locator('.topbar').count(), route === '/' ? 1 : 0, `${current}: fixed brand header only on Today`);
      const nav = await page.getByRole('navigation', { name: '主导航', exact: true }).boundingBox();
      assert.ok(nav, `${current}: navigation stays available`);
      assert.equal(await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link').count(), 4);
      if (size.width >= 600) {
        assert.ok(nav.width <= 100 && nav.height > nav.width, `${current}: compact navigation rail`);
        const content = await page.locator('.main').boundingBox();
        assert.ok(content.x >= nav.x + nav.width - 1, `${current}: rail must not cover content`);
      } else assert.ok(nav.height <= 100 && nav.y + nav.height <= size.height + 1, `${current}: bottom navigation`);
      if (route !== '/') {
        const title = await page.locator('h1').first().boundingBox();
        assert.ok(title.y <= 40, `${current}: removed header must not leave its old space`);
      }
      passed.push(`${current}: home-only header, accessible navigation and no overflow`);
      if (size.width === 717 || size.width === 840) {
        await page.screenshot({ path: `output/playwright/fold-${route.slice(1) || 'today'}-${size.width}.png`, animations: 'disabled' });
      }
    }
  }
  current = 'atlas continuity';
  await page.setViewportSize(outer);
  await navigate('/atlas');
  await page.getByPlaceholder('搜索单词或中文释义').fill('Thursday');
  await page.getByRole('group', { name: '难度', exact: true }).getByRole('button', { name: 'A1', exact: true }).click();
  await page.getByRole('group', { name: '主题', exact: true }).getByRole('button', { name: '生活', exact: true }).click();
  await page.getByText('1 个结果', { exact: true }).waitFor();
  await page.evaluate(() => { window.__foldDocument = 'same-document'; });
  for (const size of [inner, fold8, { width: 835, height: 752 }, { width: 841, height: 673 }, outer]) {
    await page.setViewportSize(size); await fit();
    assert.equal(await page.getByPlaceholder('搜索单词或中文释义').inputValue(), 'Thursday');
    assert.equal(await page.getByRole('group', { name: '主题', exact: true }).getByRole('button', { name: '生活', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => window.__foldDocument), 'same-document');
  }
  await page.locator('.tile').first().click();
  await page.locator('.sheet .headword').waitFor();
  for (const size of [inner, fold8, { width: 835, height: 752 }, { width: 841, height: 673 }, outer]) {
    await page.setViewportSize(size); await fit();
    assert.equal(await page.locator('.sheet .headword').innerText(), 'Thursday');
    const layout = await page.locator('.sheet .entry').evaluate(e => {
      const a = e.querySelector('.entry-art').getBoundingClientRect();
      const b = e.querySelector('.entry-body').getBoundingClientRect();
      const art = e.querySelector('.illo').getBoundingClientRect();
      return { available: e.getBoundingClientRect().width, twoColumns: b.left >= a.right + 10, square: Math.abs(art.width - art.height) <= 1 };
    });
    assert.ok(layout.square, `${current}: full square illustration`);
    assert.equal(layout.twoColumns, layout.available >= 580, `${current}: columns follow available card width`);
    if (size.width === inner.width) await page.screenshot({ path: 'output/playwright/fold-word-673.png', animations: 'disabled' });
  }
  passed.push('Fold/unfold preserves atlas search, selected filters and the open word sheet');
  current = 'navigation after folding';
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '今日', exact: true }).click();
  await page.getByRole('button', { name: '开始学习', exact: true }).waitFor();
  assert.equal(await page.locator('.topbar').count(), 1);
  await page.getByRole('button', { name: '开始学习', exact: true }).click();
  await page.locator('.intro').waitFor();
  await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key) || '{}').session, key);
  await page.evaluate(key => {
    const progress = JSON.parse(localStorage.getItem(key));
    progress.session = { id: 'fold-continuity', started: Date.now(), index: 0, graded: {}, newIds: ['thursday'], reviewIds: [], steps: [{ id: 'thursday', kind: 'intro' }, { id: 'thursday', kind: 'spell' }] };
    const raw = JSON.stringify(progress); localStorage.setItem(key, raw); dispatchEvent(new StorageEvent('storage', { key, newValue: raw }));
  }, key);
  await page.getByRole('heading', { name: 'Thursday', exact: true }).waitFor();
  for (const size of [outer, inner, fold8, { width: 835, height: 752 }, { width: 841, height: 673 }, outer]) {
    current = `learn continuity ${size.width}`;
    await page.setViewportSize(size); await fit();
    const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session, key);
    assert.equal(state.id, 'fold-continuity'); assert.equal(state.index, 0);
    assert.equal(await page.locator('.topbar, .tabbar').count(), 0, 'learning retains only its task controls');
    const art = await page.locator('.intro .entry-art .illo').boundingBox();
    assert.ok(Math.abs(art.width - art.height) <= 1);
    const action = await page.locator('.learn-actions .btn').boundingBox();
    assert.ok(action.y >= 0 && action.y + action.height <= size.height + 1, `${current}: Continue remains reachable`);
    if (size.width === inner.width) await page.screenshot({ path: 'output/playwright/fold-learn-673.png', animations: 'disabled' });
  }
  passed.push('Learning preserves word/session/index while folding; complete illustration and Continue stay reachable');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  const input = page.getByRole('textbox', { name: /拼写/ });
  await input.fill('Thurs');
  await input.evaluate(el => { window.__foldInput = el; });
  for (const size of [inner, fold8, { width: 835, height: 752 }, { width: 841, height: 673 }, outer]) {
    current = `partial spelling ${size.width}`;
    await page.setViewportSize(size); await fit();
    assert.equal(await input.inputValue(), 'Thurs');
    assert.ok(await input.evaluate(el => el === window.__foldInput && document.activeElement === el));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.keyboardOpen), 'false', 'fold height change is not a keyboard');
  }
  await page.setViewportSize(inner); await frame();
  const cdp = await context.newCDPSession(page);
  // A keyboard shrinks the window without rotating the physical screen.
  const metrics = { width: inner.width, height: inner.height, screenWidth: inner.width, screenHeight: inner.height, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } };
  await cdp.send('Emulation.setDeviceMetricsOverride', metrics);
  await frame();
  await cdp.send('Emulation.setDeviceMetricsOverride', { ...metrics, height: inner.height - 280 });
  await page.waitForFunction(() => document.documentElement.dataset.keyboardOpen === 'true');
  await page.waitForFunction(() => { const r = document.querySelector('.spell-input').getBoundingClientRect(); return r.top >= 0 && r.bottom <= visualViewport.height; });
  await cdp.send('Emulation.setDeviceMetricsOverride', metrics);
  await page.waitForFunction(() => document.documentElement.dataset.keyboardOpen === 'false');
  await cdp.detach();
  assert.equal(await input.inputValue(), 'Thurs');
  await input.fill('Thursday');
  await page.getByRole('button', { name: /^确认/ }).click();
  await page.locator('.feedback').waitFor();
  await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key) || '{}').session?.pending, key);
  const pending = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session.pending, key);
  assert.ok(pending);
  await page.setViewportSize(outer); await frame();
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session.pending, key), pending);
  passed.push('Partial spelling, focus and answer feedback survive fold changes; keyboard height is handled separately');
  assert.deepEqual(errors, []);
  await fs.writeFile('output/playwright/foldable-report.json', JSON.stringify({ passed, errors }, null, 2));
  console.log(`PASS: ${passed.length} foldable checks`);
} catch (error) {
  console.error(`FAILED: ${current}`);
  throw error;
} finally {
  await browser.close();
}
