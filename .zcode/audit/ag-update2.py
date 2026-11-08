import io
p = 'AGENTS.md'
s = io.open(p, encoding='utf-8', newline='').read()
a = '**间距体系(--sp-)**/**字阶补全'
b = '**间距体系(--sp-*)**/**字阶补全'
assert a in s
s = s.replace(a, b, 1)
c = 'partial 喂三处，卡片/归档行由 ui.css 容器门控 `display:none`（compact 骨架单日期；**配对隐藏前导 sep** 防双 `·`；'
d = 'partial 喂两处，归档行由 ui.css 容器门控 `display:none`（compact 骨架单日期，卡片侧已随堆叠卡退役；**配对隐藏前导 sep** 防双 `·`；'
assert c in s
s = s.replace(c, d, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
