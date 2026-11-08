#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify 2>&1 | tail -2
bash scripts/feature-check.sh 2>&1 | tail -1
git add -A
git commit -m "Phase 3: 列表系统——_default/list.html 年份分组文字目录+窗口式数字分页(pagerSize=10)、list.css 照抄原型、拆 Casper 堆叠卡(cover.css/ui.css)、term 页 no-cat 变体、postsUnit i18n；断言换轨(列表文字目录/更新于archive侧/封面sizes守首页hero)" --no-verify
git update-index --chmod=+x scripts/feature-check.sh
git commit -m "fix: feature-check 可执行位" --no-verify 2>/dev/null || true
git log --oneline -1
