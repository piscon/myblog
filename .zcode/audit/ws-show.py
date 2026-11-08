import json, sys

d = json.load(open('.zcode/audit/ws.json', encoding='utf-8'))
views = d['views']

def show(vk, body=False):
    v = views[vk]
    print(f"\n=== {vk}  scrollH={v['scrollH']} vw={v['vw']} wrap={v['wrap']}")
    if v.get('measure'):
        print(f"    measure={v['measure']} cover={v.get('cover')} figcap={v.get('figcap')}")
    for i, b in enumerate(v['bands']):
        print(f"  [{i:02d}] box {b['top']:>7}..{b['bottom']:>7}  ink {b['it']:>7}..{b['ib']:>7}  pad {b['mt']:>6}/{b['mb']:>6} {b['pt']:>6}/{b['pb']:>6} fs{b['fs']:>5} {b['s'][:40]:<40}")
    print("  gaps (ink / box):")
    for g in v['gaps']:
        print(f"    {g['gap']:>7} / {g['boxGap']:>7}   {g['from'][:34]:<34} -> {g['to'][:34]}")

for k in (sys.argv[1:] or [x for x in views if x.endswith('@1440')]):
    show(k)
