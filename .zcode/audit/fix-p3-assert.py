import io
p = 'scripts/feature-check.sh'
s = io.open(p, encoding='utf-8', newline='').read()
lines = s.split('\n')
for i, l in enumerate(lines):
    if '列表文字目录' in l and l.startswith('check'):
        print('OLD:', l[:120])
        lines[i] = 'check "列表文字目录(年份分组+分页器)" "grep -q \'year-group\' \'$OUT/zh/posts/index.html\' && grep -q \'post-row\' \'$OUT/zh/posts/index.html\' && grep -q \'p-title\' \'$OUT/zh/posts/index.html\' && ! grep -q \'post-entry\' \'$OUT/zh/posts/index.html\' && ! grep -q \'entry-cover\' \'$OUT/zh/posts/index.html\' && grep -q \'year-group\' \'$OUT/en/posts/index.html\' && grep -q \'.list-pager{display:flex\' \'$OUT\'/assets/css/stylesheet.*.css && grep -q \'.pager-num.is-current\' \'$OUT\'/assets/css/stylesheet.*.css"  # 分页器守 CSS token：现语料恰好 10 篇不出 pager（feature-check -D 含草稿才会 >10，不可依赖）'
        break
else:
    raise SystemExit('not found')
io.open(p, 'w', encoding='utf-8', newline='').write('\n'.join(lines))
print('done')
