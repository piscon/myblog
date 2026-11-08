#!/bin/bash
mkdir -p /tmp/overflow-test
ln -sfn /tmp/pw-audit/node_modules /tmp/overflow-test/node_modules
N=~/.nvm/versions/node/v26.13.0/bin/node
A=~/codespace/myblog/.zcode/audit
cd $A
echo '=== viewport-check ==='
$N viewport-check.mjs 2>&1 | tail -40
echo '=== 修复复验 ==='
$N 修复复验.mjs 2>&1 | tail -30
echo '=== ja-en 快验 ==='
$N ja-en快验.mjs 2>&1 | tail -30
