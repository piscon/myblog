#!/bin/bash
set -e
cd /home/piscon/codespace/myblog
python3 - <<'EOF'
target = "原型/二重奏-博客界面设计-交互版.html"
new_js = open(".zcode/audit/main.js.txt", encoding="utf-8").read().rstrip() + "\n"
html = open(target, encoding="utf-8").read()
start = html.find("<script>\n(function () {\n  'use strict';")
assert start > 0
end_marker = "})();\n</script>\n</body>"
end = html.find(end_marker, start)
assert end > 0
html = html[:start] + "<script>\n" + new_js + "</script>\n</body>" + html[end + len(end_marker):]
open(target, "w", encoding="utf-8").write(html)
print("respliced. size:", len(html))
EOF
node --check /tmp/proto-main.js >/dev/null 2>&1 || true
python3 - <<'EOF'
import re
html = open("原型/二重奏-博客界面设计-交互版.html", encoding="utf-8").read()
m = re.findall(r"<script>\n(\(function \(\)[\s\S]*?\}\)\(\);)\n</script>", html)
open("/tmp/proto-main.js", "w", encoding="utf-8").write(m[-1])
EOF
node --check /tmp/proto-main.js && echo "JS SYNTAX OK"
