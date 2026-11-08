// CDP harness: drives the real Chrome on Windows at exact viewports.
// node audit.mjs plan.json  -> writes plan.out (JSON), exits.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9336;
const planPath = process.argv[2];
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const baseDir = path.dirname(path.resolve(planPath));
const outPath = path.join(baseDir, plan.out || 'result.json');
const profile = path.join(process.env.TEMP || 'C:/Windows/Temp', 'cdp-audit-profile-3');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const flush = () => fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
setTimeout(() => { try { flush(); } catch {} process.exit(2); }, 150000).unref();

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check',
  '--disable-features=Translate,MediaRouter',
  '--window-size=430,900',
  'about:blank'
], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('devtools not reachable');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 1;
const pending = new Map();
let loadFired = false;
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === 'Page.loadEventFired') {
    loadFired = true;
  }
};
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

const out = [];
try {
  for (const step of plan.steps) {
    if (step.viewport) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: step.viewport.width, height: step.viewport.height,
        deviceScaleFactor: step.viewport.dsf || 2, mobile: step.viewport.mobile !== false
      });
      const scheme = step.viewport.dark ? 'dark' : (step.viewport.light ? 'light' : null);
      if (scheme) {
        await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
        await evaluate(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(scheme)}); 'ok'`);
      }
    }
    if (step.goto) {
      loadFired = false;
      await send('Page.navigate', { url: step.goto });
      for (let i = 0; i < 300 && !loadFired; i++) await sleep(50);
      await sleep(step.settle || 900);
    }
    if (step.click) {
      const r = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(step.click)}); if (!el) return 'NOT_FOUND'; el.click(); return 'clicked'; })()`);
      await sleep(step.settle || 450);
      if (r !== 'clicked') out.push({ click: step.click, result: r });
    }
    if (step.realClick) {
      const box = await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(step.realClick)}); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
      if (box) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none', buttons: 0 });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', buttons: 0, clickCount: 1 });
        await sleep(step.settle || 500);
      } else {
        out.push({ realClick: step.realClick, result: 'NOT_FOUND' });
      }
    }
    if (step.key) {
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(step.key)}, bubbles: true })); 'ok'`);
      await sleep(step.settle || 400);
    }
    if (step.hash) {
      await evaluate(`location.hash = ${JSON.stringify(step.hash)}; 'ok'`);
      await sleep(step.settle || 700);
    }
    if (step.evalFile) {
      const js = fs.readFileSync(path.join(baseDir, step.evalFile), 'utf8');
      out.push({ label: step.label || step.evalFile, value: await evaluate(js) });
    }
    if (step.eval) {
      out.push({ label: step.label || 'eval', value: await evaluate(step.eval) });
    }
    if (step.shot) {
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(baseDir, step.shot), Buffer.from(data, 'base64'));
    }
    if (step.scrollTo !== undefined) {
      await evaluate(`window.scrollTo(0, ${step.scrollTo}); 'ok'`);
      await sleep(400);
    }
    flush();
  }
} catch (err) {
  out.push({ error: String(err && err.message || err) });
}

flush();
try { ws.close(); } catch {}
spawnSync('taskkill', ['/T', '/F', '/PID', String(chrome.pid)], { stdio: 'ignore' });
process.exit(0);
