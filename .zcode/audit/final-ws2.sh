#!/bin/bash
cd ~/codespace/myblog/.zcode/audit
grep -n 'exe=' 分页回顶验证.mjs | head -3
sed -i "s|chromium.launch({ args:|chromium.launch({ executablePath: '/home/piscon/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args:|" ws-audit.mjs
grep -n 'executablePath' ws-audit.mjs
N=~/.nvm/versions/node/v26.13.0/bin/node
$N ws-audit.mjs 2>&1 | tail -8
echo '--- ws-check (溢出/重叠) ---'
python3 ws-check.py 2>&1 | tail -40
