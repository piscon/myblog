#!/bin/bash
ls ~/.cache/ms-playwright/chromium-1243/ 2>/dev/null
find ~/.cache/ms-playwright/chromium-1243 -maxdepth 3 -name "chrome*" -type f 2>/dev/null | head
find ~/.cache/ms-playwright/chromium-1234 -maxdepth 3 -name "chrome*" -type f 2>/dev/null | head
