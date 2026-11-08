import json
V = json.load(open('.zcode/audit/ws.json', encoding='utf-8'))['views']
bad = []
for k, v in V.items():
    if v['scrollW'] - v['vw'] > 0:
        bad.append(('overflow', k, v['scrollW'] - v['vw']))
    for g in v['gaps']:
        if g.get('overlap'):
            bad.append(('overlap', k, g['from'], g['to'], g['gap']))
print('problems:', bad if bad else 'none')
# tail summary
for w in (1440, 390):
    print('---', w)
    for v in ['home', 'posts', 'article', 'archives', 'search', 'about', 'tag', 'guestbook', 'notfound']:
        x = V[f'{v}@{w}']
        tail = round(x['bands'][-1]['top'] - x['bands'][-2]['ib'], 1)
        print(f"  {v:10} tail={tail:>6}  hdr={round(x['bands'][0]['it']-(86 if w>768 else 68),1):>5}")
