const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8127';
const OUT = '/home/piscon/codespace/myblog/.zcode/audit/phase3-shots';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  for (const [name, url, w] of [
    ['1440-posts', '/zh/posts/', 1440],
    ['390-posts', '/zh/posts/', 390],
    ['1440-page2', '/zh/posts/page/2/', 1440],
    ['1440-term', '/zh/categories/', 1440],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 950 }, colorScheme: 'light' });
    const page = await ctx.newPage();
    const resp = await page.goto(BASE + url, { waitUntil: 'networkidle' });
    console.log(name, resp.status());
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
