#!/bin/bash
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo -D -d /tmp/blog-p3-drafts >/dev/null 2>&1
echo "drafts build pager-num: $(grep -c 'pager-num' /tmp/blog-p3-drafts/zh/posts/index.html)"
echo "drafts page dirs: $(ls /tmp/blog-p3-drafts/zh/posts/page/)"
echo "page2 rows: $(grep -c 'post-row' /tmp/blog-p3-drafts/zh/posts/page/2/index.html 2>/dev/null)"
