import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8123/%E4%BA%8C%E9%87%8D%E5%A5%8F-%E5%8D%9A%E5%AE%A2%E7%95%8C%E9%9D%A2%E8%AE%BE%E8%AE%A1-%E4%BA%A4%E4%BA%92%E7%89%88.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });

const run = async (css, label) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '#/posts/zz-s03', { waitUntil: 'load' });
  if (css) await p.addStyleTag({ content: css });
  await p.waitForTimeout(350);
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(300);
  const buf = await p.screenshot({ clip: { x: 0, y: 640, width: 1440, height: 200 } });
  const b64 = buf.toString('base64');
  const res = await p.evaluate(async (d) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const rows = [];
    for (let y = 0; y < 200; y++) {
      const q = x.getImageData(700, y, 1, 1).data;
      rows.push([y + 640, q[0], q[1], q[2]]);
    }
    return rows.filter(r => !(r[1] === 247 && r[2] === 243 && (r[3] === 234 || r[3] === 235)));
  }, b64);
  console.log(label, JSON.stringify(res));
  await ctx.close();
};

await run('', 'base');
await run(':root{--accent:#00ff00}', 'accent=lime');
await run('footer.site-foot{border-top-color:#0000ff!important}', 'footer border=blue');
await run('.site-foot{visibility:hidden}', 'footer hidden(vis)');
await run('.site-foot{background:#ff00ff!important}', 'footer bg=magenta');
await b.close();
