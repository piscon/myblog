import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE + '#/posts/zz-s03', { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(300);
const out = await p.evaluate(() => {
  const res = [];
  for (const y of [706, 707, 708, 709]) {
    res.push([y, document.elementsFromPoint(700, y).slice(0, 5).map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.slice(0, 24) : ''))]);
  }
  // any element with accent-colored 2px border/shadow near the footer?
  const all = [...document.querySelectorAll('body *')];
  const suspect = all.filter(e => {
    const cs = getComputedStyle(e);
    return cs.borderTopWidth === '2px' && cs.borderTopColor === 'rgb(138, 93, 21)';
  }).map(e => [e.tagName, e.className, e.getBoundingClientRect().top + scrollY, e.getBoundingClientRect().width]);
  return { res, suspect };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
