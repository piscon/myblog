// 深挖 zz-s03 toc-float 为何 1440 下没出现
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/home/piscon/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 160)));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 160)); });
await p.goto('http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html?v=5#/posts/zz-s03', { waitUntil: 'load' });
await wait(600);
await p.evaluate(() => window.scrollTo(0, 3000));
await wait(400);
const r = await p.evaluate(() => {
  const tf = document.getElementById('toc-float');
  return {
    y: window.scrollY,
    enabled: tf.dataset.enabled,
    hidden: tf.hidden,
    display: getComputedStyle(tf).display,
    coverHidden: document.getElementById('art-cover').hidden,
    coverBottom: document.getElementById('art-cover').getBoundingClientRect().bottom,
    tocCount: document.getElementById('toc-count').textContent,
    inlineHidden: document.getElementById('toc-inline').hidden
  };
});
console.log(JSON.stringify(r));
await b.close();
