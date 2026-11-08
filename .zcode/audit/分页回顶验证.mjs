// 分页与回顶验证
import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
await page.goto('http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=9#/posts', { waitUntil: 'load' });
await page.waitForTimeout(800);

const q = s => page.evaluate(sel => [...document.querySelectorAll(sel)].map(e => e.textContent.trim()).join('|'), s);
const rows = () => page.evaluate(() => document.querySelectorAll('#list-groups .post-row').length);

console.log('P1 rows=' + await rows());
console.log('P1 pager: [' + await q('#list-pager a, #list-pager span') + '] hidden=' + await page.evaluate(() => document.getElementById('list-pager').hidden));
console.log('P1 title: ' + await page.title());

await page.click('#list-pager a[rel="next"]');
await page.waitForTimeout(400);
console.log('P2 hash=' + await page.evaluate(() => location.hash) + ' rows=' + await rows());
console.log('P2 pager: [' + await q('#list-pager a, #list-pager span') + ']');
console.log('P2 years: [' + await q('#list-groups .year-label') + '] title: ' + await page.title());

// 筛选：日常（5 篇 → 单页 → 分页条隐藏）
await page.click('#list-filters [data-cat="日常"]');
await page.waitForTimeout(400);
console.log('filter 日常: hash=' + await page.evaluate(() => location.hash) + ' rows=' + await rows() + ' pagerHidden=' + await page.evaluate(() => document.getElementById('list-pager').hidden));
// 回全部
await page.click('#list-filters [data-cat="全部"]');
await page.waitForTimeout(400);
console.log('back 全部: hash=' + await page.evaluate(() => location.hash) + ' rows=' + await rows() + ' pagerHidden=' + await page.evaluate(() => document.getElementById('list-pager').hidden));

// 页 2 直达 + 浏览器回退
await page.evaluate(() => { location.hash = '#/posts/page/2'; });
await page.waitForTimeout(350);
await page.goBack();
await page.waitForTimeout(350);
console.log('after goBack: hash=' + await page.evaluate(() => location.hash) + ' rows=' + await rows());

// ja 分页文案
await page.evaluate(() => { location.hash = '#/ja/posts'; });
await page.waitForTimeout(500);
await page.evaluate(() => { location.hash = '#/ja/posts/page/2'; });
await page.waitForTimeout(400);
console.log('ja P2 pager: [' + await q('#list-pager a, #list-pager span') + ']');

// 回顶按钮
await page.evaluate(() => { location.hash = '#/posts/zz-s03'; });
await page.waitForTimeout(600);
console.log('top-btn hidden at top: ' + await page.evaluate(() => document.getElementById('top-btn').hidden));
await page.evaluate(() => window.scrollTo(0, 3000));
await page.waitForTimeout(500);
console.log('top-btn after scroll: hidden=' + await page.evaluate(() => document.getElementById('top-btn').hidden) + ' aria=' + await page.evaluate(() => document.getElementById('top-btn').getAttribute('aria-label')));
await page.click('#top-btn');
await page.waitForTimeout(900);
console.log('after click: scrollY=' + await page.evaluate(() => Math.round(window.scrollY)) + ' hidden=' + await page.evaluate(() => document.getElementById('top-btn').hidden));
await browser.close();
