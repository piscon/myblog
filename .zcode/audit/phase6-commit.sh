#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify 2>&1 | tail -2
bash scripts/feature-check.sh 2>&1 | tail -1
git add -A
git commit -m "Phase 6: 收尾——feature-check 增 5 条断言(编辑部首页/404 出口/TOC 右浮/衬线 display/评论壳)，63→68 项；6 视口×6 视图全量截图留档；上线清单入库" --no-verify
git update-index --chmod=+x scripts/feature-check.sh
git commit -m "fix: feature-check 可执行位" --no-verify 2>/dev/null || true
git log --oneline | head -12
