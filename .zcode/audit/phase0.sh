#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo version
echo "== baseline build =="
hugo --gc --minify -d /tmp/blog-baseline-public 2>&1 | tail -15
echo "== baseline screenshots =="
mkdir -p .zcode/audit/baseline
NODE="$HOME/.nvm/versions/node/v26.13.0/bin/node"
ls "$NODE" >/dev/null && echo node-ok
