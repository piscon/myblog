const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8125';
const OUT = '/home/piscon/codespace/myblog/.zcode/audit/phase1-shots';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  for (const [name, url, w, dark] of [
    ['1440-home', '/zh/', 1440, false],
    ['1440-post', '/zh/posts/ai-update-blog/', 1440, false],
    ['390-posts', '/zh/posts/', 390, false],
    ['1440-post-dark', '/zh/posts/ai-update-blog/', 1440, true],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
    const page = await ctx.newPage();
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    await ctx.close();
    console.log('done', name);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
