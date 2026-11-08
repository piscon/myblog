const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  const r = await page.goto('http://127.0.0.1:8127/zh/categories/技术/', { waitUntil: 'networkidle' });
  console.log('status', r.status());
  await page.screenshot({ path: '/home/piscon/codespace/myblog/.zcode/audit/phase3-shots/1440-termpage.png', fullPage: true });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
