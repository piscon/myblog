import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(BASE + '#/posts/zz-s03', { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(400);
await p.screenshot({ path: '.zcode/audit/ws/viewport-bottom.png' });
const info = await p.evaluate(() => {
  const f = document.querySelector('.site-foot').getBoundingClientRect();
  const rb = document.getElementById('readbar').getBoundingClientRect();
  return { scrollY, foot: [f.top, f.height], readbar: [rb.top, rb.width, rb.height], footBorder: getComputedStyle(document.querySelector('.site-foot')).borderTop };
});
console.log(JSON.stringify(info));
await b.close();
