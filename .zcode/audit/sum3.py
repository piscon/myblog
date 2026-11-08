import json
d = json.load(open('r-scale.json', encoding='utf-8'))
for it in d:
    v = it.get('value')
    lab = it.get('label')
    if isinstance(v, dict) and 'vw' in v:
        print('==', lab, 'vw', v['vw'], 'overflowX', v['overflowX'], 'scrollH', v['scrollH'])
        print('   headings', [(h['tag'], h['fs']) for h in v['headings']][:8])
        print('   headKids', [(k['s'].split('.')[-1], k['x'], k['right']) for k in v['headKids']][:6])
        print('   smallTargets', len(v['smallTargets']), 'bleed', len(v['bleed']))
    else:
        print('==', lab, json.dumps(v, ensure_ascii=False))
