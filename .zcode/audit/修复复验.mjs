// 修复复验：裸键清零 + zz-s03/02/04 caption 全部图下对齐（多视口）
import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const KILL = `*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}`;

for (const w of [390, 768, 1220, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto('http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=8#/posts', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.addStyleTag({ content: KILL });
  await page.waitForTimeout(150);
  const foot = await page.evaluate(`document.querySelector('#view-posts .list-foot span').innerText.replace(/\\s+/g,' ')`);
  console.log(w + 'px list-foot: "' + foot + '"  rawTokens=' + (/_[a-z]/.test(foot) ? 'STILL THERE' : 'none'));
  for (const slug of ['zz-s03', 'zz-s02', 'zz-s04']) {
    await page.evaluate(s => { location.hash = '#/posts/' + s; }, slug);
    await page.waitForTimeout(700);
    const caps = await page.evaluate(`(() => {
      const out = [];
      document.querySelectorAll('.article-body figure').forEach(fig => {
        const img = fig.querySelector('img'), cap = fig.querySelector('figcaption');
        if (!img || !cap) return;
        const ir = img.getBoundingClientRect(), cr = cap.getBoundingClientRect();
        const ok = cap.textContent.trim() && cr.top >= ir.bottom - 2 && Math.abs(cr.left - ir.left) <= 4 && cr.right <= ir.right + 4;
        out.push((fig.className || 'fig') + ':' + (ok ? 'ok' : 'BAD cap.top=' + Math.round(cr.top) + ' img.bottom=' + Math.round(ir.bottom) + ' capL=' + Math.round(cr.left) + ' imgL=' + Math.round(ir.left)));
      });
      return out;
    })()`);
    console.log('  ' + slug + ' captions: ' + caps.join(' | '));
  }
  await page.close();
}
await browser.close();
