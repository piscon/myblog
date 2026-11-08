// 深挖：zz-s02 的 toc 覆盖正文 + about 390px 的链接互相覆盖
import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const KILL = `*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}`;

const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
await page.goto('http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=7#/posts/zz-s02', { waitUntil: 'load' });
await page.waitForTimeout(1000);
await page.addStyleTag({ content: KILL });
await page.waitForTimeout(150);

const P1 = `(() => {
  const d = document.querySelector('.toc-inline');
  const ol = d.querySelector('ol');
  const cs = getComputedStyle(ol);
  const h2 = document.querySelector('.article-body h2');
  return JSON.stringify({
    detailsOpen: d.open,
    olPos: cs.position, olDisp: cs.display, olRect: (r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)])(ol.getBoundingClientRect()),
    detailsRect: (r => [Math.round(r.top), Math.round(r.bottom)])(d.getBoundingClientRect()),
    h2Rect: (r => [Math.round(r.left), Math.round(r.top)])(h2.getBoundingClientRect()),
    articleBodyRect: (r => [Math.round(r.top)])(document.querySelector('.article-body').getBoundingClientRect()),
    viewScrollY: window.scrollY,
    // toc-inline 在 DOM 中的前后邻居
    prev: d.previousElementSibling ? d.previousElementSibling.className || d.previousElementSibling.tagName : null,
    next: d.nextElementSibling ? d.nextElementSibling.className || d.nextElementSibling.tagName : null
  });
})()`;
console.log('zz-s02 toc: ' + await page.evaluate(P1));

await page.evaluate(() => { location.hash = '#/about'; });
await page.waitForTimeout(1000);
await page.addStyleTag({ content: KILL });
await page.waitForTimeout(150);
const P2 = `(() => {
  const find = txt => [...document.querySelectorAll('.view:not([hidden]) a')].find(a => a.textContent.trim() === txt);
  const here = find('这里');
  const piscon = find('@piscon');
  const chain = e => { const out = []; let n = e; while (n && n !== document.body) { out.push(n.tagName + '.' + (typeof n.className === 'string' ? n.className : '')); n = n.parentElement; } return out.join(' < '); };
  const grid = document.querySelector('.about-grid');
  const side = document.querySelector('.about-side');
  return JSON.stringify({
    gridCols: getComputedStyle(grid).gridTemplateColumns,
    hereChain: here ? chain(here) : 'NOT FOUND',
    hereRect: here ? (r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)])(here.getBoundingClientRect()) : null,
    pisconChain: piscon ? chain(piscon) : 'NOT FOUND',
    pisconRect: piscon ? (r => [Math.round(r.left), Math.round(r.top)])(piscon.getBoundingClientRect()) : null,
    sidePos: getComputedStyle(side).position,
    sideRect: (r => [Math.round(r.top), Math.round(r.bottom)])(side.getBoundingClientRect()),
    mainRect: (r => [Math.round(r.top), Math.round(r.bottom)])(document.querySelector('.about-main').getBoundingClientRect())
  });
})()`;
console.log('about: ' + await page.evaluate(P2));
await browser.close();
