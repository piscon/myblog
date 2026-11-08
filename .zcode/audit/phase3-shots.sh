#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify -d /tmp/blog-phase3-public >/dev/null 2>&1
ls /tmp/blog-phase3-public/zh/posts/page/ 2>/dev/null
ls /tmp/blog-phase3-public/zh/categories/ | head -5
cd /tmp/blog-phase3-public
python3 -m http.server 8127 --bind 127.0.0.1 >/tmp/phase3-http.log 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 1
mkdir -p /home/piscon/codespace/myblog/.zcode/audit/phase3-shots
$HOME/.nvm/versions/node/v26.13.0/bin/node /home/piscon/codespace/myblog/.zcode/audit/phase3-shots.cjs
