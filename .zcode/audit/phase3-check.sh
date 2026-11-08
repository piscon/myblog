#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
git update-index --chmod=+x scripts/feature-check.sh 2>/dev/null || true
hugo --gc --minify 2>&1 | tail -3
bash scripts/feature-check.sh 2>&1 | grep -E "❌|FAILED|All feature" | head -20
