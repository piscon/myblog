import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const URL = 'http://127.0.0.1:8123/%E7%95%99%E7%99%BD%E5%AE%A1%E8%AE%A1-%E6%8A%A5%E5%91%8A.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(300);
  const info = await p.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth, vw: innerWidth,
    scrollH: document.documentElement.scrollHeight,
    tables: [...document.querySelectorAll('table')].map(t => t.getBoundingClientRect().width),
  }));
  console.log(w, JSON.stringify(info), errs);
  await p.screenshot({ path: `.zcode/audit/ws/report-${w}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
