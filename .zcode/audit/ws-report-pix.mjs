import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const fs = require('fs');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
const b64 = fs.readFileSync('.zcode/audit/ws/rep3-fix.png').toString('base64');
const out = await p.evaluate(async (d) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const colors = {};
  for (let yy = 60; yy < 90; yy++) {
    for (let xx = 760; xx < 900; xx++) {
      const q = x.getImageData(xx, yy, 1, 1).data;
      const k = q[0] + ',' + q[1] + ',' + q[2];
      colors[k] = (colors[k] || 0) + 1;
    }
  }
  return Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 6);
}, b64);
console.log(JSON.stringify(out));
await b.close();
