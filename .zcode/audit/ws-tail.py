import json
d = json.load(open('.zcode/audit/ws.json', encoding='utf-8'))
V = d['views']
for w in (1440, 390, 768):
    print('===', w)
    for v in ['home', 'posts', 'article', 'archives', 'search', 'about', 'tag', 'guestbook', 'notfound']:
        k = f'{v}@{w}'
        if k not in V:
            continue
        b = V[k]['bands']
        foot = b[-1]
        tail = round(foot['top'] - b[-2]['ib'], 1)
        hdr = 86 if w > 768 else 68
        print(f"{k:16} tail_to_footer_rule={tail:>6}  first_ink_after_header={round(b[0]['it']-hdr,1):>6}  lastBand={b[-2]['s'][:24]}")
