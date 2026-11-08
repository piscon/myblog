import io
p = 'scripts/feature-check.sh'
s = io.open(p, encoding='utf-8', newline='').read()
marker = 'echo "All feature assertions passed."'
block = '''# ---- redesign/proto-wiring Phase 6 新增断言（2026-11-08，63→68） ----
# 编辑部式首页（Phase 2，layouts/index.html 覆盖）：masthead+hero+近作+台账四段结构；
# profile_inner 负断言=主题 index_profile 不再渲染
check "编辑部首页(hero+近作+目录入口)" "grep -q '<div class=home>' '$OUT/zh/index.html' && grep -q 'masthead-line' '$OUT/zh/index.html' && grep -q 'hero-title' '$OUT/zh/index.html' && grep -q 'recent-lead\\|recent-item' '$OUT/zh/index.html' && grep -q 'ledger-row' '$OUT/zh/index.html' && ! grep -q 'profile_inner' '$OUT/zh/index.html'"
# 404 出口页（Phase 5 重写）：原型 notfound 结构（大码/三出口/最近 3 篇）三语文件齐
check "404 出口页(三出口+最近)"     "grep -q 'notfound-code' '$OUT/zh/404.html' && grep -q 'notfound-actions' '$OUT/zh/404.html' && grep -q 'notfound-recent' '$OUT/zh/404.html' && test -f '$OUT/ja/404.html' && test -f '$OUT/en/404.html'"
# TOC 右浮（Phase 4，签认③）：右缘定位公式 + 仅 translateY；左浮 translate(-100%,-50%) 负断言根除
check "TOC 右浮(签认③)"            "grep -q 'left:calc(50% + (var(--main-width)/2) + var(--gap))' '$OUT'/assets/css/stylesheet.*.css && grep -q 'details.toc\\[open\\]{position:fixed;top:50%' '$OUT'/assets/css/stylesheet.*.css && ! grep -q 'translate(-100%,-50%)' '$OUT'/assets/css/stylesheet.*.css"
# 衬线 display 层（Phase 1，签认②）：chrome.css --font-display 三语栈进 bundle（minifier 保引号保大小写）
check "衬线 display 层(签认②)"     "grep -q -- '--font-display:\"Iowan Old Style\"' '$OUT'/assets/css/stylesheet.*.css && grep -q 'html\\[lang^=ja\\]' '$OUT'/assets/css/stylesheet.*.css && grep -q 'hero-title{margin:16px 0 0;font-family:var(--font-display)' '$OUT'/assets/css/stylesheet.*.css"
# 评论壳样式（Phase 5）：giscus-wrapper 间距 token 化（内联 style 经 minify 无引号无空格）
check "评论壳样式(间距token)"       "grep -q 'giscus-wrapper style=margin-top:var(--sp-7)' '$OUT/zh/posts/first/index.html'"

'''
assert marker in s
s = s.replace(marker, block + marker, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
