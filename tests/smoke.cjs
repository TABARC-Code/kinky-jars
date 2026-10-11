/* Real-browser smoke checks. Skipped when Playwright isn't installed.
   Run with: node --test tests/smoke.cjs
   Set CHROMIUM_PATH to use an existing Chromium instead of Playwright's own. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
let chromium = null;
try { ({ chromium } = require('playwright')); } catch (e) { /* skipped below */ }
const PAGE = 'file://' + path.join(__dirname, '../index.html');
const opts = { skip: chromium ? false : 'playwright is not installed' };

async function withPage(width, fn, { easy = false } = {}) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const problems = [];
    page.on('pageerror', e => problems.push('pageerror: ' + e.message));
    page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) problems.push('external request: ' + r.url()); });
    await page.addInitScript(easyOn => {
      localStorage.setItem('kinkjars-18', 'yes');
      if (easyOn) localStorage.setItem('kinkjars-prefs', JSON.stringify({ easy: true }));
    }, easy);
    await page.goto(PAGE);
    await page.evaluate(() => document.fonts.ready);
    await fn(page, problems);
  } finally { await browser.close(); }
}

for (const width of [320, 360, 390, 1280]) {
  for (const easy of [false, true]) {
    test(`no sideways scroll, errors or outside requests at ${width}px${easy ? ' (easy-read)' : ''}`, opts, () =>
      withPage(width, async (page, problems) => {
        const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: document.documentElement.clientWidth }));
        assert.equal(widths.page, widths.view, `page is ${widths.page}px wide in a ${widths.view}px viewport`);
        assert.deepEqual(problems, []);
      }, { easy }));
  }
}

test('bundled fonts load, including the easy-read face', opts, () =>
  withPage(390, async page => {
    // load() fetches each bundled file; it resolves to an empty list if the file is missing
    const ok = await page.evaluate(async () => {
      const faces = ['700 20px Oswald', '18px Nunito', '20px "Permanent Marker"', '18px "Atkinson Hyperlegible"'];
      return Promise.all(faces.map(async f => (await document.fonts.load(f)).length > 0));
    });
    assert.deepEqual(ok, [true, true, true, true]);
  }));

test('age gate shows on a first visit and cannot be dismissed with Escape', opts, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(PAGE);
    assert.equal(await page.evaluate(() => document.getElementById('ageGate').open), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('ageGate').open), true);
    await page.click('#ageYes');
    assert.equal(await page.evaluate(() => document.getElementById('ageGate').open), false);
  } finally { await browser.close(); }
});

test('save produces a PNG and Escape returns focus', opts, () =>
  withPage(1280, async page => {
    await page.fill('#name', 'Test');
    await page.click('.scale button:nth-child(5)');
    await page.click('#save');
    await page.waitForSelector('#modal[open]');
    assert.ok(await page.evaluate(() => document.getElementById('modalImg').naturalWidth) > 1000);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'save');
  }));
