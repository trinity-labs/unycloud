// Run against a local test instance containing a PDF, never private user files.
// Requires playwright-core and a Chromium executable; PDF_TEST_URL is mandatory.
const { chromium } = require('playwright-core');
const { readFileSync, mkdirSync } = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  assert(process.env.PDF_TEST_URL, 'Set PDF_TEST_URL to a test PDF preview URL');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    for (const theme of ['light', 'dark', 'auto']) {
      for (const fontSize of [16, 20, 24]) {
        const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
        await page.addInitScript(t => localStorage.setItem('unycloudTheme', t), theme);
        await page.route('**/header-audit.css', route => route.fulfill({
          contentType: 'text/css',
          body: `${process.env.BRANDING_CSS ? readFileSync(process.env.BRANDING_CSS, 'utf8') : ''}\nhtml { font-size: ${fontSize}px; }`,
        }));
        await page.goto(process.env.PDF_TEST_URL);
        await page.waitForSelector('canvas');
        assert.equal((await page.locator('.pdf-zoom-value').textContent()).trim(), '100%');
        assert.equal(await page.evaluate(() => {
          const expected = document.documentElement.classList.contains('dark') ? '#0f1117' : '#fafafa';
          return [...document.querySelectorAll('meta[name="theme-color"]')].every(meta => meta.content === expected);
        }), true, 'app system-bar colors must match its surface');
        await page.evaluate(() => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = '/header-audit.css';
          document.head.append(link);
          return new Promise(resolve => { link.onload = resolve; });
        });
        // Resize the same live viewer in both directions, including the menu breakpoint.
        for (const width of [320, 349, 350, 355, 390, 560, 736, 737, 738, 800, 1024, 355]) {
          await page.setViewportSize({ width, height: 800 });
          await page.waitForTimeout(100);
          const failures = await page.evaluate(() => {
            const failures = [];
            const toolbar = document.querySelector('.pdf-toolbar');
            const title = document.querySelector('#previewer header > title').getBoundingClientRect();
            if (innerWidth <= 736 && Math.abs(title.x + title.width / 2 - innerWidth / 2) > 1) failures.push('title not centered');
            const controls = [...toolbar.children];
            const iconSize = parseFloat(getComputedStyle(toolbar.querySelector('i')).fontSize);
            if (iconSize !== (innerWidth < 350 ? 16 : 20)) failures.push('wrong toolbar icon size');
            const centers = controls.map(e => { const r = e.getBoundingClientRect(); return r.y + r.height / 2; });
            if (Math.max(...centers) - Math.min(...centers) > 1) failures.push('toolbar wrapped');
            const elements = [...controls, ...toolbar.querySelectorAll('i'),
              ...document.querySelectorAll('#previewer header > .action, #previewer header > .action i, #previewer header > .action svg, #previewer header #dropdown .action')];
            for (const e of elements) {
              const r = e.getBoundingClientRect();
              if (!r.width || !r.height) continue;
              if (r.left < -1 || r.right > innerWidth + 1) failures.push(`${e.textContent.trim()}: outside viewport ${r.left}..${r.right}`);
            }
            return failures;
          });
          assert.deepEqual(failures, [], `${theme}, font ${fontSize}, width ${width}`);
          console.log(`PASS ${theme} font=${fontSize} width=${width}`);
        }
        await page.locator('.pdf-toolbar button').nth(3).click();
        await page.waitForFunction(() => document.querySelector('.pdf-zoom-value').textContent.includes('125%'));
        for (let i = 0; i < 7; i++) await page.locator('.pdf-toolbar button').nth(3).click();
        await page.waitForFunction(() => document.querySelector('.pdf-zoom-value').textContent.includes('300%'));
        await page.locator('.pdf-toolbar button').nth(4).click();
        await page.locator('.pdf-toolbar button').last().click();
        await page.locator('#previewer header #more').click();
        await page.waitForSelector('#previewer #dropdown.active');
        await page.locator('#previewer header .overlay').click({ position: { x: 5, y: 500 } });
        await page.waitForTimeout(300);
        if (process.env.SCREENSHOT_DIR) {
          mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
          await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${theme}-${fontSize}.png` });
        }
        await page.locator('#previewer header > .action').first().click();
        await page.waitForSelector('#listing');
        for (const width of [320, 349, 350, 355, 390, 736, 737, 800]) {
          await page.setViewportSize({ width, height: 800 });
          await page.waitForTimeout(100);
          const overflow = await page.locator('header > .action').evaluateAll(es => es.filter(e => {
            const r = e.getBoundingClientRect();
            return r.width && (r.left < -1 || r.right > innerWidth + 1);
          }).map(e => e.textContent));
          assert.deepEqual(overflow, [], `listing ${theme} font=${fontSize} width=${width}`);
        }
        await page.close();
      }
    }
    for (const [width, hasTouch, expected] of [[1280, false, '75%'], [1024, true, '100%']]) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, hasTouch });
      await page.goto(process.env.PDF_TEST_URL);
      await page.waitForSelector('canvas');
      assert.equal((await page.locator('.pdf-zoom-value').textContent()).trim(), expected);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
