#!/bin/bash
cd /home/piscon/codespace/myblog
OUT=/tmp/blog-fc-public
CMD="grep -q 'year-group' '$OUT/zh/posts/index.html' && grep -q 'post-row' '$OUT/zh/posts/index.html' && grep -q 'p-title' '$OUT/zh/posts/index.html' && grep -q 'list-pager\|pager-num' '$OUT/zh/posts/index.html' && ! grep -q 'post-entry' '$OUT/zh/posts/index.html' && ! grep -q 'entry-cover' '$OUT/zh/posts/index.html' && grep -q 'year-group' '$OUT/en/posts/index.html'"
eval "$CMD"; echo "manual rc=$?"
grep -n 'pager-num' scripts/feature-check.sh | head -3
