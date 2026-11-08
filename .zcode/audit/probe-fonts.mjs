// Reports the ACTUAL platform fonts Chrome used for given selectors.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9338;
const profile = path.join(process.env.TEMP || 'C:/Windows/Temp', 'cdp-fonts-profile');
const url = process.argv[2];
const selectors = process.argv.slice(3);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--window-size=1200,900', 'about:blank'
], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const l = await r.json();
      const p = l.find(t => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('no devtools');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 1;
const pending = new Map();
let loaded = false;
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  } else if (m.method === 'Page.loadEventFired') loaded = true;
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = id++; pending.set(i, { resolve, reject });
  ws.send(JSON.stringify({ id: i, method, params }));
});

await send('Page.enable');
await send('DOM.enable');
await send('CSS.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
for (let i = 0; i < 200 && !loaded; i++) await sleep(50);
await sleep(1200);

const out = {};
for (const sel of selectors) {
  const { root } = await send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
  if (!nodeId) { out[sel] = 'NOT_FOUND'; continue; }
  try {
    const res = await send('CSS.getPlatformFontsForNode', { nodeId });
    out[sel] = res.fonts.map(f => `${f.familyName}${f.isCustomFont ? ' (webfont)' : ''} ×${f.glyphCount}`);
  } catch (e) {
    out[sel] = 'ERR ' + e.message;
  }
}
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'r-platform-fonts.json'), JSON.stringify(out, null, 1));
ws.close();
spawnSync('taskkill', ['/T', '/F', '/PID', String(chrome.pid)], { stdio: 'ignore' });
process.exit(0);
