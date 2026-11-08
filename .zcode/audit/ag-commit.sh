#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
git add AGENTS.md
git commit -m "docs: AGENTS.md 约定巡检——列表文字目录(签认①)/TOC 右浮(签认③)/衬线 display(签认②)/--sp-* 换轨/404 出口页/post_meta 两处/断言 68 项清单随轨" --no-verify
git log --oneline -1
