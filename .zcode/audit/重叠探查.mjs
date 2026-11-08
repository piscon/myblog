// 探查两处重叠的涉事元素：zz-s02 文内锚链接 vs 标题；about 390px 联系链接
import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });

const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
await page.goto('http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=7#/posts/zz-s02', { waitUntil: 'load' });
await page.waitForTimeout(400);
const probe1 = await page.evaluate(`(() => {
  const out = [];
  const view = document.querySelector('.view:not([hidden])');
  const leaves = [...view.querySelectorAll('*')].filter(e => !e.querySelector('*') && (e.textContent||'').trim());
  for (let i = 0; i < leaves.length; i++) for (let j = i+1; j < leaves.length; j++) {
    const a = leaves[i], b = leaves[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 4 && oy > 4) {
      const info = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
        return e.tagName + '.' + e.className + ' pos=' + cs.position + ' disp=' + cs.display + ' rect=' + [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join(',') + ' html=' + e.outerHTML.slice(0, 160); };
      const pa = a.closest('nav,details,aside,div') ? a.closest('nav,details,aside,div').className : '';
      out.push({ a: info(a), b: info(b), aParent: pa });
    }
  }
  return out;
})()`);
console.log('zz-s02 390px overlaps:');
probe1.forEach(o => console.log('  A: ' + o.a + '\\n  (parent: ' + o.aParent + ')\\n  B: ' + o.b + '\\n'));

await page.evaluate(() => { location.hash = '#/about'; });
await page.waitForTimeout(300);
const probe2 = await page.evaluate(`(() => {
  const out = [];
  const view = document.querySelector('.view:not([hidden])');
  const leaves = [...view.querySelectorAll('a')].filter(e => (e.textContent||'').trim());
  for (let i = 0; i < leaves.length; i++) for (let j = i+1; j < leaves.length; j++) {
    const a = leaves[i], b = leaves[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 4 && oy > 4) {
      const info = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
        return e.tagName + '.' + e.className + ' pos=' + cs.position + ' disp=' + cs.display + ' rect=' + [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join(',') + ' text=' + e.textContent.trim().slice(0,20); };
      out.push({ a: info(a), b: info(b) });
    }
  }
  // 顺带列出 about-side 侧栏结构
  const side = view.querySelector('.about-side');
  const sideInfo = side ? side.innerHTML.replace(/\\s+/g, ' ').slice(0, 400) : 'NO .about-side';
  return { out, sideInfo };
})()`);
console.log('about 390px link overlaps:');
probe2.out.forEach(o => console.log('  A: ' + o.a + '\\n  B: ' + o.b + '\\n'));
console.log('about-side html: ' + probe2.sideInfo);
await browser.close();
