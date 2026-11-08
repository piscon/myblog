import json, re

path = r'原型/二重奏-博客界面设计-交互版.html'
src = open(path, encoding='utf-8').read()
m = re.search(r'(<script type="application/json" id="post-data">)(.*?)(</script>)', src, re.S)
posts = json.loads(m.group(2))

for p in posts:
    body = re.sub(r'<pre[\s\S]*?</pre>', '', p['body'])
    body = re.sub(r'<code>[\s\S]*?</code>', '', body)
    text = re.sub(r'<[^>]+>', '\n', body)
    for line in text.split('\n'):
        if '*' in line:
            print('%-18s %s' % (p['slug'], line.strip()[:90]))
