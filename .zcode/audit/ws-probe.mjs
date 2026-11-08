import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE + '#/posts/zz-s03', { waitUntil: 'load' });
await p.waitForTimeout(400);
const out = await p.evaluate(() => {
  const f = document.querySelector('figure.media-embed');
  const dump = (el, d = 0) => [...el.children].map(c => {
    const r = c.getBoundingClientRect();
    return { tag: c.tagName, cls: c.className, top: +r.top.toFixed(1), h: +r.height.toFixed(1), w: +r.width.toFixed(1), disp: getComputedStyle(c).display, kids: dump(c, d + 1) };
  });
  return { html: f.outerHTML.slice(0, 600), kids: dump(f) };
});
console.log(JSON.stringify(out, null, 1));
// also probe cover figcap alignment + toc overlap
const align = await p.evaluate(() => {
  const g = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +r.width.toFixed(1), t: +r.top.toFixed(1) }; };
  const toc = document.querySelector('.toc-float');
  return {
    figcapText: g('.article-cover .figcap'), cover: g('.article-cover'), body: g('.article-body'),
    toc: toc ? { ...g('.toc-float'), disp: getComputedStyle(toc).display, hidden: toc.hidden } : null,
    h1: g('.article-title'),
  };
});
console.log(JSON.stringify(align, null, 1));
await b.close();
