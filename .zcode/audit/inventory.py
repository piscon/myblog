#!/usr/bin/env python3
"""盘点线上站构建产物(public)的页面结构与组件，输出 Markdown 摘要。"""
import re, os, glob, json

ROOT = "/home/piscon/codespace/myblog/public/zh"

PAGES = {
    "home": "index.html",
    "posts": "posts/index.html",
    "archives": "archives/index.html",
    "search": "search/index.html",
    "about": "about/index.html",
    "guestbook": "guestbook/index.html",
    "tags": "tags/index.html",
    "categories": "categories/index.html",
    "404": "404.html",
}

def clean(html):
    html = re.sub(r"<(style|script)[\s\S]*?</\1>", "", html)
    return html

def outline(html, maxn=80):
    body = clean(html)
    out = []
    for m in re.finditer(r"<(\w+)((?:\s+[\w-]+(?:=\"[^\"]*\")?)*)\s*/?>", body):
        tag = m.group(1)
        attrs = m.group(2) or ""
        cm = re.search(r'class="([^"]*)"', attrs)
        cls = (cm.group(1) if cm else "").strip()
        if tag in ("p", "span", "li", "a", "time", "em", "strong", "code", "td", "tr", "th", "button", "path", "svg", "use", "img", "link", "meta", "br", "ol", "ul", "kbd", "mark", "del", "sup", "figcaption"):
            if tag not in ("button", "img"):
                continue
        if tag == "div" and not cls:
            continue
        out.append(f"{tag}{'.' + '.'.join(cls.split()[:3]) if cls else ''}")
    return out[:maxn]

def title_of(html):
    m = re.search(r"<title>(.*?)</title>", html, re.S)
    return m.group(1).strip() if m else ""

def h1s(html):
    return re.findall(r"<h1[^>]*>([\s\S]*?)</h1>", clean(html))

report = []
report.append("# 线上站(public/zh)结构盘点\n")
for name, rel in PAGES.items():
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        report.append(f"## {name}: 缺 {rel}\n")
        continue
    html = open(p, encoding="utf-8").read()
    report.append(f"\n## {name}  ({rel})  title={title_of(html)!r}\n")
    report.append("outline: " + " > ".join(outline(html, 60)) + "\n")

# 文章页
arts = sorted(glob.glob(os.path.join(ROOT, "posts/*/index.html")))
report.append(f"\n# 文章页共 {len(arts)} 篇\n")
# 选一篇长的看元素顺序
pick = None
for a in arts:
    h = open(a, encoding="utf-8").read()
    if pick is None or len(h) > len(open(pick, encoding="utf-8").read()):
        pick = a
h = open(pick, encoding="utf-8").read()
report.append(f"\n## 最长文章: {pick} ({len(h)//1024}KB)\n")
report.append("outline: " + " > ".join(outline(h, 90)) + "\n")

# term 页
terms = sorted(glob.glob(os.path.join(ROOT, "tags/*/index.html")))[:3]
terms += sorted(glob.glob(os.path.join(ROOT, "categories/*/index.html")))[:2]
for t in terms:
    h = open(t, encoding="utf-8").read()
    report.append(f"\n## term {t.replace(ROOT,'')}  title={title_of(h)!r}\n")
    report.append("outline: " + " > ".join(outline(h, 40)) + "\n")

# 元信息行、卡片、giscus 等 token 检查
tokens = {
    "posts 卡片": ("posts/index.html", "post-entry"),
    "卡片封面": ("posts/index.html", "entry-cover"),
    "摘要 clamp": ("posts/index.html", "entry-content"),
    "meta 图标": ("posts/index.html", "post-meta"),
    "分页": ("posts/index.html", "pagination"),
    "giscus": ("guestbook/index.html", "giscus"),
    "文章分享": (pick.replace(ROOT+"/", ""), "share-buttons"),
    "相关文章": (pick.replace(ROOT+"/", ""), "related"),
    "paginav": (pick.replace(ROOT+"/", ""), "paginav"),
    "代码复制按钮": (pick.replace(ROOT+"/", ""), "copy"),
    "灯箱": (pick.replace(ROOT+"/", ""), "lightbox"),
    "搜索分类聚合": ("search/index.html", "search-"),
    "opensearch": ("index.html", "opensearch"),
}
report.append("\n# token 检查\n")
for label, (rel, tok) in tokens.items():
    p = os.path.join(ROOT, rel)
    ok = tok in open(p, encoding="utf-8").read() if os.path.exists(p) else False
    report.append(f"- {label} (`{tok}` in {rel}): {'有' if ok else '无'}")

print("\n".join(report))
