// 空元素与元素错位审计：4 视口 × 主要路由。
// 检查项：
//   1) rawTokens   — 渲染成文本的裸 i18n 键（snake_case）
//   2) emptyLeaf   — 可见但零文本、零媒体的叶子元素
//   3) overflowX   — 超出视口左右缘的元素（横向溢出/错位）
//   4) caption     — figcaption 与所在 figure 图片的几何关系（应在图下方、左右对齐、非空）
//   5) overlap     — 无父子关系的叶子文本元素互相重叠
import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';

const base = (process.argv[2] || 'http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=7').replace('#/$', '');
const routes = ['/', '/posts', '/posts/zz-s03', '/posts/zz-s02', '/posts/zz-s04', '/archives', '/search', '/about', '/guestbook', '/tags/hugo', '/nope-404'];
const viewports = [[390, 760], [768, 900], [1220, 900], [1440, 900]];

const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });

const AUDIT = `(() => {
  const vw = window.innerWidth;
  const view = document.querySelector('.view:not([hidden])') || document.body;
  const out = { rawTokens: [], emptyLeaf: [], overflowX: [], caption: [], overlap: [] };
  const leaves = [];
  const all = view.querySelectorAll('*');
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const isLeaf = !el.querySelector('*');
    const hasMedia = el.matches('img,audio,video,canvas,svg,iframe') || (isLeaf && false);
    // 1) 裸 i18n 键
    if (isLeaf && /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test((el.textContent || '').trim())) {
      out.rawTokens.push(el.tagName.toLowerCase() + '.' + (el.className || '') + ' "' + el.textContent.trim() + '"');
    }
    // 2) 空叶子（无文本无媒体）
    if (isLeaf && !hasMedia && !(el.textContent || '').trim() && el.tagName !== 'BR' && !el.matches('img,audio,video,canvas,svg,iframe,input,kbd')) {
      out.emptyLeaf.push(el.tagName.toLowerCase() + '.' + (el.className || '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    // 3) 横向溢出（文本或媒体承载元素）
    if ((el.matches('p,h1,h2,h3,h4,li,blockquote,figcaption,img,audio,video,pre,code') || (isLeaf && (el.textContent || '').trim())) && (r.right > vw + 1 || r.left < -1)) {
      out.overflowX.push(el.tagName.toLowerCase() + '.' + (el.className || '') + ' left=' + Math.round(r.left) + ' right=' + Math.round(r.right) + ' vw=' + vw);
    }
    if (isLeaf && ((el.textContent || '').trim() || el.matches('img'))) leaves.push(el);
  }
  // 4) figcaption 几何
  view.querySelectorAll('figure').forEach(fig => {
    const img = fig.querySelector('img');
    const cap = fig.querySelector('figcaption');
    if (!img || !cap) return;
    const ir = img.getBoundingClientRect(), cr = cap.getBoundingClientRect();
    const bad = [];
    if (!cap.textContent.trim()) bad.push('empty');
    if (cr.top < ir.bottom - 2) bad.push('overlaps-image');
    if (cr.left < ir.left - 4) bad.push('left-of-image');
    if (cr.right > ir.right + 4) bad.push('right-of-image');
    if (bad.length) out.caption.push((fig.className || 'figure') + ': ' + bad.join(',') + ' (cap.left=' + Math.round(cr.left) + ' img.left=' + Math.round(ir.left) + ')');
  });
  // 5) 叶子文本重叠（无父子关系，重叠区 > 4x4）
  const texts = leaves.filter(e => (e.textContent || '').trim() && !e.matches('img'));
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 4 && oy > 4) {
      out.overlap.push(a.tagName.toLowerCase() + '."' + a.textContent.trim().slice(0, 10) + '" x ' + b.tagName.toLowerCase() + '."' + b.textContent.trim().slice(0, 10) + '" ' + Math.round(ox) + 'x' + Math.round(oy));
      if (out.overlap.length > 15) return out;
    }
  }
  return out;
})()`;

let issues = 0;
for (const [w, h] of viewports) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(base + '#/', { waitUntil: 'load' });
  await page.waitForTimeout(350);
  for (const r of routes) {
    await page.evaluate(x => { location.hash = x; }, '#' + r);
    await page.waitForTimeout(280);
    const res = await page.evaluate(AUDIT);
    const keys = Object.keys(res).filter(k => res[k].length);
    if (keys.length) {
      issues++;
      console.log('=== ' + w + 'px #' + r);
      for (const k of keys) console.log('  [' + k + '] ' + res[k].join(' ; '));
    }
  }
  await page.close();
}
await browser.close();
console.log(issues === 0 ? 'ALL CLEAN' : 'total flagged route-views: ' + issues);
