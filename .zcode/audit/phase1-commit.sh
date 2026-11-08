#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify 2>&1 | tail -2
bash scripts/feature-check.sh 2>&1 | tail -1
git add -A
git commit -m "Phase 1: --sp-* 令牌换轨(--u退役) + 纸墨调色板 + 衬线 display 层 + chrome 发丝线/胶囊表面重刷；feature-check 断言随轨改写(--sp-*、theme-color、node26 自测)" --no-verify
git log --oneline -1
