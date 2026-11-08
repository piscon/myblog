#!/bin/bash
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify -d /tmp/blog-p6-public >/dev/null 2>&1
cd /tmp/blog-p6-public
python3 -m http.server 8130 --bind 127.0.0.1 >/tmp/phase6-http.log 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 1
mkdir -p /home/piscon/codespace/myblog/.zcode/audit/phase6-shots
$HOME/.nvm/versions/node/v26.13.0/bin/node /home/piscon/codespace/myblog/.zcode/audit/phase6-shots.cjs
ls /home/piscon/codespace/myblog/.zcode/audit/phase6-shots | wc -l
