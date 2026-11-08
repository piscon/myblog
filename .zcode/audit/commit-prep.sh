#!/bin/bash
set -e
cd ~/codespace/myblog
git reset -q
rm -rf '.zcode/audit/.zcode'
printf '\n/.zcode/audit/*.png\n/.zcode/audit/**/*.png\n/.zcode/audit/*.jpg\n/.zcode/audit/**/*.jpg\n' >> .gitignore
git add 原型 .zcode/audit .zcode/restart-preview-8123.sh research-breakpoints.md research-header-order.md research-toc.md research-type.md .gitignore
echo '--- staged ---'
git status --short | grep -c '^A\|^M' || true
git status --short | grep -v '^A\|^M' | head -5
echo '--- any png staged? ---'
git diff --cached --name-only | grep -i 'png\|jpg' | head -5 || echo none
du -sh "$(git write-tree >/dev/null 2>&1; echo)" 2>/dev/null | true
