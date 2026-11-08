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
  const g = (el, ps) => {
    const cs = getComputedStyle(el, ps);
    return { content: cs.content, bg: cs.backgroundColor, w: cs.width, h: cs.height, pos: cs.position, top: cs.top, left: cs.left, bottom: cs.bottom, disp: cs.display, pe: cs.pointerEvents, z: cs.zIndex };
  };
  const cands = [];
  for (const sel of ['html', 'body', 'main', '.view:not([hidden])', 'article', '.article-foot', '.comments', 'footer.site-foot', '.wrap', '.foot-grid']) {
    const el = document.querySelector(sel);
    if (!el) continue;
    cands.push([sel, '::before', g(el, '::before')]);
    cands.push([sel, '::after', g(el, '::after')]);
  }
  // any element with pointer-events:none
  const pe = [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).pointerEvents === 'none').map(e => e.tagName + '.' + (e.className || ''));
  return { cands, pe };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
