const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  const r = await page.goto('http://127.0.0.1:8128/zh/posts/ai-update-blog/', { waitUntil: 'networkidle' });
  console.log('status', r.status());
  const geo = await page.evaluate(() => {
    const t = document.querySelector('details.toc');
    if (!t) return 'no toc';
    const cs = getComputedStyle(t);
    return { pos: cs.position, left: cs.left, right: cs.right, transform: cs.transform, borderLeft: cs.borderLeftWidth, bg: cs.backgroundColor };
  });
  console.log(JSON.stringify(geo));
  await page.screenshot({ path: '/home/piscon/codespace/myblog/.zcode/audit/phase4-shots/1440-post.png', fullPage: false });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
