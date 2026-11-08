import json, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'r-layout.json'
data = json.load(open(path, encoding='utf-8'))
for item in data:
    if 'error' in item:
        print('ERROR', item['error']); continue
    v = item['value']
    print('== %s  vw=%s scrollW=%s overflowX=%s bodyFs=%s' % (item['label'], v['vw'], v['scrollW'], v['overflowX'], v['bodyFs']))
    for k in v['headKids']:
        print('   kid %-24s x=%-7s r=%-7s %sx%s %s' % (k['s'], k['x'], k['right'], k['w'], k['h'], k['d']))
    lw = v.get('langWrap') or {}
    mb = v.get('menuBtn') or {}
    print('   langWrap display=%s w=%s | menuBtn display=%s x=%s' % (lw.get('d'), lw.get('w'), mb.get('d'), mb.get('x')))
    print('   bleed=%s %s' % (len(v['bleed']), v['bleed'][:4]))
    print('   clipped=%s %s' % (len(v['clipped']), v['clipped'][:3]))
    print('   smallTargets=%s/%s %s' % (len(v['smallTargets']), v['targetCount'], v['smallTargets'][:5]))
    print('   headings=%s' % [(h['tag'], h['fs']) for h in v['headings']][:8])
