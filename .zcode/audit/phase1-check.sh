#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify 2>&1 | tail -3
echo "== feature-check =="
bash scripts/feature-check.sh 2>&1 | tail -25
