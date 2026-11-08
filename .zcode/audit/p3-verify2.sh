#!/bin/bash
F=/tmp/blog-phase3-public/zh/posts/index.html
grep -c 'list-pager' $F
grep -c 'pager-num' $F
grep -o 'list-pager[^"]*' $F | head -2
grep -c 'page-count' $F
echo "== total zh posts =="
ls /tmp/blog-phase3-public/zh/posts/ | grep -v page | wc -l
