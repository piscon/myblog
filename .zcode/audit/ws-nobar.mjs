import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE + '#/posts/zz-s03', { waitUntil: 'load' });
await p.addStyleTag({ content: '#readbar{display:none!important}' });
await p.waitForTimeout(300);
await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(300);
await p.screenshot({ path: '.zcode/audit/ws/nobar.png' });
const info = await p.evaluate(() => ({ disp: getComputedStyle(document.getElementById('readbar')).display, y: scrollY }));
const b64 = fs.readFileSync('.zcode/audit/ws/nobar.png').toString('base64');
const probe = await p.evaluate(async (d) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const rows = [];
  for (let y = 700; y <= 712; y++) { const q = x.getImageData(700, y, 1, 1).data; rows.push([y, q[0], q[1], q[2]]); }
  return rows;
}, b64);
console.log(JSON.stringify(info), JSON.stringify(probe));
await b.close();
