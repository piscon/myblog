import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const KILL = `*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}#readbar{display:none!important}`;
const shots = [
  ['fix-home-top-1440', '#/', 1440, 900, { x: 0, y: 0, width: 1440, height: 1720 }],
  ['fix-home-mid-1440', '#/', 1440, 900, { x: 0, y: 1450, width: 1440, height: 800 }],
  ['fix-posts-1440', '#/posts', 1440, 900, { x: 0, y: 0, width: 1440, height: 1100 }],
  ['fix-article-top-1440', '#/posts/zz-s03', 1440, 900, { x: 0, y: 0, width: 1440, height: 1400 }],
  ['fix-article-audio-1440', '#/posts/zz-s03', 1440, 900, { x: 0, y: 1400, width: 1440, height: 900 }],
  ['fix-article-foot-1440', '#/posts/zz-s03', 1440, 900, { x: 0, y: 5150, width: 1440, height: 640 }],
  ['fix-search-tail-1440', '#/search', 1440, 900, { x: 0, y: 1750, width: 1440, height: 560 }],
  ['fix-home-390', '#/', 390, 844, { x: 0, y: 0, width: 390, height: 1350 }],
  ['fix-posts-390', '#/posts', 390, 844, { x: 0, y: 0, width: 390, height: 1000 }],
  ['fix-article-390', '#/posts/zz-s03', 390, 844, { x: 0, y: 0, width: 390, height: 1000 }],
];
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (const [name, hash, w, h, clip] of shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(BASE + hash, { waitUntil: 'load' });
  await p.addStyleTag({ content: KILL });
  await p.waitForTimeout(450);
  await p.screenshot({ path: `.zcode/audit/ws/${name}.png`, clip, fullPage: true });
  await ctx.close();
}
await b.close();
console.log('fix shots done');
