#!/bin/bash
cd /home/piscon/codespace/myblog
echo "=== current 404 ==="
cat layouts/404.html
echo "=== prototype 404 ==="
grep -n -B2 -A22 '404' 原型/二重奏-博客界面设计-交互版.html | grep -A22 'view-404\|notfound' | head -40
echo "=== search.html head ==="
head -40 layouts/search.html
