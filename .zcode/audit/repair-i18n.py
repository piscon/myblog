#!/usr/bin/env python3
"""修复 i18n 注入：剥离嵌入 HTML 中的 <script> 块、转义 </，重建 i18n-data 标签。"""
import json, re

ROOT = "/home/piscon/codespace/myblog"
target = f"{ROOT}/原型/二重奏-博客界面设计-交互版.html"
html = open(target, encoding="utf-8").read()

start = html.find('<script type="application/json" id="i18n-data">')
main_start = html.find("\n\n<script>\n(function () {")
assert start > 0 and main_start > start, (start, main_start)

i18n = json.load(open(f"{ROOT}/.zcode/audit/i18n-data.json", encoding="utf-8"))

STOP = r"(?=<footer|<div class=\"?post-related|<div class=\"?giscus|</article)"

def body_of(path):
    h = open(path, encoding="utf-8").read()
    m = re.search(r'(<div class="post-content[\s\S]*?)' + STOP, h)
    return m.group(1) if m else ""

def scrub(s):
    # 只剥离内嵌 script（giscus 等）；丢尾部混入的 footer / giscus 壳
    s = re.sub(r"<script[\s\S]*?</script>", "", s)
    m = re.search(r"^[\s\S]*?(?=<footer|<div class=\"?giscus|$)", s)
    s = m.group(0) if m else s
    # 解包外层 post-content div：保留内部，免得破坏 .article-body > p 直接子选择器
    m2 = re.match(r'^\s*<div class="post-content[^>]*>([\s\S]*?)</div>\s*$', s)
    if m2:
        s = m2.group(1)
    return s

zh_gb = scrub(body_of(f"{ROOT}/public/zh/guestbook/index.html"))

data = {
    "zh": {"guestbook": zh_gb},
    "ja": {
        "posts": i18n["ja"]["posts"],
        "about": scrub(i18n["ja"]["about"]),
        "guestbook": scrub(i18n["ja"]["guestbook"]),
        "bodies": {k: scrub(v) for k, v in i18n["ja"]["bodies"].items()},
    },
    "en": {
        "posts": i18n["en"]["posts"],
        "about": scrub(i18n["en"]["about"]),
        "guestbook": scrub(i18n["en"]["guestbook"]),
        "bodies": {k: scrub(v) for k, v in i18n["en"]["bodies"].items()},
    },
}
tag = '<script type="application/json" id="i18n-data">' + json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>"
html = html[:start] + tag + html[main_start:]
open(target, "w", encoding="utf-8").write(html)
print("repaired. size:", len(html))
