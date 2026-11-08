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
  const f = document.querySelector('.site-foot');
  const g = (pseudo) => {
    const cs = getComputedStyle(f, pseudo);
    return { content: cs.content, bg: cs.backgroundColor, h: cs.height, w: cs.width, pos: cs.position, top: cs.top, border: cs.borderTopWidth + ' ' + cs.borderTopColor, shadow: cs.boxShadow, display: cs.display };
  };
  const rb = document.getElementById('readbar');
  return { before: g('::before'), after: g('::after'), foot: g(null), rbStyle: rb.getAttribute('style'), rbRect: (() => { const r = rb.getBoundingClientRect(); return [r.top, r.left, r.width, r.height]; })() };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
