import json, re, sys

def load(p):
    src = open(p, encoding='utf-8').read()
    m = re.search(r'<script type="application/json" id="post-data">(.*?)</script>', src, re.S)
    return src, m.group(1), json.loads(m.group(1))

for p in [r'/tmp/proto-backup.html', r'原型/二重奏-博客界面设计-交互版.html']:
    src, raw, posts = load(p)
    print(p)
    print('  file chars', len(src), ' json chars', len(raw), ' posts', len(posts))
    print('  first 120:', raw[:120].replace('\n', ' '))
    print('  total body chars', sum(len(x['body']) for x in posts))
    print('  spaces after colon:', raw.count('": "'))
    print('  \\u escapes:', raw.count('\\u'))
