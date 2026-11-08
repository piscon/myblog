import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const fs = require('fs');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
for (const file of ['.zcode/audit/ws/viewport-bottom.png']) {
  const b64 = fs.readFileSync(file).toString('base64');
  const out = await p.evaluate(async (d) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const rows = [];
    for (let y = 696; y <= 712; y++) { const q = x.getImageData(700, y, 1, 1).data; rows.push([y, q[0], q[1], q[2]]); }
    return rows;
  }, b64);
  console.log(file, JSON.stringify(out));
}
await b.close();
