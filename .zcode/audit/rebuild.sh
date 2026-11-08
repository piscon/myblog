#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
python3 .zcode/audit/repair-i18n.py
python3 .zcode/audit/verify-i18n.py
