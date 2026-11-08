import re, os
src = open('.zcode/audit/main.js.txt', encoding='utf-8').read() + open('原型/二重奏-博客界面设计-交互版.html', encoding='utf-8').read()
refs = sorted(set(re.findall(r'assets/[A-Za-z0-9._\-]+', src)))
base = '原型'
for r in refs:
    p = os.path.join(base, r)
    print(('OK  ' if os.path.exists(p) else 'MISS'), r)
