import json, collections

d = json.load(open('.zcode/audit/ws.json', encoding='utf-8'))
V = d['views']

print("viewport | view | overflowX | scrollH")
for k, v in V.items():
    ox = v['scrollW'] - v['vw']
    if ox > 0:
        print('  OVERFLOW', k, ox)

print("\n-- box gaps < 8px (可能过挤) at 1440/390 --")
for k, v in V.items():
    if not k.endswith(('@1440', '@390')):
        continue
    tight = [g for g in v['gaps'] if g['gap'] < 8]
    if tight:
        print(' ', k, [(g['from'][:22], g['to'][:22], g['gap']) for g in tight])

print("\n-- distinct margin/padding values in use (home@1440) --")
inv = V['home@1440']['inventory']
vals = [(float(a.replace('px', '')), b) for a, b in inv]
vals.sort()
print(' count', len(vals), ':', ', '.join(f'{a:g}' for a, b in vals))
print('\n all samples, gaps between section heads only:')
for k, v in V.items():
    if k.endswith('@1440'):
        print(' ', k, [g['gap'] for g in v['gaps']])
