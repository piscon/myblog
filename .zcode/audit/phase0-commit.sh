#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
git add .zcode/audit/baseline .zcode/audit/baseline-shots.cjs .zcode/audit/phase0.sh .zcode/audit/phase0-shots.sh
git commit -m "Phase 0: redesign/proto-wiring 分支基线（构建+7视口截图）" --no-verify
git log --oneline -2
