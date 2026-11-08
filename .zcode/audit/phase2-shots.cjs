const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8126';
const OUT = '/home/piscon/codespace/myblog/.zcode/audit/phase2-shots';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  for (const [name, url, w] of [
    ['1440-zh', '/zh/', 1440],
    ['1440-en', '/en/', 1440],
    ['390-zh', '/zh/', 390],
    ['390-ja', '/ja/', 390],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 950 }, colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    await ctx.close();
    console.log('done', name);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
