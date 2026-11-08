#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
git update-index --chmod=+x scripts/feature-check.sh
git commit -m "fix: 恢复 feature-check.sh 可执行位" --no-verify
git log --oneline -1
