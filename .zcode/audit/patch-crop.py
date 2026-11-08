import io
f = '.zcode/audit/ws-crop-fix.mjs'
s = io.open(f, encoding='utf-8').read()
old = ".reveal{opacity:1!important;transform:none!important}`;"
new = ".reveal{opacity:1!important;transform:none!important}#readbar{display:none!important}`;"
assert s.count(old) == 1, s.count(old)
io.open(f, 'w', encoding='utf-8').write(s.replace(old, new, 1))
print('killed readbar in shots')
