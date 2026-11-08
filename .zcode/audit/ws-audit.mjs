import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');

const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';

const VIEWS = {
  home: '#/',
  posts: '#/posts',
  article: '#/posts/zz-s03',
  archives: '#/archives',
  search: '#/search',
  about: '#/about',
  tag: '#/tags',
  guestbook: '#/guestbook',
  notfound: '#/nope-404',
};

const BANDS = {
  home: [
    { sel: '.masthead-line' },
    { sel: '.hero' },
    { sel: '.recent > .section-head' },
    { sel: '.recent-grid' },
    { sel: '.ledger > .section-head' },
    { sel: '.ledger-list' },
    { sel: '.site-foot' },
  ],
  posts: [
    { sel: '.page-head > .kicker' },
    { sel: '.page-head > .page-title' },
    { sel: '.page-head > .page-deck' },
    { sel: '.filters' },
    { sel: '#list-groups > .year-group' },
    { sel: '.list-foot' },
    { sel: '.site-foot' },
  ],
  article: [
    { sel: '.article-kicker' },
    { sel: '.article-title' },
    { sel: '.article-deck' },
    { sel: '.toc-inline' },
    { sel: '.article-cover' },
    { sel: '.article-body', child: true },
    { sel: '.article-tags' },
    { sel: '.share-row' },
    { sel: '.pager' },
    { sel: '.related' },
    { sel: '.comments' },
    { sel: '.site-foot' },
  ],
  archives: [
    { sel: '.page-head > .kicker' },
    { sel: '.page-head > .page-title' },
    { sel: '.page-head > .page-deck' },
    { sel: '#archives-groups > .year-group' },
    { sel: '.list-foot' },
    { sel: '.site-foot' },
  ],
  search: [
    { sel: '.search-head > .kicker' },
    { sel: '.search-head > .page-title' },
    { sel: '.search-form' },
    { sel: '.search-meta' },
    { sel: '.filters' },
    { sel: '.search-results' },
    { sel: '.tag-hub' },
    { sel: '.site-foot' },
  ],
  about: [
    { sel: '.page-head > .kicker' },
    { sel: '.page-head > .page-title' },
    { sel: '.about-grid' },
    { sel: '.site-foot' },
  ],
  tag: [
    { sel: '.page-head > .kicker' },
    { sel: '.page-head > .page-title' },
    { sel: '.page-head > .term-note' },
    { sel: '.term-index-cloud' },
    { sel: '.site-foot' },
  ],
  guestbook: [
    { sel: '.page-head > .kicker' },
    { sel: '.page-head > .page-title' },
    { sel: '.guestbook-intro' },
    { sel: '.comments' },
    { sel: '.site-foot' },
  ],
  notfound: [
    { sel: '.notfound-code' },
    { sel: '.notfound-msg' },
    { sel: '.notfound-actions' },
    { sel: '.notfound-recent' },
    { sel: '.site-foot' },
  ],
};

const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1024, h: 800 },
  { w: 860, h: 800 },
  { w: 768, h: 900 },
  { w: 390, h: 844 },
  { w: 320, h: 700 },
];

const KILL_ANIM = `*,*::before,*::after{animation:none!important;transition:none!important}
.reveal{opacity:1!important;transform:none!important}`;

function pageFn(arg) {
  const { groups } = arg;
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && cs.position !== 'fixed';
  };
  const label = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28);
    return { s, t };
  };
  const inkOf = (root) => {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    const add = (rr) => {
      if (rr.width < 1 || rr.height < 1) return;
      l = Math.min(l, rr.left); t = Math.min(t, rr.top);
      r = Math.max(r, rr.right); b = Math.max(b, rr.bottom);
    };
    const walk = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (el.tagName === 'IMG' || el.tagName === 'SVG' || el.tagName === 'CANVAS' || el.tagName === 'INPUT' || el.tagName === 'HR' || el.tagName === 'BUTTON' || el.tagName === 'AUDIO' || el.tagName === 'VIDEO' || el.tagName === 'TABLE') {
        add(el.getBoundingClientRect());
        if (el.tagName !== 'TABLE') return;
      }
      const kids = [...el.children];
      const blockKids = kids.filter((k) => {
        const kc = getComputedStyle(k);
        return kc.display !== 'none' && kc.display !== 'inline' && kc.display !== 'inline-block' && kc.display !== 'contents';
      });
      // direct text nodes
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          const rg = document.createRange();
          rg.selectNodeContents(n);
          for (const rr of rg.getClientRects()) add(rr);
        }
      }
      if (el.tagName !== 'TABLE') for (const k of (blockKids.length ? blockKids : kids)) walk(k);
    };
    const box = root.getBoundingClientRect();
    walk(root);
    if (l === Infinity) return { it: box.top, ib: box.bottom, il: box.left, ir: box.right };
    // clip to the band's own box (ignore absolutely-positioned strays)
    return {
      it: +Math.max(t, box.top).toFixed(1), ib: +Math.min(b, box.bottom).toFixed(1),
      il: +Math.max(l, box.left).toFixed(1), ir: +Math.min(r, box.right).toFixed(1),
    };
  };

  const bands = [];
  for (const g of groups) {
    let els;
    if (g.child) {
      const root = document.querySelector(g.sel);
      els = root ? [...root.children] : [];
    } else {
      els = [...document.querySelectorAll(g.sel)];
    }
    for (const el of els) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const L = label(el);
      const ink = inkOf(el);
      bands.push({
        s: L.s, t: L.t,
        top: +(r.top + scrollY).toFixed(1),
        bottom: +(r.bottom + scrollY).toFixed(1),
        it: +(ink.it + scrollY).toFixed(1),
        ib: +(ink.ib + scrollY).toFixed(1),
        il: ink.il, ir: ink.ir,
        h: +r.height.toFixed(1),
        left: +r.left.toFixed(1),
        right: +r.right.toFixed(1),
        w: +r.width.toFixed(1),
        mt: cs.marginTop, mb: cs.marginBottom,
        pt: cs.paddingTop, pb: cs.paddingBottom,
        fs: cs.fontSize, lh: cs.lineHeight,
      });
    }
  }
  bands.sort((a, b) => a.top - b.top);
  const gaps = [];
  for (let i = 1; i < bands.length; i++) {
    const prev = bands[i - 1], cur = bands[i];
    const g = +(cur.it - prev.ib).toFixed(1);
    const gb = +(cur.top - prev.bottom).toFixed(1);
    gaps.push({ from: prev.s, to: cur.s, gap: g, boxGap: gb, overlap: g < -0.5 });
  }
  // spacing inventory: distinct margin/padding values actually in use
  const inv = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    for (const p of ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom']) {
      const v = cs[p];
      if (v === '0px') continue;
      inv.set(v, (inv.get(v) || 0) + 1);
    }
  }
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el || !vis(el)) return null;
    const r = el.getBoundingClientRect();
    return { l: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +r.width.toFixed(1) };
  };
  return {
    bands, gaps,
    scrollH: document.documentElement.scrollHeight,
    scrollW: document.documentElement.scrollWidth,
    vw: innerWidth,
    header: box('.site-head'),
    headerInner: box('.head-inner'),
    wrap: box('#main .view:not([hidden]) .wrap'),
    measure: box('#main .view:not([hidden]) .article-body, #main .view:not([hidden]) .article-head'),
    cover: box('.article-cover'),
    figcap: box('.article-cover .figcap'),
    title: box('.article-title'),
    inventory: [...inv.entries()].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])),
  };
}

const browser = await chromium.launch({ executablePath: '/home/piscon/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
const out = { generated: new Date().toISOString(), views: {} };

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [name, hash] of Object.entries(VIEWS)) {
    await page.goto(BASE + hash, { waitUntil: 'load', timeout: 30000 });
    await page.addStyleTag({ content: KILL_ANIM });
    await page.waitForTimeout(name === 'article' ? 450 : 250);
    const data = await page.evaluate(pageFn, { groups: BANDS[name] });
    out.views[`${name}@${vp.w}`] = data;
    if ([1440, 768, 390, 320].includes(vp.w) && ['home', 'posts', 'article', 'search', 'about', 'archives', 'guestbook', 'notfound', 'tag'].includes(name)) {
      await page.screenshot({ path: `.zcode/audit/ws/${name}-${vp.w}.png`, fullPage: true });
    }
  }
  await ctx.close();
}
await browser.close();
const fs = await import('node:fs');
fs.mkdirSync('.zcode/audit/ws', { recursive: true });
fs.writeFileSync('.zcode/audit/ws.json', JSON.stringify(out, null, 1));
console.log('ok', Object.keys(out.views).length, 'samples');
