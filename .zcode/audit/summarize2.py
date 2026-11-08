import json, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'r-views.json'
data = json.load(open(path, encoding='utf-8'))
for item in data:
    if 'error' in item:
        print('!! ERROR', item['error']); continue
    label = item.get('label', '')
    v = item.get('value')
    if isinstance(v, dict) and 'contrast' in v:
        print('== %s  overflowX=%s dupIds=%s imgNoAlt=%s imgNoDims=%s imgEmptyAlt=%s' % (
            label, v['overflowX'], v['duplicateIds'], len(v['imgNoAlt']), len(v['imgNoDims']), len(v['imgEmptyAlt'])))
        print('   h1=%s jumps=%s landmarks=%s' % (v['h1Count'], v['headingJumps'], v['landmarks']))
        print('   brokenAria=%s/%s emptyLinks=%s tables=%s code=%s' % (
            v['brokenAriaControls'], v['brokenAriaLabelledby'], v['emptyLinks'], v['tables'], v['codeBlocks']))
        print('   ariaCurrent=%s' % (v['ariaCurrent'][:4],))
        for c in v['contrast']:
            print('     contrast %-16s %-22s %s/%s  -> %s' % (c['sel'], c['color'], c['size'], c['weight'], c['ratio']))
        print('   textWidths=%s' % v['textLengths'])
    else:
        print('== %s' % label)
        print('   %s' % json.dumps(v, ensure_ascii=False)[:1200])
