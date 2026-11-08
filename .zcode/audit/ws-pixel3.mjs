import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const fs = require('fs');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
const b64 = fs.readFileSync('.zcode/audit/ws/viewport-bottom.png').toString('base64');
const out = await p.evaluate(async (d) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const pick = (yy, xx) => { const q = x.getImageData(xx, yy, 1, 1).data; return [yy, xx, q[0], q[1], q[2]]; };
  const rows = [];
  for (const yy of [0, 1, 2, 3, 4, 5]) rows.push(pick(yy, 700));
  for (const yy of [705, 706, 707, 708, 709]) { rows.push(pick(yy, 40)); rows.push(pick(yy, 1400)); }
  return rows;
}, b64);
console.log(JSON.stringify(out));
await b.close();
