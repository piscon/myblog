#!/bin/bash
export PATH="$HOME/.nvm/versions/node/v26.13.0/bin:$PATH"
cd /tmp/overflow-test
node -e "const p=require('playwright'); console.log(Object.keys(p).slice(0,8)); console.log(typeof p.chromium, p.default && typeof p.default.chromium);"
ls node_modules | grep -i playwright
