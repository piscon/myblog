import json
A = json.load(open('.zcode/audit/ws-before.json', encoding='utf-8'))['views']
B = json.load(open('.zcode/audit/ws.json', encoding='utf-8'))['views']
order = ['home', 'posts', 'article', 'archives', 'search', 'about', 'tag', 'guestbook', 'notfound']
print('view           tail(before→after)      firstInk(before→after)   scrollH')
for w in (1440, 390):
    print('---', w)
    for v in order:
        k = f'{v}@{w}'
        a, b = A[k], B[k]
        ta = round(a['bands'][-1]['top'] - a['bands'][-2]['ib'], 1)
        tb = round(b['bands'][-1]['top'] - b['bands'][-2]['ib'], 1)
        hdr = 86 if w > 768 else 68
        fa = round(a['bands'][0]['it'] - hdr, 1)
        fb = round(b['bands'][0]['it'] - hdr, 1)
        print(f'{v:10} {ta:>8} → {tb:<8}      {fa:>6} → {fb:<6}      {a["scrollH"]} → {b["scrollH"]}')
print()
print('article body margins after:')
for k in ['article@1440']:
    b = B[k]
    for band in b['bands']:
        if band['s'] in ('table', 'ul', 'ol', 'p', 'h2#一准时得不像人', 'figure.media-embed', 'blockquote'):
            print(' ', band['s'][:24], 'mt', band['mt'], 'mb', band['mb'], 'fs', band['fs'])
print()
print('home@1440 gaps:', [g['gap'] for g in B['home@1440']['gaps']])
print('posts@1440 gaps:', [g['gap'] for g in B['posts@1440']['gaps']])
print('search@1440 gaps:', [g['gap'] for g in B['search@1440']['gaps']])
