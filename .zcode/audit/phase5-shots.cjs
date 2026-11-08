const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8129/zh/404.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/home/piscon/codespace/myblog/.zcode/audit/phase5-shots/404-zh.png', fullPage: true });
  const dark = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const p2 = await dark.newPage();
  await p2.goto('http://127.0.0.1:8129/zh/404.html', { waitUntil: 'networkidle' });
  await p2.screenshot({ path: '/home/piscon/codespace/myblog/.zcode/audit/phase5-shots/404-zh-dark.png', fullPage: false });
  await browser.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
