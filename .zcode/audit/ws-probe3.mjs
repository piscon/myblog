import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const KILL = `*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}`;
const b = await chromium.launch({ args: ['--no-sandbox'] });
const probe = async (hash, w, sel, label) => {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + hash, { waitUntil: 'load' });
  await p.addStyleTag({ content: KILL });
  await p.waitForTimeout(500);
  const out = await p.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)];
    return els.slice(0, 4).map(el => {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 24), top: +r.top.toFixed(1), h: +r.height.toFixed(1), w: +r.width.toFixed(1), mt: cs.marginTop, mb: cs.marginBottom, fs: cs.fontSize, lh: cs.lineHeight };
    });
  }, sel);
  console.log(label, w, JSON.stringify(out));
  await ctx.close();
};
await probe('#/posts/zz-s05', 1440, '.article-body pre, .article-body .code-block, .article-body h2', 'code');
await probe('#/posts/zz-s05', 1440, '.article-body figure', 'fig');
// hero internals
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE, { waitUntil: 'load' });
await p.addStyleTag({ content: KILL });
await p.waitForTimeout(400);
const hero = await p.evaluate(() => {
  const g = (s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return [+r.top.toFixed(1), +r.bottom.toFixed(1)]; };
  return { title: g('.hero-title'), deck: g('.hero-deck'), actions: g('.hero-actions'), byline: g('.hero-byline'), fig: g('.hero-figure img'), cap: g('.hero-figure .figcap'), eyebrow: g('.eyebrow') };
});
console.log('hero', JSON.stringify(hero));
const heads = await p.evaluate(() => {
  const out = [];
  for (const h of document.querySelectorAll('h1,h2,h3,h4')) {
    const cs = getComputedStyle(h); const r = h.getBoundingClientRect();
    out.push([h.tagName, +(r.top).toFixed(0), +r.height.toFixed(1), cs.fontSize, cs.marginTop, cs.marginBottom, h.textContent.trim().slice(0, 14)]);
  }
  return out.slice(0, 12);
});
console.log('heads', JSON.stringify(heads));
await ctx.close();
await b.close();
