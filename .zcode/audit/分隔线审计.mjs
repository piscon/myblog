// 分隔线审计：逐视图列出 main 内容区里实际渲染的横向分隔线（排除行内链接下划线、
// 小于半栏宽的元素边线），并报告 48px 内相贴的线对。用法：
//   NODE_PATH=/tmp/pw-audit/node_modules node 分隔线审计.mjs [baseURL]
import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';

const base = process.argv[2] || 'http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=7';
const routes = ['/', '/posts', '/posts/zz-s03', '/archives', '/search', '/about', '/guestbook', '/tags', '/tags/hugo', '/categories', '/nope-404'];

const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 425, height: 754 } });
await page.goto(base + '#/', { waitUntil: 'load' });
await page.waitForTimeout(400);

const AUDIT = `(() => {
  const main = document.querySelector('main');
  const wrap = main.querySelector('.view:not([hidden]) .wrap') || main;
  const colW = wrap.getBoundingClientRect().width;
  const lines = [];
  for (const el of main.querySelectorAll('.view:not([hidden]) *')) {
    const cs = getComputedStyle(el);
    if (el.matches('kbd,sup') || el.closest('kbd,sup') || (el.closest('a,button') && cs.display === 'inline')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < Math.max(180, colW * 0.5) || r.height === 0) continue;
    [['top', cs.borderTopWidth, cs.borderTopColor, r.top], ['bottom', cs.borderBottomWidth, cs.borderBottomColor, r.bottom]].forEach(([side, w, c, y]) => {
      if (parseFloat(w) < 0.5) return;
      if (!/rgba?\\(\\s*\\d+[,\\s]/.test(c || '')) return;
      const am = (c || '').match(/,\\s*([\\d.]+)\\s*\\)/);
      if (am && parseFloat(am[1]) === 0) return;
      lines.push({ y: Math.round(y), side, el: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : '') });
    });
  }
  main.querySelectorAll('.view:not([hidden]) hr').forEach(h => { const r = h.getBoundingClientRect(); if (r.width > 100) lines.push({ y: Math.round(r.top), side: 'hr', el: 'hr' }); });
  lines.sort((a, b) => a.y - b.y);
  const dedup = []; const seen = new Set();
  for (const l of lines) { const k = l.y + l.el; if (!seen.has(k)) { seen.add(k); dedup.push(l); } }
  const pairs = [];
  for (let i = 1; i < dedup.length; i++) { const d = dedup[i].y - dedup[i - 1].y; if (d <= 48) pairs.push(dedup[i - 1].el + '.' + dedup[i - 1].side + ' <-> ' + dedup[i].el + '.' + dedup[i].side + ' d=' + d); }
  return { n: dedup.length, lines: dedup.map(l => l.y + ' ' + l.el + '.' + l.side), pairs };
})()`;

for (const r of routes) {
  await page.evaluate(h => { location.hash = h; }, '#' + r);
  await page.waitForTimeout(300);
  const res = await page.evaluate(AUDIT);
  console.log('=== ' + r + '  lines=' + res.n);
  console.log('   ' + res.lines.join(' | '));
  if (res.pairs.length) console.log('   PAIRS: ' + res.pairs.join(' ; '));
}
await browser.close();
