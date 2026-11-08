#!/bin/bash
# 接线前最终检查：起服务器 + 依次跑多维审计
cd ~/codespace/myblog/原型
# 起服务器（若 8123 未占用）
if ! curl -s -o /dev/null http://localhost:8123/; then
  nohup python3 -m http.server 8123 >/tmp/preview8123.log 2>&1 &
  sleep 1
fi
curl -s -o /dev/null -w 'server: %{http_code}\n' http://localhost:8123/

N=~/.nvm/versions/node/v26.13.0/bin/node
A=~/codespace/myblog/.zcode/audit
export NODE_PATH=/tmp/pw-audit/node_modules

echo '=== 1. 分页/回顶/筛选验证 ==='
cd $A && $N 分页回顶验证.mjs 2>&1 | tail -30
echo '=== 2. 分页细节断言 ==='
$N 分页细节断言.mjs 2>&1 | tail -30
echo '=== 3. 空元素错位审计 ==='
$N 空元素错位审计.mjs 2>&1 | tail -30
echo '=== 4. 分隔线审计 ==='
$N 分隔线审计.mjs 2>&1 | tail -30
echo '=== 5. 视口检查 ==='
$N viewport-check.mjs 2>&1 | tail -40
echo '=== done ==='
