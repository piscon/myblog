#!/bin/bash
export PATH="$HOME/.nvm/versions/node/v26.13.0/bin:$PATH"
cd /home/piscon/codespace/myblog
node .zcode/audit/pw-probe.mjs
echo "EXIT=$?"
