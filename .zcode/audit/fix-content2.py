import json, re

path = r'原型/二重奏-博客界面设计-交互版.html'
src = open(path, encoding='utf-8').read()
m = re.search(r'(<script type="application/json" id="post-data">)(.*?)(</script>)', src, re.S)
posts = json.loads(m.group(2))

em = re.compile(r'\*([^*\n]{2,}?)\*')
bold = re.compile(r'\*\*([^*\n]+?)\*\*')


def fix(html):
    parts = re.split(r'(<pre[\s\S]*?</pre>)', html)
    n = 0
    for i, part in enumerate(parts):
        if i % 2:
            continue
        part, a = bold.subn(r'<strong>\1</strong>', part)
        part, b = em.subn(r'<em>\1</em>', part)
        n += a + b
        parts[i] = part
    return ''.join(parts), n


total = 0
for p in posts:
    p['body'], n = fix(p['body'])
    if n:
        print('%-18s converted %d' % (p['slug'], n))
        total += n
print('converted:', total)

src = src[:m.start(2)] + json.dumps(posts, ensure_ascii=False, separators=(',', ':')) + src[m.end(2):]
open(path, 'w', encoding='utf-8').write(src)

# verify: no stray asterisks outside pre/code
src2 = open(path, encoding='utf-8').read()
posts2 = json.loads(re.search(r'<script type="application/json" id="post-data">(.*?)</script>', src2, re.S).group(1))
bad = 0
for p in posts2:
    body = re.sub(r'<pre[\s\S]*?</pre>', '', p['body'])
    body = re.sub(r'<code>[\s\S]*?</code>', '', body)
    body = re.sub(r'<[^>]+>', '\n', body)
    for line in body.split('\n'):
        if '*' in line:
            print('LEFT', p['slug'], line.strip()[:80])
            bad += 1
print('lines with stray *:', bad)
print('strong count:', src2.count('<strong>'), 'em count:', src2.count('<em>'))
