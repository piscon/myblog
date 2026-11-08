#!/bin/bash
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify -d /tmp/blog-phase5-public >/dev/null 2>&1
cd /tmp/blog-phase5-public
python3 -m http.server 8129 --bind 127.0.0.1 >/tmp/phase5-http.log 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 1
$HOME/.nvm/versions/node/v26.13.0/bin/node /home/piscon/codespace/myblog/.zcode/audit/phase5-shots.cjs
