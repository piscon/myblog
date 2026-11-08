import { chromium } from '/tmp/pw-audit/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
for (const w of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto('http://172.18.79.17:8123/二重奏-博客界面设计-交互版.html?v=9#/posts', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const info = await page.evaluate(`(() => {
    const bar = document.getElementById('list-pager');
    const prev = bar.children[0], next = bar.lastElementChild;
    const cur = bar.querySelector('[aria-current="page"]');
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    // 其他视图不应出现分页条
    return {
      prevDisabled: prev.tagName === 'SPAN' && prev.getAttribute('aria-disabled') === 'true',
      nextEnabled: next.tagName === 'A' && next.getAttribute('rel') === 'next',
      curMarked: cur && cur.classList.contains('pg-cur') && cur.textContent === '1',
      overflowX: overflow,
      barHeight: Math.round(bar.getBoundingClientRect().height)
    };
  })()`);
  console.log(w + 'px: ' + JSON.stringify(info));
  await page.close();
}
await browser.close();
