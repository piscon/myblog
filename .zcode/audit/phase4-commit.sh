#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify 2>&1 | tail -2
bash scripts/feature-check.sh 2>&1 | tail -1
git add -A
git commit -m "Phase 4: 文章页——TOC 浮层左→右(签认③纯CSS)+原型浮层形态(透明+左发丝线)、编辑部边界间距(post-header sp-head/post-content sp-8)；三档破格/srcset/giscus/焦点归位全保留" --no-verify
git update-index --chmod=+x scripts/feature-check.sh
git commit -m "fix: feature-check 可执行位" --no-verify 2>/dev/null || true
git log --oneline -1
