#!/usr/bin/env bash
# 找到并杀掉占用 8123 的进程，然后在原型目录重启预览服务
fuser -k 8123/tcp 2>/dev/null
sleep 1
cd ~/codespace/myblog/原型 && exec python3 -m http.server 8123
