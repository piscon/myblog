#!/usr/bin/env python3
"""用 main.js.txt 替换原型主 <script> IIFE；并给 head 主题脚本加 lang 预设。"""
import re

ROOT = "/home/piscon/codespace/myblog"
target = f"{ROOT}/原型/二重奏-博客界面设计-交互版.html"
new_js = open(f"{ROOT}/.zcode/audit/main.js.txt", encoding="utf-8").read().rstrip() + "\n"

html = open(target, encoding="utf-8").read()

# 1) 替换主 IIFE：<script>\n(function () {\n  'use strict'; ... })();\n</script>\n</body>
start = html.find("<script>\n(function () {\n  'use strict';")
assert start > 0, "main script start not found"
end_marker = "})();\n</script>\n</body>"
end = html.find(end_marker, start)
assert end > 0, "main script end not found"
html = html[:start] + "<script>\n" + new_js + "</script>\n</body>" + html[end + len(end_marker):]

# 2) head 主题脚本里加语言预设（首帧 lang 正确，避免 zh→ja 闪一下）
lang_pre = """  try {
    var lm = location.hash.match(/^#\\/(ja|en)\\//);
    if (lm) document.documentElement.lang = lm[1];
  } catch (e) {}
"""
anchor = "  })();\n</script>\n<style>"
assert html.count(anchor) == 1, "head script anchor"
html = html.replace(anchor, "  })();\n" + lang_pre + "</script>\n<style>")

open(target, "w", encoding="utf-8").write(html)
print("replaced. size:", len(html))
