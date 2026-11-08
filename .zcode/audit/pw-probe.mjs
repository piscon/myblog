import('/tmp/overflow-test/node_modules/playwright/index.js').then(async ({ chromium }) => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log('title:', await p.title());
  await b.close();
}).catch(e => { console.error('ERR', String(e).slice(0, 300)); process.exit(1); });
