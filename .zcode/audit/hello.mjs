import fs from 'node:fs';
console.log('node', process.version, 'ws', typeof WebSocket);
fs.writeFileSync(new URL('./probe.txt', import.meta.url), 'ok');
console.log('wrote probe');
