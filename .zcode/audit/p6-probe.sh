#!/bin/bash
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
OUT=/tmp/blog-p6-public
hugo --gc --minify -d $OUT >/dev/null 2>&1
CSS=$(ls $OUT/assets/css/stylesheet.*.css)
echo "== toc float minified =="
grep -o 'details.toc\[open\]{position:fixed[^}]*' "$CSS" | head -2
echo "== font-display minified =="
grep -o -- '--font-display:[^;}]*' "$CSS" | head -3
echo "== giscus wrapper inline =="
grep -o 'class="giscus-wrapper"[^>]*' $OUT/zh/posts/first/index.html | head -1
echo "== home tokens =="
grep -c 'class="home"' $OUT/zh/index.html
grep -c 'masthead-line' $OUT/zh/index.html
grep -c 'ledger-row' $OUT/zh/index.html
grep -c 'profile_inner' $OUT/zh/index.html
echo "== 404 =="
grep -c 'notfound-actions' $OUT/zh/404.html
ls $OUT/ja/404.html $OUT/en/404.html
echo "== seriffont on titles =="
grep -o 'hero-title{[^}]*' "$CSS" | head -1
