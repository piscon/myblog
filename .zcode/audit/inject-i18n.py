#!/usr/bin/env python3
"""把提取的真实翻译作为第二个 JSON script 注入原型。"""
import json, re

ROOT = "/home/piscon/codespace/myblog"
i18n = json.load(open(f"{ROOT}/.zcode/audit/i18n-data.json", encoding="utf-8"))

# zh 留言板引导语（真实站点文案）
def body_of(path):
    h = open(path, encoding="utf-8").read()
    m = re.search(r'(<div class="post-content[\s\S]*?)(?=<footer class="post-footer|<div class="giscus|</article>)', h)
    return m.group(1) if m else ""

zh_gb = body_of(f"{ROOT}/public/zh/guestbook/index.html")

data = {
    "zh": {"guestbook": zh_gb},
    "ja": i18n["ja"],
    "en": i18n["en"],
}
tag = '<script type="application/json" id="i18n-data">' + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "</script>"

target = f"{ROOT}/原型/二重奏-博客界面设计-交互版.html"
html = open(target, encoding="utf-8").read()

anchor = '</script>\n\n<script>\n(function () {'
assert html.count(anchor) == 1, f"anchor count = {html.count(anchor)}"
assert "i18n-data" not in html, "already injected"
html = html.replace(anchor, "</script>\n\n" + tag + "\n\n<script>\n(function () {")
open(target, "w", encoding="utf-8").write(html)
print("injected, file size:", len(html))
