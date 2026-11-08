import json, re

path = r'原型/二重奏-博客界面设计-交互版.html'
src = open(path, encoding='utf-8').read()

m = re.search(r'(<script type="application/json" id="post-data">)(.*?)(</script>)', src, re.S)
posts = json.loads(m.group(2))

fix_re = re.compile(r'\*\*([^*<>\n]+)\*\*')
em_re = re.compile(r'(?<![\w*])\*([^*<>\n]+)\*(?![\w*])')


def fix_outside_code(html):
    parts = re.split(r'(<pre[\s\S]*?</pre>)', html)
    changed = 0
    for i, part in enumerate(parts):
        if i % 2 == 1:
            continue
        before = part
        part = fix_re.sub(r'<strong>\1</strong>', part)
        part = em_re.sub(r'<em>\1</em>', part)
        if part != before:
            changed += part.count('<strong>') + part.count('<em>')
        parts[i] = part
    return ''.join(parts), changed


total = 0
for p in posts:
    new, n = fix_outside_code(p['body'])
    if n:
        print('%-18s fixed %d' % (p['slug'], n))
        total += n
    p['body'] = new
print('total fixed:', total)

new_json = json.dumps(posts, ensure_ascii=False, separators=(',', ':'))
src = src[:m.start(2)] + new_json + src[m.end(2):]
open(path, 'w', encoding='utf-8').write(src)

# verify
src2 = open(path, encoding='utf-8').read()
posts2 = json.loads(re.search(r'<script type="application/json" id="post-data">(.*?)</script>', src2, re.S).group(1))
left = 0
for p in posts2:
    body = re.sub(r'<pre[\s\S]*?</pre>', '', p['body'])
    text = re.sub(r'<[^>]+>', '', body)
    hits = fix_re.findall(text) + em_re.findall(text)
    if hits:
        print('LEFT', p['slug'], hits[:3])
        left += len(hits)
print('remaining outside code:', left)
print('script tag closes:', src2.count('</script>'))
