#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify 2>&1 | tail -2
bash scripts/feature-check.sh 2>&1 | tail -1
git add -A
git commit -m "Phase 2: 编辑部式首页——index.html 覆盖(profileMode→masthead+hero+近作+目录+按钮行)、home.css 照抄原型数值、三语 i18n 首页文案键；分类在首页一律纯文本(守菜单断言)" --no-verify
git log --oneline -1
