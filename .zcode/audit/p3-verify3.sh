#!/bin/bash
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
OUT=/tmp/blog-fc-public
hugo --gc --minify -d $OUT >/dev/null 2>&1
F=$OUT/zh/posts/index.html
grep -c 'pager-num' $F
grep -c 'list-pager' $F
ls $OUT/zh/posts/page/ 2>/dev/null
bash scripts/feature-check.sh 2>&1 | grep -E '列表文字|❌|All feature'
