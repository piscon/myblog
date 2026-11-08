// 截图：文章尾部与搜索页顶部（分隔线收敛后视觉确认）
import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';
const base = 'http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=7';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 425, height: 754 } });
await page.goto(base + '#/posts/zz-s03', { waitUntil: 'load' });
await page.waitForTimeout(400);
await page.locator('.article-tags').scrollIntoViewIfNeeded();
await page.screenshot({ path: '/home/piscon/codespace/myblog/.zcode/audit/shot-article-tail.png' });
await page.evaluate(() => { location.hash = '#/search'; });
await page.waitForTimeout(300);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: '/home/piscon/codespace/myblog/.zcode/audit/shot-search-top.png' });
await browser.close();
console.log('done');
