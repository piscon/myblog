import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE + '#/posts/zz-s03', { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(300);

const sample = async (label) => {
  const buf = await p.screenshot({ clip: { x: 0, y: 690, width: 1440, height: 40 } });
  const b64 = buf.toString('base64');
  const res = await p.evaluate(async (d) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const out = [];
    for (let y = 0; y < 40; y++) {
      const q = x.getImageData(700, y, 1, 1).data;
      if (q[0] === 138 && q[1] === 93 && q[2] === 21) out.push(y + 690);
    }
    return out;
  }, b64);
  console.log(label, 'accent rows:', res);
};

await sample('base');
for (const sel of ['.site-foot', 'main', '.site-head', '#readbar', '.toc-float']) {
  const id = await p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.dataset.wasDisp = el.style.display;
    el.style.display = 'none';
    return s;
  }, sel);
  await p.waitForTimeout(120);
  await sample('hide ' + sel);
  await p.evaluate((s) => { const el = document.querySelector(s); el.style.display = el.dataset.wasDisp || ''; }, sel);
  await p.waitForTimeout(80);
}
await b.close();
