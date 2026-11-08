import io
p = '原型/二重奏-博客界面设计-交互版.html'
s = io.open(p, encoding='utf-8').read()
old = """:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 1px; }"""
new = """:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 1px; }
/* #main is the skip link's target, not a control: the global focus ring
   around it draws a 2px bronze rule across the bottom of every page (its
   lower edge lands exactly on the footer hairline). Rings stay on the
   interactive elements that need them. */
#main:focus { outline: none; }"""
assert s.count(old) == 1, s.count(old)
io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(old, new, 1))
print('main focus ring suppressed')
