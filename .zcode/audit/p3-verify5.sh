#!/bin/bash
cd /home/piscon/codespace/myblog
grep -n 'OUT=' scripts/feature-check.sh | head -5
grep -n 'hugo' scripts/feature-check.sh | head -5
