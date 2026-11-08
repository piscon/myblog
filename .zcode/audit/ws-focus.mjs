import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE + '#/posts/zz-s03', { waitUntil: 'load' });
await p.waitForTimeout(400);
const out = await p.evaluate(() => {
  const a = document.activeElement;
  const cs = getComputedStyle(a);
  const r = a.getBoundingClientRect();
  return {
    active: a.tagName + '#' + a.id + '.' + a.className,
    focusVisible: a.matches(':focus-visible'),
    outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor + ' offset ' + cs.outlineOffset,
    rect: [r.left, r.top, r.width, r.height],
  };
});
console.log(JSON.stringify(out));
await b.close();
