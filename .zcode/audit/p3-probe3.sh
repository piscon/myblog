#!/bin/bash
cd /home/piscon/codespace/myblog
grep -n -B4 '列表堆叠卡\|分类元信息行\|元信息行条目类名\|RSS 列表页入口' scripts/feature-check.sh | head -60
echo "=== hugo.toml pagination ==="
grep -n -A3 '\[pagination\]' hugo.toml
echo "=== theme pagination partial ==="
ls themes/PaperMod/layouts/_partials/ | grep -i pag
