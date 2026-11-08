#!/bin/bash
export PATH="$HOME/.nvm/versions/node/v26.13.0/bin:$PATH"
head -c 400 /tmp/overflow-test/node_modules/playwright/index.js; echo; echo ---
node -e "const p=require('/tmp/overflow-test/node_modules/playwright-core'); console.log(typeof p.chromium);"
