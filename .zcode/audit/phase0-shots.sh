#!/bin/bash
set -e
cd /tmp/blog-baseline-public
python3 -m http.server 8124 --bind 127.0.0.1 >/tmp/baseline-http.log 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 1
$HOME/.nvm/versions/node/v26.13.0/bin/node /home/piscon/codespace/myblog/.zcode/audit/baseline-shots.cjs
ls /home/piscon/codespace/myblog/.zcode/audit/baseline/ | wc -l
