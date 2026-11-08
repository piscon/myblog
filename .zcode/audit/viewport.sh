#!/bin/bash
export PATH="$HOME/.nvm/versions/node/v26.13.0/bin:$PATH"
cd /home/piscon/codespace/myblog
exec node .zcode/audit/viewport-check.mjs
