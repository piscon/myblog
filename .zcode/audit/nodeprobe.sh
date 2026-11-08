#!/bin/bash
cd /home/piscon/codespace/myblog
node --version
node scripts/translate.mjs --self-test >/dev/null 2>&1; echo "default-node exit=$?"
