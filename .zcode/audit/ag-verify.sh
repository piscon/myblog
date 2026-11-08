#!/bin/bash
cd /home/piscon/codespace/myblog
grep -n '列表堆叠卡\|左侧空白\|--u双断点\|喂三处\|content 10/30\|translate(-100%,-50%)，不再贴顶\|63 项' AGENTS.md
echo "exit=$?"
grep -c '间距体系(--sp-\*)' AGENTS.md
grep -c '列表文字目录' AGENTS.md
grep -c '68 项' AGENTS.md
