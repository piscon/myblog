#!/bin/bash
cd /home/piscon/codespace/myblog
echo "=== prototype pager css ==="
grep -n -A8 '\.pager {' 原型/二重奏-博客界面设计-交互版.html | head -40
grep -n -A4 'pg-btn\|\.cur\b\|pager .cur\|pg-prev\|pg-next' 原型/二重奏-博客界面设计-交互版.html | head -40
echo "=== current archives override ==="
cat layouts/archives/list.html 2>/dev/null | head -30
echo "=== theme list.html head ==="
sed -n '1,30p' themes/PaperMod/layouts/list.html
echo "=== theme archives? ==="
ls themes/PaperMod/layouts/ | grep -i arch
