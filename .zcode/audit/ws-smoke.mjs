import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const errors = [];
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 120)));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120)); });

const vis = (s) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), d: cs.display }; }, s);

// 1. home loads, lead image ok
await p.goto(BASE + '#/', { waitUntil: 'load' });
await p.waitForTimeout(350);
const img = await p.evaluate(() => { const i = document.querySelector('.recent-lead img'); return i ? [i.naturalWidth, i.complete] : null; });
console.log('lead img', img);

// 2. posts: filter interaction
await p.evaluate(() => { location.hash = '#/posts'; });
await p.waitForTimeout(300);
const before = await vis('#list-groups .year-group');
await p.click('#list-filters button:nth-child(2)');
await p.waitForTimeout(250);
const after = await vis('#list-groups .year-group');
const filterState = await p.evaluate(() => [...document.querySelectorAll('#list-filters button')].map(b => b.getAttribute('aria-pressed')));
console.log('posts filter', JSON.stringify({ before, after, filterState }));

// 3. search: type and results appear
await p.evaluate(() => { location.hash = '#/search'; });
await p.waitForTimeout(250);
await p.fill('#q', '钢琴');
await p.waitForTimeout(350);
const res = await p.evaluate(() => document.querySelectorAll('#search-results .result-row').length);
console.log('search results', res);

// 4. article: toc inline present at 900px? (toc-float at >=1200). check readbar updates on scroll
await p.evaluate(() => { location.hash = '#/posts/zz-s03'; });
await p.waitForTimeout(300);
await p.evaluate(() => scrollTo(0, 800));
await p.waitForTimeout(250);
const rb = await p.evaluate(() => { const r = document.getElementById('readbar').getBoundingClientRect(); return [r.width > 0, Math.round(r.width)]; });
// 5. theme toggle
const themeBefore = await p.evaluate(() => document.documentElement.dataset.theme || '');
await p.click('.theme-btn');
await p.waitForTimeout(150);
const themeAfter = await p.evaluate(() => document.documentElement.dataset.theme || '');
console.log('readbar/theme', JSON.stringify({ rb, themeBefore, themeAfter }));

// 6. lang menu + mobile menu at 390
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(200);
await p.click('.menu-btn');
await p.waitForTimeout(150);
const mm = await p.evaluate(() => { const m = document.getElementById('mobile-menu'); return [!m.hidden, getComputedStyle(m).display]; });
await p.click('.lang-btn');
await p.waitForTimeout(150);
const lm = await p.evaluate(() => { const m = document.getElementById('lang-menu'); return [!m.hidden]; });
console.log('mobile menus', JSON.stringify({ mm, lm }));

// 7. lightbox on article image
await p.setViewportSize({ width: 1440, height: 900 });
await p.evaluate(() => { location.hash = '#/posts/zz-s03'; });
await p.waitForTimeout(300);
await p.evaluate(() => scrollTo(0, 400));
await p.click('.article-cover img');
await p.waitForTimeout(250);
const lb = await p.evaluate(() => { const l = document.getElementById('lightbox'); return [!l.hidden, !!document.getElementById('lb-img').src]; });
await p.click('#lb-close');
console.log('lightbox', lb);

console.log('errors:', errors.length ? errors : 'none');
await b.close();
