#!/bin/bash
cd /tmp/blog-phase3-public
python3 -m http.server 8127 --bind 127.0.0.1 >/tmp/phase3-http.log 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 1
$HOME/.nvm/versions/node/v26.13.0/bin/node /home/piscon/codespace/myblog/.zcode/audit/phase3-term.cjs
