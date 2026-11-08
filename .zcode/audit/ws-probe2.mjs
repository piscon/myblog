import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const KILL = `*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}`;
const b = await chromium.launch({ args: ['--no-sandbox'] });

const cases = [
  ['#/posts/zz-s03', '.giscus-shell', 'article tail'],
  ['#/search', '.tag-hub', 'search tail'],
  ['#/guestbook', '.giscus-shell', 'guestbook tail'],
  ['#/', '.recent-lead img', 'recent lead img'],
  ['#/posts/zz-s03', 'figure.media-embed', 'audio figure'],
];
for (const [hash, sel, label] of cases) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-60)); });
  await p.goto(BASE + hash, { waitUntil: 'load' });
  await p.addStyleTag({ content: KILL });
  await p.waitForTimeout(500);
  const out = await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    const foot = document.querySelector('.site-foot');
    const r = el.getBoundingClientRect(), f = foot.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const extra = {};
    if (el.tagName === 'IMG') extra.complete = el.complete, extra.naturalW = el.naturalWidth, extra.src = el.getAttribute('src');
    if (el.tagName === 'FIGURE') {
      extra.kids = [...el.children].map(k => { const rr = k.getBoundingClientRect(); return [k.tagName, +rr.top.toFixed(1), +rr.bottom.toFixed(1)]; });
    }
    return { tag: el.tagName, top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), mt: cs.marginTop, mb: cs.marginBottom, footTop: +f.top.toFixed(1), gapToFoot: +(f.top - r.bottom).toFixed(1), extra };
  }, sel);
  console.log(label, sel, JSON.stringify(out), errs.length ? 'HTTPERR ' + errs.join(' | ') : '');
  await ctx.close();
}
await b.close();
