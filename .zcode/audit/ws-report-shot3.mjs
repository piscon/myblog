import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const URL = 'http://127.0.0.1:8123/%E7%95%99%E7%99%BD%E5%AE%A1%E8%AE%A1-%E6%8A%A5%E5%91%8A.html?v=7';
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (const [clip, name] of [
  [{ x: 0, y: 4900, width: 1440, height: 950 }, 'rep3-fix'],
  [{ x: 0, y: 0, width: 1440, height: 640 }, 'rep3-top'],
]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `.zcode/audit/ws/${name}.png`, clip, fullPage: true });
  await ctx.close();
}
await b.close();
console.log('ok');
