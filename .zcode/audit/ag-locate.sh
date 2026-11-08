#!/bin/bash
cd /home/piscon/codespace/myblog
grep -n '列表视图约定\|列表堆叠卡\|--u\|左侧空白\|translate(-100%\|63 项\|62→63\|--thumb\|tag-entry\|Casper\|entry-footer\|4.8vmin\|内容与媒体约定\|文章页元素顺序' AGENTS.md | head -40
wc -l AGENTS.md
