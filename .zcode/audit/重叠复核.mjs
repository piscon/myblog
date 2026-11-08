// 复核：注入动画清除样式后重查 zz-s02 / about 的重叠是否仍存在
import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const KILL = `*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}`;

const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
await page.goto('http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=7#/posts/zz-s02', { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.addStyleTag({ content: KILL });
await page.waitForTimeout(200);

const CHECK = `(() => {
  const view = document.querySelector('.view:not([hidden])');
  const leaves = [...view.querySelectorAll('*')].filter(e => !e.querySelector('*') && (e.textContent||'').trim());
  const out = [];
  for (let i = 0; i < leaves.length; i++) for (let j = i+1; j < leaves.length; j++) {
    const a = leaves[i], b = leaves[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 4 && oy > 4) out.push(a.textContent.trim().slice(0,12) + ' x ' + b.textContent.trim().slice(0,12) + ' ' + Math.round(ox) + 'x' + Math.round(oy));
  }
  return out;
})()`;

console.log('zz-s02 390 settled+kill-anim: ' + JSON.stringify(await page.evaluate(CHECK)));
await page.evaluate(() => { location.hash = '#/about'; });
await page.waitForTimeout(1200);
await page.addStyleTag({ content: KILL });
await page.waitForTimeout(200);
console.log('about 390 settled+kill-anim: ' + JSON.stringify(await page.evaluate(CHECK)));
await browser.close();
