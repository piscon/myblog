#!/bin/bash
cd /home/piscon/codespace/myblog
tail -8 scripts/feature-check.sh
grep -n "printf\|RESULTS\[" scripts/feature-check.sh | tail -6
wc -l scripts/feature-check.sh
