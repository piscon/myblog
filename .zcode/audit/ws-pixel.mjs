import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const fs = require('fs');
const file = '.zcode/audit/ws/fix-article-foot-1440.png';
const data = fs.readFileSync(file).toString('base64');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
const out = await p.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const rows = [];
  for (let y = 432; y <= 446; y++) {
    const d = ctx.getImageData(700, y, 1, 1).data;
    rows.push([y, d[0], d[1], d[2]]);
  }
  return { w: img.width, h: img.height, rows };
}, data);
console.log(JSON.stringify(out));
await b.close();
