import { chromium } from '/tmp/overflow-test/node_modules/playwright/index.js';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('title:', await p.title());
console.log('ua:', await p.evaluate(() => navigator.userAgent));
await b.close();
