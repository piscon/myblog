const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8125/zh/posts/', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const entry = document.querySelector('.post-entry');
    return {
      dataTheme: document.documentElement.getAttribute('data-theme'),
      cls: document.documentElement.className,
      themeVar: cs.getPropertyValue('--theme').trim(),
      primaryVar: cs.getPropertyValue('--primary').trim(),
      bodyBg: body.backgroundColor, bodyColor: body.color,
      entryBg: entry ? getComputedStyle(entry).backgroundColor : null,
      entryColor: entry ? getComputedStyle(entry).color : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
