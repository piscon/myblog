const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const fs = require('fs');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8130';
const OUT = '/home/piscon/codespace/myblog/.zcode/audit/phase6-shots';
function findPost() {
  const dir = '/tmp/blog-p6-public/zh/posts';
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && fs.existsSync(`${dir}/${e.name}/index.html`)) return `/zh/posts/${e.name}/`;
  }
}
(async () => {
  const post = findPost();
  const views = [
    ['home', '/zh/'], ['posts', '/zh/posts/'], ['post', post],
    ['search', '/zh/search/'], ['archives', '/zh/archives/'], ['404', '/zh/404.html'],
  ];
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  for (const w of [320, 390, 768, 1024, 1280, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 950 } });
    const page = await ctx.newPage();
    for (const [name, url] of views) {
      await page.goto(BASE + url, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '#readbar{display:none!important}' });
      await page.screenshot({ path: `${OUT}/${w}-${name}.png`, fullPage: true });
    }
    await ctx.close();
    console.log('done', w);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
