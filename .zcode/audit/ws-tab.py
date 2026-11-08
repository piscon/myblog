import json
d = json.load(open('.zcode/audit/ws.json', encoding='utf-8'))
V = d['views']
order = ['home', 'posts', 'article', 'archives', 'search', 'about', 'tag', 'guestbook', 'notfound']
for w in (1440, 390):
    print(f"\n### {w}px")
    print(f"{'view':10} {'hdr→1st':>8} {'tail':>6} {'scrollH':>8}  gaps")
    for v in order:
        k = f'{v}@{w}'
        x = V[k]
        first = x['bands'][0]['it']
        hdr = 86 if w > 768 else 68
        tail = round(x['bands'][-1]['it'] - x['bands'][-2]['ib'], 1)
        gaps = [g['gap'] for g in x['gaps']]
        print(f"{v:10} {first-hdr:>8.1f} {tail:>6.1f} {x['scrollH']:>8}  {gaps}")
