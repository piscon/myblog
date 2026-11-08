import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const URL = 'http://127.0.0.1:8123/%E7%95%99%E7%99%BD%E5%AE%A1%E8%AE%A1-%E6%8A%A5%E5%91%8A.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
const out = await p.evaluate(() => {
  const td = document.querySelector('td.n.ok');
  const cs = td ? getComputedStyle(td) : null;
  return { found: !!td, txt: td && td.textContent, color: cs && cs.color, cls: td && td.className };
});
console.log(JSON.stringify(out));
await b.close();
