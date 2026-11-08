#!/bin/bash
N=~/.nvm/versions/node/v26.13.0/bin/node
cd ~/codespace/myblog/.zcode/audit
$N ws-audit.mjs 2>&1 | tail -15
echo '--- ws-check ---'
python3 ws-check.py 2>&1 | tail -40
