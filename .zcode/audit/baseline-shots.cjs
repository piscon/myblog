const { chromium } = require('/tmp/pw-audit/node_modules/playwright-core');
const fs = require('fs');
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8124';
const OUT = '/home/piscon/codespace/myblog/.zcode/audit/baseline';

function findPost() {
  const dir = '/tmp/blog-baseline-public/zh/posts';
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && fs.existsSync(`${dir}/${e.name}/index.html`)) return `/zh/posts/${e.name}/`;
  }
  return null;
}

(async () => {
  const post = findPost();
  if (!post) throw new Error('no post found');
  console.log('post =', post);
  const views = [
    ['home', '/zh/'], ['posts', '/zh/posts/'], ['post', post], ['archives', '/zh/archives/'],
  ];
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  for (const w of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const [name, url] of views) {
      await page.goto(BASE + url, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '#readbar{display:none!important}' });
      await page.evaluate(() => new Promise(r => {
        const s = document.createElement('style');
        s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
        document.head.appendChild(s); setTimeout(r, 150);
      }));
      await page.screenshot({ path: `${OUT}/${w}-${name}.png`, fullPage: true });
    }
    await ctx.close();
    console.log('done', w);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
