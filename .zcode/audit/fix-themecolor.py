import io
p = r'layouts\_partials\extend_head.html'
s = io.open(p, encoding='utf-8', newline='').read()
a = 'light)" content="#ffffff"'
b = 'light)" content="#f7f3ea"'
c = 'dark)" content="#1d1e20"'
d = 'dark)" content="#16140f"'
assert a in s and c in s
s = s.replace(a, b).replace(c, d)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
