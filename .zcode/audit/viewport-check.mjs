// 视口走查：390 / 768 / 1440 / 1600，几何 + 截图
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');

const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const OUT = '/home/piscon/codespace/myblog/.zcode/audit';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: '/home/piscon/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

const plan = [
  { w: 1440, h: 900, routes: [
    ['home', '', 'p1440v2-home'],
    ['article zz-s02 wide', '#/posts/zz-s02', 'p1440v2-s02'],
    ['article zz-s03 toc-float', '#/posts/zz-s03', 'p1440v2-s03'],
    ['search', '#/search', 'p1440v2-search'],
    ['posts', '#/posts', 'p1440v2-posts'],
  ]},
  { w: 768, h: 900, routes: [
    ['home', '', 'p768v2-home'],
    ['article', '#/posts/zz-s02', 'p768v2-s02'],
  ]},
  { w: 390, h: 844, routes: [
    ['home', '', 'p390v2-home'],
    ['article', '#/posts/zz-s02', 'p390v2-s02'],
    ['ja article', '#/ja/posts/zz-s03', 'p390v2-ja'],
    ['404', '#/xyz', 'p390v2-404'],
  ]},
];

const report = [];
for (const vp of plan) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  for (const [name, hash, shot] of vp.routes) {
    await page.goto(BASE + '?v=5' + hash, { waitUntil: 'load' });
    await wait(500);
    if (hash.includes('zz-s02')) { await page.mouse.wheel(0, 2400); await wait(400); }
    if (hash.includes('zz-s03')) { await page.mouse.wheel(0, 3000); await wait(400); }
    const m = await page.evaluate(() => {
      const r = { overflowX: document.documentElement.scrollWidth - window.innerWidth };
      const wide = document.querySelector('.fig--wide');
      if (wide) {
        const b = wide.getBoundingClientRect();
        const body = document.getElementById('art-body').getBoundingClientRect();
        r.wide = { x: Math.round(b.x), w: Math.round(b.width), bodyX: Math.round(body.x), bodyW: Math.round(body.width) };
      }
      const tf = document.getElementById('toc-float');
      if (tf) r.tocFloat = { display: getComputedStyle(tf).display, hidden: tf.hidden };
      const lb = document.getElementById('lightbox');
      if (lb) r.lb = getComputedStyle(lb).position;
      const media = document.querySelector('.media-embed audio');
      if (media) r.audioVisible = media.getBoundingClientRect().width > 0;
      const menu = document.querySelector('.menu-btn');
      if (menu) r.menuBtn = getComputedStyle(menu).display;
      return r;
    });
    await page.screenshot({ path: `${OUT}/${shot}.png` });
    report.push({ vp: vp.w, name, ...m });
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
