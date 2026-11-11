/** Isolated browser acceptance checks; never reads or changes phone progress. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:5188';
const out = 'output/playwright';
await fs.mkdir(out, { recursive: true });
const index = JSON.parse(await fs.readFile('public/atlas/index.json', 'utf8'));
const settings = { onboarded: true, splash: false, dailyNew: 5, startLevel: 0, autoplay: false, sfx: false, ambience: 'off', theme: 'dark', spell: true };
const progressKey = `word-atlas:v2:${index.id}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
const errors = [];
const context = await browser.newContext({ viewport: { width: 412, height: 870 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, acceptDownloads: true });
await context.addInitScript((s) => { if (!localStorage.getItem('word-atlas:settings')) localStorage.setItem('word-atlas:settings', JSON.stringify(s)); }, settings);
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
const readProgress = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), progressKey);
const fit = async (label) => {
  await page.waitForFunction(() => !document.querySelector('.boot'));
  await page.evaluate(() => document.fonts.ready);
  const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(dimensions.content <= dimensions.width + 2, `${label}: horizontal overflow ${JSON.stringify(dimensions)}`);
  report.push(`${label}: no horizontal overflow`);
};
try {
  await page.goto(origin);
  await page.getByRole('button', { name: '开始学习', exact: true }).waitFor();
  for (const size of [{width:360,height:800},{width:412,height:870},{width:870,height:412}]) {
    await page.setViewportSize(size);
    for (const route of ['/', '/atlas', '/practice', '/me', '/atlas?w=thursday']) {
      await page.goto(`${origin}/?qa=${Date.now()}#${route}`);
      await page.locator(route.includes('w=') ? '.entry .headword' : '.page').first().waitFor();
      await fit(`${size.width}x${size.height} ${route}`);
      if (route.includes('w=')) {
        const art = await page.locator('.entry-art .illo').evaluate((e) => ({w:e.clientWidth,h:e.clientHeight}));
        assert.ok(Math.abs(art.w-art.h) <= 2, `illustration must remain square: ${JSON.stringify(art)}`);
        await page.screenshot({path:`${out}/word-${size.width}.png`, fullPage:true});
      }
    }
  }
  await page.setViewportSize({width:412,height:870});
  await page.goto(`${origin}/#/atlas?w=thursday`);
  await page.locator('.headword').waitFor();
  await page.addStyleTag({content:'html { font-size: 125%; } body { font-size: 20px; }'});
  await fit('large text word sheet');
  await page.screenshot({path:`${out}/word-large-text.png`,fullPage:true});
  await page.locator('.entry').getByRole('button',{name:'收藏',exact:true}).click();
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)||'{}').bookmarks?.includes('thursday'), progressKey);
  await page.reload();
  await page.locator('.entry').getByRole('button',{name:'取消收藏',exact:true}).waitFor();
  report.push('bookmark survives reload');
  await page.goto(`${origin}/#/atlas`);
  await page.getByPlaceholder('搜索单词或中文释义').fill('Thursday');
  await page.getByText('1 个结果', {exact:true}).waitFor();
  await fit('search Thursday');
  report.push('search narrows the atlas to Thursday');
  await page.goto(`${origin}/#/`);
  await page.getByRole('button', {name:'开始学习',exact:true}).click();
  await page.locator('.intro').waitFor();
  // Real sessions select quiz types by time. This isolated fixture exercises each
  // type deterministically without changing the app's scheduling algorithm.
  await page.evaluate(({key, ids}) => {
    const p = JSON.parse(localStorage.getItem(key));
    p.session = { id:'acceptance-round', started:Date.now(), index:0, graded:{}, newIds:ids, reviewIds:[],
      steps:[...ids.map(id=>({id,kind:'intro'})), ...['meaning','picture','listen','spell'].map((kind,i)=>({id:ids[i],kind,options:kind==='spell'?undefined:ids}))] };
    const raw = JSON.stringify(p);
    localStorage.setItem(key, raw);
    window.dispatchEvent(new StorageEvent('storage', {key, newValue:raw}));
  }, {key:progressKey,ids:index.words.slice(0,4).map(w=>w[0])});
  await page.reload();
  await page.locator('.intro').waitFor();
  const kinds = new Set();
  for (let n=0;n<100;n++) {
    await page.waitForFunction((key) => !!JSON.parse(localStorage.getItem(key)||'{}').session, progressKey);
    const p = await readProgress();
    const s = p.session;
    if(s.finished || s.index >= s.steps.length) break;
    const step = s.steps[s.index];
    kinds.add(step.kind);
    if(step.kind === 'intro') {
      await page.locator('.intro .headword').waitFor();
      await fit(`learn intro ${step.id}`);
      if(n===0) await page.screenshot({path:`${out}/learn-412.png`, fullPage:true});
      await page.locator('.learn-actions').getByRole('button',{name:'继续',exact:true}).click();
    } else {
      if(step.kind === 'spell') {
        const word = index.words.find((w) => w[0]===step.id)[1];
        await page.getByRole('textbox',{name:/拼写/}).fill(word);
        await page.getByRole('button',{name:/^确认/}).click();
      } else {
        await page.locator(`[data-option="${step.id}"]`).click();
      }
      await page.getByRole('button',{name:'继续',exact:true}).click();
    }
    await page.waitForFunction(({key,at}) => JSON.parse(localStorage.getItem(key)||'{}').session?.index > at, {key:progressKey,at:s.index});
    if(n===1) {
      const before = await readProgress();
      await page.reload();
      await page.locator('.learn-top').waitFor();
      const after = await readProgress();
      assert.equal(after.session.index,before.session.index);
      report.push('active learning session survives reload');
    }
  }
  const final = await readProgress();
  assert.ok(final.session.finished || final.session.index >= final.session.steps.length, 'learning completes');
  assert.ok(['intro','meaning','picture','listen','spell'].every((k)=>kinds.has(k)), `missing quiz modes: ${[...kinds]}`);
  report.push(`full learning round: ${[...kinds].join(', ')}`);
  await page.goto(`${origin}/#/me`);
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'导出备份',exact:true}).click();
  const file = await download;
  const filePath = await file.path();
  const backup = JSON.parse(await fs.readFile(filePath,'utf8'));
  assert.equal(backup.version,2); assert.equal(backup.app,'word-atlas');
  const beforeRestore = await readProgress();
  page.once('dialog',(d)=>d.accept());
  await page.locator('input[type=file]').setInputFiles({name:'test-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await page.getByText(/已恢复.*个词的记忆/).waitFor();
  assert.deepEqual((await readProgress()).cards,beforeRestore.cards);
  report.push('JSON v2 backup download and restore preserve cards');
  await page.goto(`${origin}/#/atlas?view=galaxy`);
  await page.locator('.galaxy').first().waitFor();
  await page.screenshot({path:`${out}/galaxy-412.png`,fullPage:true});
  report.push('galaxy opens');
  assert.deepEqual(errors,[], 'no uncaught page errors');
  await fs.writeFile(`${out}/report.json`,JSON.stringify({passed:report,errors},null,2));
  console.log(JSON.stringify({passed:report.length,checks:report,errors},null,2));
} finally { await browser.close(); }
