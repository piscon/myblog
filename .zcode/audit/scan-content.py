import json, re, sys, html

path = r'原型/二重奏-博客界面设计-交互版.html'
src = open(path, encoding='utf-8').read()
m = re.search(r'<script type="application/json" id="post-data">(.*?)</script>', src, re.S)
posts = json.loads(m.group(1))
print('posts:', len(posts))
for p in posts:
    body = p['body']
    text = re.sub(r'<[^>]+>', '', body)
    text = html.unescape(text)
    hits = []
    for pat, name in [(r'\*\*[^*]+\*\*', 'bold **'), (r'(?<![\w*])\*[^*\n]{2,}\*', 'em *'), (r'`[^`]+`', 'code`'), (r'\[[^\]]+\]\([^)]+\)', 'link')]:
        for mm in re.finditer(pat, text):
            hits.append((name, mm.group(0)[:40]))
    if hits:
        print('  %-18s %s' % (p['slug'], hits[:6]))
    # heading ids vs text sanity, empty body
    if not body.strip():
        print('  EMPTY BODY:', p['slug'])

# global checks on the whole file
print('--- file checks ---')
print('100vh uses:', len(re.findall(r'100vh', src)), re.findall(r'[^;{]*100vh[^;}]*', src)[:6])
print('dvh uses:', len(re.findall(r'dvh', src)))
print('clamp count:', len(re.findall(r'clamp\(', src)))
print('h1 count:', len(re.findall(r'<h1', src)))
print('aria-current variants:', sorted(set(re.findall(r'aria-current="([^"]+)"', src))))
print('hreflang values:', sorted(set(re.findall(r'hreflang="([^"]+)"', src))))
print('lang values:', sorted(set(re.findall(r'lang="([^"]+)"', src))))
