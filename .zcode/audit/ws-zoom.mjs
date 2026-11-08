import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(BASE + '#/posts/zz-s03', { waitUntil: 'load' });
await p.waitForTimeout(500);
const info = await p.evaluate(() => {
  const foot = document.querySelector('.site-foot');
  const rb = document.getElementById('readbar');
  const cs = getComputedStyle(foot);
  const r = rb.getBoundingClientRect();
  return {
    footBorder: cs.borderTop, footTop: foot.getBoundingClientRect().top + scrollY,
    readbar: { hidden: rb.hidden, rect: [r.x, r.y, r.width, r.height], bg: getComputedStyle(rb).backgroundColor, op: getComputedStyle(rb).opacity },
  };
});
console.log(JSON.stringify(info));
await p.evaluate(() => scrollTo(0, 5100));
await p.waitForTimeout(200);
await p.screenshot({ path: '.zcode/audit/ws/zoom-footer-rule.png', clip: { x: 0, y: 400, width: 720, height: 140 } });
await b.close();
