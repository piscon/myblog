#!/bin/bash
cd /home/piscon/codespace/myblog
export PATH="$HOME/.nvm/versions/node/v26.13.0/bin:$PATH"
node scripts/translate.mjs --self-test 2>&1 | tail -15
