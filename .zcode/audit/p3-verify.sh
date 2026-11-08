#!/bin/bash
cd /tmp/blog-phase3-public
echo "== zh posts count rows =="
grep -c 'post-row' zh/posts/index.html
echo "== pager token =="
grep -c 'pager-num\|list-pager' zh/posts/index.html
ls zh/posts/page/ 2>/dev/null
echo "== en posts =="
ls en/posts/page/ 2>/dev/null
grep -c 'post-row' en/posts/index.html
