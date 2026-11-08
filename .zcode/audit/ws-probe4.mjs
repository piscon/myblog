import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const KILL = `*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}`;
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (const w of [390, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  await p.addStyleTag({ content: KILL });
  await p.waitForTimeout(400);
  const o = await p.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { t: +r.top.toFixed(1), b: +r.bottom.toFixed(1), h: +r.height.toFixed(1), pt: cs.paddingTop, mt: cs.marginTop }; };
    return { hero: g('.hero'), text: g('.hero-text'), byline: g('.hero-byline'), actions: g('.hero-actions'), fig: g('.hero-figure'), img: g('.hero-figure img'), cap: g('.hero-figure .figcap'), mast: g('.masthead-line'), recent: g('.recent'), shead: g('.recent > .section-head') };
  });
  console.log(w, JSON.stringify(o, null, 0));
  await ctx.close();
}
await b.close();
