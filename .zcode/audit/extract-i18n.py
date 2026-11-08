#!/usr/bin/env python3
"""从 public/{ja,en} 提取真实翻译，供原型嵌入。"""
import re, json, os, html as H

ROOT = "/home/piscon/codespace/myblog/public"

def read(p):
    return open(p, encoding="utf-8").read()

def strip_ws(s):
    return re.sub(r"\s+", " ", s).strip()

out = {}
for lang in ("ja", "en"):
    data = {"posts": {}, "about": "", "guestbook": "", "bodies": {}}
    base = os.path.join(ROOT, lang, "posts")
    for d in sorted(os.listdir(base)):
        p = os.path.join(base, d, "index.html")
        if not os.path.isfile(p):
            continue
        h = read(p)
        mt = re.search(r'<h1 class="post-title[^"]*"[^>]*>([\s\S]*?)</h1>', h)
        title = strip_ws(re.sub(r"<[^>]+>", "", mt.group(1))) if mt else ""
        md = re.search(r'<div class="post-description">([\s\S]*?)</div>', h)
        desc = strip_ws(re.sub(r"<[^>]+>", "", md.group(1))) if md else ""
        mc = re.search(r'<meta property="og:description" content="([^"]*)"', h)
        if not desc and mc:
            desc = H.unescape(mc.group(1))
        # 正文（排除 related/footer）
        mb = re.search(r'(<div class="post-content[\s\S]*?)(?=<div class="post-related|<footer class="post-footer|<div class="giscus)', h)
        body = mb.group(1) if mb else ""
        data["posts"][d] = {"t": title, "d": desc[:200]}
        if d == "zz-s03":
            data["bodies"][d] = body
    for page in ("about", "guestbook"):
        p = os.path.join(ROOT, lang, page, "index.html")
        if os.path.isfile(p):
            h = read(p)
            mb = re.search(r'(<div class="post-content[\s\S]*?)(?=<footer class="post-footer|<div class="giscus|</article>)', h)
            if mb:
                data[page] = mb.group(1)
    out[lang] = data

json.dump(out, open("/home/piscon/codespace/myblog/.zcode/audit/i18n-data.json", "w", encoding="utf-8"), ensure_ascii=False)
for lang in out:
    ps = out[lang]["posts"]
    print(lang, "posts:", len(ps), "about:", len(out[lang]["about"]), "guestbook:", len(out[lang]["guestbook"]),
          "body zz-s03:", len(out[lang]["bodies"].get("zz-s03", "")))
    for s in ("zz-s03", "cf-auto-translate", "first"):
        print("  ", s, ps.get(s, {}).get("t", "?")[:44])
