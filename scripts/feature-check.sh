#!/usr/bin/env bash
# Feature health check: verify all theme-coupled custom features survive
# theme structure changes by building a test post carrying every custom
# front-matter param and asserting on the rendered HTML.
#
# Usage: bash scripts/feature-check.sh   (run from anywhere; cd's to repo root)
# Writes a pass/fail table to $GITHUB_STEP_SUMMARY when running in CI,
# and dumps the article DOM snapshot on failure for easy selector repair.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
: "${GITHUB_STEP_SUMMARY:=}"

POST="content/zh/posts/feature-check-test.md"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"; rm -f "$POST"' EXIT

mkdir -p static/audio static/video
cat > "$POST" <<'EOF'
+++
title = 'Feature health check'
date = '2026-11-04'
draft = true
audio_file = '/audio/feature-check.mp3'
video_file = '/video/feature-check.mp4'
youtube_id = 'dQw4w9WgXcQ'
bilibili_bvid = 'BV1xx411c7mD'
categories = ['demo']
media_position = 'top'
lastmod = '2026-12-25'
aliases = ['/posts/alias-test/']
tags = ['博客']
+++
test body
EOF

hugo -D -d "$OUT" >/dev/null
PAGE="$OUT/zh/posts/feature-check-test/index.html"

declare -a NAMES=() RESULTS=() FAILS=()
check() {
  NAMES+=("$1")
  if eval "$2"; then
    RESULTS+=("✅")
  else
    RESULTS+=("❌")
    FAILS+=("$1")
  fi
}

# 翻译流水线占位符层离线自测（零 API 调用）：全语料恒等往返 + 旧事故等价攻击拦截
check "翻译占位符保护层自测" "node scripts/translate.mjs --self-test >/dev/null 2>&1"

check "audio 播放器渲染"        "grep -q '<audio src=\"/audio/feature-check.mp3\"' '$PAGE'"
check "video 播放器渲染"        "grep -q '<video src=\"/video/feature-check.mp4\"' '$PAGE'"
check "置顶 CSS 注入(order)"    "grep -q 'post-single>.post-media{order:1' '$PAGE'"
check "og:audio meta"          "grep -q 'property=\"og:audio\"' '$PAGE'"
check "og:video meta"          "grep -q 'property=\"og:video\"' '$PAGE'"
# 根 /favicon.ico 直击（部分抓取器/老浏览器）经 netlify.toml 301 到 /branding/
# 单一事实源（2026-11-06 全站巡检发现根路径 404 后补）
check "品牌 favicon 引用"       "grep -q '/branding/favicon.ico' '$PAGE' && grep -q 'from = \"/favicon.ico\"' netlify.toml && grep -q 'to = \"/branding/favicon.ico\"' netlify.toml"
check "og:image 品牌图"         "grep -q 'branding/og-default.jpg' '$PAGE'"
check "自定义 404 页存在"        "test -f '$OUT/zh/404.html'"
check "404 en 文案分流"         "grep -q 'Page not found' '$OUT/en/404.html'"
# 时效入首屏（2026-11-06）：meta 行「更新于」条目（post_meta.html，Lastmod>+1d 守卫，
# i18n updatedOn 三语键）替代文末 post-lastmod 行——修订过的文章首屏不再只显示旧日期。
# 三语渲染经 first.md 实页验证（其 Lastmod>Date+1d，首屏必出更新条目）。卡片/归档行
# 是否含该条目取决于语料的 lastmod 状态（条件渲染），不作静态断言；其「单日期」视觉
# 由 ui.css 容器门控 token 守卫——条目 display:none + 前导 meta-sep 配对隐藏防双 ·
# （:has(+ .meta-updated)，同 cover.css mobile 门控模式）；extend_post_content 不再
# 输出 post-lastmod（负断言守删除）
check "更新于入首屏meta(门控)"  "grep -q 'meta-item meta-updated' '$PAGE' && grep -q '更新于' '$PAGE' && grep -q 'updatedOn' i18n/zh-CN.toml && grep -q 'updatedOn' i18n/ja.toml && grep -q 'updatedOn' i18n/en.toml && grep -q '最終更新' '$OUT/ja/posts/first/index.html' && grep -q 'Updated on' '$OUT/en/posts/first/index.html' && grep -q '.entry-footer .meta-updated' '$OUT'/assets/css/stylesheet.*.css && grep -q 'meta-sep:has(+.meta-updated)' '$OUT'/assets/css/stylesheet.*.css && ! grep -q '最后更新于' '$PAGE' && ! grep -q 'post-lastmod' '$PAGE' && ! grep -q 'post-lastmod' layouts/_partials/extend_post_content.html"
# 相关文章焦点归位（2026-11-06）：视觉序（ui.css order:5）related 在 footer 后、DOM 序
# （extend_post_content 钩子在主题 single.html 里的位置）在 footer 前，键盘 Tab 焦点
# 与视觉脱节（WCAG 2.4.3）。site.js 把节点搬到 footer 后（无 after-footer 钩子，不开
# single.html tier-3 覆盖），无 JS 时 order:5 仍保持同位——CSS 是回退不是依赖；
# insertAdjacentElement/afterend token 守 bundle（选择器字符串字面量不经 minifier，不盯）
check "相关文章焦点归位(焦点序)" "grep -q 'insertAdjacentElement' '$OUT'/js/site.*.js && grep -q 'afterend' '$OUT'/js/site.*.js && grep -q 'post-related' '$OUT'/js/site.*.js"
check "相关文章推荐渲染"        "grep -q 'post-related' '$PAGE' && grep -q '你好，世界' '$PAGE'"
check "站点 JS 加载"            "grep -q '/js/site\.' '$PAGE'"
check "搜索页输入框存在"        "grep -q 'searchInput' '$OUT/zh/search/index.html' && grep -q '/search/' '$OUT/zh/index.html'"
# 搜索图标(头部独立入口，2026-11-06)：搜索脱离导航菜单——hugo.toml 三语言菜单 search 项
# 删除（主题仅对指向 search 布局页的菜单项附 accesskey=/ 与 "(Alt + /)" tooltip，该串从
# 静态首页消失即菜单项已除；注入图标的 title 是运行时 JS 生成，不污染静态 HTML）；头部
# 改为 site.js 注入 .search-toggle（右侧高频位：.nav-actions 组内、☰ 之前——OS 头部惯例，
# 手机端不进汉堡面板），语言正确的 URL 数据源是 extend_head 每页发的 link[rel=search]
# （head 作数据源，同语言切换器 hreflang 模式）；Ctrl+K 回退同步改 .search-toggle
check "搜索图标(头部独立入口)"  "grep -q 'rel=\"search\"' '$PAGE' && grep -q 'search-toggle' '$OUT'/js/site.*.js && grep -q '.search-toggle{display:inline-flex' '$OUT'/assets/css/stylesheet.*.css && ! grep -q '(Alt + /)' '$OUT/zh/index.html'"
# 头部图标统一(20px Feather+home logo，2026-11-06)：所有头部图标一个形态——logo 文本换
# Feather home（js 加 .logo-home 类留断言钩子；title/aria-label/accesskey=h 保留），主题
# moon/sun 的 17px 属性由 CSS 压到统一 20px（选择器列表是唯一 token：五槽一体，拆散即
# 失去统一约束）；theme-toggle padding 0 .4rem → 12px（44px 触控目标，bundle 后加载同
# 特异性源序胜出——断言必须钉住站点层这条，防止回退到主题值）。同日晚补**图标间距节奏**：
# 主题默认三值不一（.logo 0.55rem→🏠↔🌓 20.8px、.logo-switches 0.4rem→🌓↔🌐 30.4px）——
# 统一为相邻图标对恒 24px glyph 间距（=菜单项 column-gap；图标自带 12px padding，wrapper
# 要么 12px（桌面菜单文字↔搜索）要么 0（手机 🔍↔☰）；| 两侧各 12px 配平靠 .nav-sep
# padding-right；≥769px 搜索 margin-right -12px 贴内容右缘对称贴左的 🏠）——spacing token
# 六条入断言防回退
check "头部图标统一(20px+home)"  "grep -q 'logo-home' '$OUT'/js/site.*.js && grep -q 'logo-text' '$OUT'/js/site.*.js && grep -q '#theme-toggle svg,.lang-toggle svg' '$OUT'/assets/css/stylesheet.*.css && grep -q '.theme-toggle{padding:12px' '$OUT'/assets/css/stylesheet.*.css && grep -q '.logo{column-gap:12px' '$OUT'/assets/css/stylesheet.*.css && grep -q '.logo-switches{gap:0' '$OUT'/assets/css/stylesheet.*.css && grep -q '.nav-sep{padding-right:.35rem' '$OUT'/assets/css/stylesheet.*.css && grep -q '.nav-actions{display:flex;align-items:center;gap:12px' '$OUT'/assets/css/stylesheet.*.css && grep -q '@media screen and (min-width:769px){.search-toggle{margin-right:-12px' '$OUT'/assets/css/stylesheet.*.css && grep -q '.nav-actions{gap:0' '$OUT'/assets/css/stylesheet.*.css && grep -q '.logo-home svg{display:none' '$OUT'/assets/css/stylesheet.*.css && grep -q '.logo-home .logo-text{display:none' '$OUT'/assets/css/stylesheet.*.css && grep -q '.logo-home svg{display:block' '$OUT'/assets/css/stylesheet.*.css"
# 搜索页不自动聚焦(2026-11-06)：主题 fastsearch 在 window load 的 initSearch 里 enable+focus
# 输入框——手机弹软键盘把分类中枢挤出首屏，而访客主要来的是看分类。fastsearch 是主题资产
# 不可改；init 的 focus 只能靠顺序区分（输入框 disabled 到 load 为止、不可点，故必然是元素
# 上第一次 .focus() 调用；reset() 的 Escape 重聚焦、点击都在其后）——site.js 影子化 .focus
# 只吞第一次、其余转发原生；focusNative 属性（minifier 不改属性名）是 Ctrl+K（feature 4）绕
# 过影子的通道，也是本断言的唯一稳定 token（局部变量名会被改名）
check "搜索页不自动聚焦(分类优先)"  "grep -q '.focusNative=' '$OUT'/js/site.*.js && grep -q 'focusNative||' '$OUT'/js/site.*.js"
# 身份层(2026-11-06)：About 页三语（Git 路径，CMS 不可见）+ 头部菜单关于项 + 首页
# profileMode 社交图标（[[params.socialIcons]]：github 真实/email/x 占位——about.md 内文
# 有同款占位注释，拿到真实地址后一并替换）+ 各语言 footer.text 承载 About/RSS/许可链接
# （markdownify 渲染；相对 href 与 head 的绝对 RSS link 形态可区分，token 唯一）
check "身份层(about+社交+许可)"  "test -f '$OUT/zh/about/index.html' && test -f '$OUT/ja/about/index.html' && test -f '$OUT/en/about/index.html' && grep -q '/zh/about/' '$OUT/zh/index.html' && grep -q '/ja/about/' '$OUT/ja/index.html' && grep -q 'github.com/piscon' '$OUT/zh/index.html' && grep -q 'mailto:hello@deux.top' '$OUT/zh/index.html' && grep -q 'href=\"/zh/index.xml\"' '$OUT/zh/index.html' && grep -q 'CC BY-NC-SA' '$OUT/zh/index.html' && test -f static/branding/apple-touch-icon.png && grep -q 'apple-touch-icon.png' '$PAGE' && grep -q 'favicon-32x32.png' '$PAGE'"
# OpenSearch(2026-11-06)：浏览器地址栏注册站内搜索——home 自定义输出格式出 /{lang}/opensearch.xml
# （ShortName/描述/搜索页 permalink 自动跟随语言），head 发 link rel=search
# type=application/opensearchdescription+xml；URL 模板的 ?q= 由 site.js feature 14 消费
# （fastsearch 不读 URL 且 fuse 未就绪时丢事件——回填走 250ms×20 轮询，结果行出现即停）。
# 与 feature 11 的数据源 link 同 rel=search：靠 :not([type]) 区分（断言钉 js 里的
# URLSearchParams，minifier 不改全局名与字符串字面量）
check "OpenSearch(浏览器站内搜索)"  "test -f '$OUT/zh/opensearch.xml' && test -f '$OUT/ja/opensearch.xml' && test -f '$OUT/en/opensearch.xml' && grep -q 'ShortName>二重奏' '$OUT/zh/opensearch.xml' && grep -q 'ShortName>Deux' '$OUT/en/opensearch.xml' && grep -q 'searchTerms' '$OUT/zh/opensearch.xml' && grep -q 'opensearchdescription+xml' '$PAGE' && grep -q 'URLSearchParams' '$OUT'/js/site.*.js"
# 留言板(2026-11-06)：三语 guestbook.md（hideMeta+showtoc=false——留言页不要日期 meta 与空 TOC；
# 正文引导语即内容，giscus 评论区就是留言板本体，Announcements 类目首评自动建 Discussion），
# 入口在各语言 footer.text（无菜单项，头部保持极简）
check "留言板(giscus)"           "test -f '$OUT/zh/guestbook/index.html' && test -f '$OUT/ja/guestbook/index.html' && test -f '$OUT/en/guestbook/index.html' && grep -q '/zh/guestbook/' '$OUT/zh/index.html' && grep -q '/ja/guestbook/' '$OUT/ja/index.html' && grep -q 'id=\"giscus-script\"' '$OUT/zh/guestbook/index.html' && ! grep -q '<details id=\"toc\"' '$OUT/zh/guestbook/index.html'"
# 语言切换器：主题裸输出仅「其他语言」全名（zh 首页/文章页静态可验）；site.js 注入全量常驻
# 列表+当前语言标记。FOUC 门控（全视口）：注入完成前（无 .current-lang 条目）以
# .js+.lang-menu:not(:has(.current-lang)) 先行 visibility:hidden——首帧到注入之间不再闪现
# 主题裸开关（visibility 不位移、裸链接不可点；JS 禁用无 .js 类走主题回退）；token 守 bundle
check "语言切换全名显示"        "grep -q '日本語' '$OUT/zh/index.html' && grep -q 'English' '$OUT/zh/index.html' && grep -q '日本語' '$OUT/zh/posts/ai-update-blog/index.html' && grep -q '.js .lang-menu:not(:has(.current-lang)){visibility:hidden' '$OUT'/assets/css/stylesheet.*.css"
check "aliases 跳转页生成"      "test -f '$OUT/zh/posts/alias-test/index.html'"
check "llms.txt 站点索引生成"    "test -f '$OUT/zh/llms.txt' && grep -q 'Feature health check' '$OUT/zh/llms.txt'"
check "归档页 zh 本地化(年/月)"  "grep -q 'archive-year-header' '$OUT/zh/archives/index.html' && grep -q '2026年' '$OUT/zh/archives/index.html' && grep -q '11月' '$OUT/zh/archives/index.html'"
check "归档页 en 本地化(月名)"   "grep -q 'archive-year-header' '$OUT/en/archives/index.html' && grep -q 'November' '$OUT/en/archives/index.html'"
check "YouTube nocookie iframe"  "grep -q 'youtube-nocookie.com/embed/dQw4w9WgXcQ' '$PAGE'"
check "B站 iframe 播放器"         "grep -q 'player.bilibili.com/player.html?bvid=BV1xx411c7mD' '$PAGE'"
check "分类进元信息行"            "grep -q 'href=.*categories/demo' '$PAGE'"
check "置顶挂载点容器类名"         "grep -q '<article class=\"post-single\">' '$PAGE'"
check "菜单不含分类/标签"          "! grep -q '/zh/categories/' '$OUT/zh/index.html' && ! grep -q '/zh/tags/' '$OUT/zh/index.html'"
check "搜索页分类聚合"            "grep -q 'terms-tags' '$OUT/zh/search/index.html' && grep -q 'categories/demo' '$OUT/zh/search/index.html'"
check "RSS 全文(content:encoded)" "grep -q 'content:encoded' '$OUT/zh/posts/index.xml'"
check "文章页 feed 发现链接"      "grep -q 'application/rss+xml' '$PAGE'"
# x-default 挂在多语言文章上（测试文章是单语言，恰好反向断言不误发）
check "hreflang x-default"       "grep -q 'x-default' '$OUT/zh/posts/ai-update-blog/index.html' && ! grep -q 'x-default' '$PAGE'"
check "RSS 列表页入口按钮"        "grep -q 'aria-label=\"RSS\"' '$OUT/zh/posts/index.html' && grep -q 'aria-label=\"RSS\"' '$OUT/zh/archives/index.html'"
check "theme-color 兜底+双meta"   "grep -q 'name=\"theme-color\" content=\"#1d1e20\"' '$PAGE' && grep -q 'media=\"(prefers-color-scheme: light)\" content=\"#ffffff\"' '$PAGE' && grep -q 'media=\"(prefers-color-scheme: dark)\" content=\"#1d1e20\"' '$PAGE'"
check "排版体系容器类名(耦合点)"   "grep -q 'post-content md-content' '$PAGE'"
check "黄金字阶 CSS 进 bundle"    "grep -q 'hanging-punctuation' '$OUT'/assets/css/stylesheet.*.css && grep -q '2.058em' '$OUT'/assets/css/stylesheet.*.css"
# 间距单位 --u（2026-11-06）：节奏公式（卡距/摘要→meta/搜索结果/折叠标题行 column-gap/锚跳余量）
# 全部挂 u（20px，≤768px 镜像 14px）。勿迁回 --gap——主题 --gap=24px，此前公式误挂 --gap，
# 实渲染 φ⁻¹·gap=14.8px 与全体系注释 12.4px 脱节；--gap 只许页面沟槽（.main/页眉/页脚）用
check "间距单位(--u双断点)" "grep -q -- '--u:20px' '$OUT'/assets/css/stylesheet.*.css && grep -q -- '--u:14px' '$OUT'/assets/css/stylesheet.*.css"
# 字阶补全（2026-11-06）：归档年份 1.272em（主题继承 16px 与条目同阶，仅靠 margin 撑）+
# 首页 profileMode h1 显式流式 clamp（主题零样式，原落 UA 默认 36px）
check "字阶补全(归档年份+首页h1)" "grep -q 'archive-year-header{font-size:1.272em' '$OUT'/assets/css/stylesheet.*.css && grep -q '.profile h1{font-size:clamp(1.35em' '$OUT'/assets/css/stylesheet.*.css"
# 标题梯子全流式（2026-11-06）：h1-h5 与 title 共享 1.2vw 斜率压缩（intercept≈峰值×0.534、
# floor≈峰值×0.656 且 ≥1em）——修「流式标题×固定梯子」窄视口层级倒挂（手机 title 24.3px
# 曾低于正文 h2 29.1px，<~777px 全手机命中；<~1088px 低于正文 h1）
# 注意 minifier 会重排声明序（margin 排到 font-size 前）并剥前导零（1em,.602em），断言只认
# 各自唯一的 clamp 内值，不认完整选择器前缀
check "标题梯子流式(bundle)" "grep -q 'clamp(1.197em' '$OUT'/assets/css/stylesheet.*.css && grep -q 'clamp(1em,.602em' '$OUT'/assets/css/stylesheet.*.css"
# 摘要 eyebrow 标签：完整选择器含 .post-header 前缀（archives/search 复用裸 .post-description，不得命中）+ ja token「概要」（bundle 内唯一）
check "摘要标签(CSS作用域+三语言)" "grep -q '.post-header .post-description::before' '$OUT'/assets/css/stylesheet.*.css && grep -q '概要' '$OUT'/assets/css/stylesheet.*.css"
# 摘要折叠行（2026-11-06）：html.js 门控 grid——eyebrow+chevron 靠左、meta 同排 justify-self 靠右；
# site.js 把描述文本再挂为 .desc-body（header 第 3 行通栏，.desc-open 切换展开）。文本节点不可
# 被 CSS 选中 → grid font-size:0 先帧静音 + .desc-body 显式恢复字号。CSS token 守 minified
# 选择器（空白剔除、结构保留，同汉堡断言形态），JS token 守 bundle（minifier 不改写字符串字面量）
check "摘要折叠行(grid+JS包裹)" "grep -q 'html.js .post-header' '$OUT'/assets/css/stylesheet.*.css && grep -q 'desc-body' '$OUT'/assets/css/stylesheet.*.css && grep -q 'desc-open' '$OUT'/assets/css/stylesheet.*.css && grep -q 'desc-body' '$OUT'/js/site.*.js && grep -q 'desc-open' '$OUT'/js/site.*.js"
# 列表缩略图行依赖主题 DOM 序（cover 先于 header，grid 自动落列）+ :has 门控选择器（须含 .tag-entry 排除）
check "列表缩略图行(CSS门控+DOM序)" "grep -q 'post-entry:not(.tag-entry):has(.entry-cover)' '$OUT'/assets/css/stylesheet.*.css && grep -q '<article class=\"post-entry\">' '$OUT/zh/posts/index.html' && grep -q 'entry-cover' '$OUT/zh/posts/index.html' && [ \"\$(grep -om1 'entry-cover\|entry-header' '$OUT/zh/posts/index.html')\" = 'entry-cover' ]"
# giscus 配色跟随站内主题：初值改写脚本标签属性（依赖 client.js 的 currentScript 语义）+
# 切换经 html[data-theme] postMessage 转发——主题 head 脚本给 <html> 设 data-theme 是前提
check "giscus 主题跟随(耦合点)"  "grep -q 'id=\"giscus-script\"' '$PAGE' && grep -q 'iframe.giscus-frame' '$PAGE' && grep -q 'dataset.theme' themes/PaperMod/layouts/_partials/head.html"
# 元信息行条目类名+图标：post_meta.html 覆盖层输出（图标+类名消歧各段；分类保持真实 <a>）
check "元信息行条目类名+图标"    "grep -q 'meta-item meta-date' '$PAGE' && grep -q 'meta-cats' '$PAGE' && grep -q 'meta-sep' '$PAGE'"
# 作者已从 meta 行整体移除（hideAuthor=true 纯配置；head <meta name=author> 走 author.html 不受影响）；编辑链接已停用
check "作者已移除(head保留)"     "! grep -q 'meta-author' '$PAGE' && ! grep -q 'meta-author' '$OUT/zh/posts/index.html' && ! grep -q 'meta-author' '$OUT/zh/archives/index.html' && grep -q 'name=\"author\"' '$PAGE' && ! grep -q '在 GitHub 上改进本文' '$PAGE'"
# 语言切换同页化：head hreflang 互译链接（主题每页无条件发出）是 site.js 运行时重写
# href 为同页译文 URL 的数据源——HTML 守数据源、JS bundle 守重写逻辑（含 data-lang 打标）
check "语言切换同页(数据源+JS)"  "grep -q 'hreflang=\"ja\"' '$OUT/zh/posts/ai-update-blog/index.html' && grep -q 'hreflang=\"en\"' '$OUT/zh/posts/ai-update-blog/index.html' && grep -q 'hreflang' '$OUT'/js/site.*.js && grep -q 'data-lang' '$OUT'/js/site.*.js"
# 语言列表已收敛：文章页/搜索页无任何翻译列表 DOM（translation_list 空 stub 压掉主题 partial），
# 语言入口仅头部切换器一处；stub 文件须存在且不得把主题列表逻辑克隆回来
check "语言列表已收敛(仅头部)"   "! grep -q 'i18n_list' '$OUT/zh/posts/ai-update-blog/index.html' && ! grep -q 'meta-lang' '$OUT/zh/posts/ai-update-blog/index.html' && ! grep -q '语言:' '$OUT/zh/posts/ai-update-blog/index.html' && ! grep -q 'i18n_list' '$OUT/zh/search/index.html' && test -f layouts/_partials/translation_list.html && ! grep -q 'i18n_list' layouts/_partials/translation_list.html"
# 搜索页分类/标签聚合标题三语本地化（ja/en 曾硬编码中文「分类/标签」）
check "搜索页标题本地化"        "grep -q 'カテゴリ' '$OUT/ja/search/index.html' && grep -q 'Categories' '$OUT/en/search/index.html' && ! grep -q '🧩 分类' '$OUT/ja/search/index.html'"
# 搜索页视觉体系：页面 h1 流式字阶（theme 固定 40px 耦合点）+ 输入框/词条胶囊重皮 + 聚合标题字阶进 bundle；
# emoji 已从标题串移除，Feather 图标在模板层（h2.taxonomy-heading 与 svg 同现，ui.css 按 svg 后代选择器出 1em）
check "搜索页视觉体系(bundle)"   "grep -q '.page-header h1 svg' '$OUT'/assets/css/stylesheet.*.css && grep -q '.searchbox input' '$OUT'/assets/css/stylesheet.*.css && grep -q '.terms-tags a sup sup' '$OUT'/assets/css/stylesheet.*.css && grep -q '.taxonomy-heading' '$OUT'/assets/css/stylesheet.*.css"
check "聚合标题图标(emoji已除)"  "grep -q 'taxonomy-heading' '$OUT/zh/search/index.html' && grep -A2 'taxonomy-heading' '$OUT/zh/search/index.html' | grep -q '<svg' && ! grep -q '🧩\|🏷️' '$OUT/zh/search/index.html'"
# 原生分享按钮（手机）：site.js 运行时注入 navigator.share 入口，并在同一门控下隐藏
# 不可达的 X/Telegram intent 链接（style.display——属性名不被 minifier 改写，token 稳定）；
# 依赖主题 .share-buttons 容器存在；JS token 守 bundle、容器守主题 DOM
# （桌面/无 navigator.share 环境按钮不出现且 intent 链接保留，属预期）
check "原生分享按钮(手机)"       "grep -q 'navigator.share' '$OUT'/js/site.*.js && grep -q 'style.display' '$OUT'/js/site.*.js && grep -q 'share-buttons' '$PAGE'"
# cover.html 站点覆盖（tier-3）：sizes 按上下文分流——列表卡 176px/28vw，单页 720px/100vw（first.md 有 cover 且 slug 稳定）
check "封面 sizes 分流(列表/单页)" "grep -q '176px, 28vw' '$OUT/zh/posts/index.html' && grep -q '720px, 100vw' '$OUT/zh/posts/first/index.html'"
# 分享并入标签行（2026-11-06）：ui.css 把 post-footer 改 grid——第一行 tags 左/share 右、
# 第二行 paginav 通栏；分享去盒装、图标 18px 次级色（CSS 压过主题 svg 的 30px 属性宽高，
# 也压过 site.js 注入的原生分享 svg 26px）。hover 金色门控 @media(hover:hover)（2026-11-06
# 手机点按粘滞 :hover 事故：原生分享不跳转，金色选中态挂到点空白才释放）。耦合点=footer
# 三子元素类名（皆主题 DOM）；minifier 剔空白但保留选择器与值，grid-area/@media token 稳定
check "分享并入标签行(bundle)"   "grep -q 'grid-area:share' '$OUT'/assets/css/stylesheet.*.css && grep -q 'grid-area:nav' '$OUT'/assets/css/stylesheet.*.css && grep -q 'post-footer>.share-buttons svg{width:18px' '$OUT'/assets/css/stylesheet.*.css && grep -q '@media(hover:hover){.post-single>.post-footer>.share-buttons a:hover{color:var(--accent)}' '$OUT'/assets/css/stylesheet.*.css"
# 手机端汉堡菜单（2026-11-06；同日右侧组改造）：site.js 建 .nav-actions 右侧组（.header-nav
# 末位→space-between 行右缘）并把 #menu 移入组内，☰ 收尾落最右缘、🔍 紧邻其左；ui.css
# ≤768px 经 html.js 门控收纳 #menu（**双态选择器**：包裹前 .header-nav>#menu、包裹后
# .nav-actions>#menu——首帧到 site.js 执行之间是前态，漏掉前态会闪折行菜单）、.menu-open
# 展开为下拉面板（面板选择器 (1,3,0) 天然压过隐藏 (1,2,0)，不再依赖源序）——JS 禁用时无
# .js 类，主题折行菜单原样回退；.js 由 extend_head 首帧前内联脚本打上（:has(>.menu-toggle)
# 版本要等 site.js 注入按钮才成立，每次页面跳转都闪一帧折行菜单——FOUC 事故后改定，耦合点
# 含该脚本）。耦合点=主题 .header-nav/#menu 类名 + 自建 .nav-actions；minified CSS token、
# 首帧脚本与 aria-expanded 属性名（minifier 不改写属性名）守 bundle
check "汉堡菜单(手机)"           "grep -q '.js .header-nav>#menu,.js .nav-actions>#menu{display:none' '$OUT'/assets/css/stylesheet.*.css && grep -q '.menu-open .nav-actions>#menu{display:flex' '$OUT'/assets/css/stylesheet.*.css && grep -q 'documentElement.classList.add(.js.)' '$PAGE' && grep -q 'menu-toggle' '$OUT'/js/site.*.js && grep -q 'nav-actions' '$OUT'/js/site.*.js && grep -q 'aria-expanded' '$OUT'/js/site.*.js"
# 手机端语言globe（2026-11-06）：≤768px 内联切换行（原 ZH/JA/EN 短码，双标签 span 已删）收纳为
# site.js 注入的 .lang-toggle（Feather globe，aria-controls=#lang-menu，.logo-switches 末位），
# 点开为汉堡面板同几何的通栏下拉（.lang-open，全名行、当前语言加粗不可点）。隐藏规则
# .js .lang-menu,.js .nav-sep{display:none 与面板规则同特异性 (0,2,0)，面板必须排其后靠源序
# 取胜（同汉堡契约）；桌面 .lang-toggle 基础 display:none 保留内联全名。双面板互斥在 JS 层
# （开启一方关闭另一方）。JS token 守 bundle（类名字面量不经 minifier），CSS token 守
# 收纳/面板/按钮三端
check "语言globe(手机)"          "grep -q 'lang-toggle' '$OUT'/js/site.*.js && grep -q 'lang-open' '$OUT'/js/site.*.js && grep -q 'aria-current' '$OUT'/js/site.*.js && grep -q '.js .lang-menu,.js .nav-sep{display:none' '$OUT'/assets/css/stylesheet.*.css && grep -q '.lang-menu.lang-open{display:flex' '$OUT'/assets/css/stylesheet.*.css && grep -q '.lang-toggle{display:none' '$OUT'/assets/css/stylesheet.*.css && grep -q '.lang-menu li.current-lang svg{width:.9em' '$OUT'/assets/css/stylesheet.*.css"
# 文章导航（2026-11-06）：站点 i18n/{zh-CN,ja,en}.toml 平面键覆盖主题 prev_page/next_page
# （「上一页/下一页」→「上一篇/下一篇」；ja/en 顺带文章化）。文件名规则系实证：zh 必须
# locale 全名 zh-CN.toml（zh.toml 平局输给主题 zh.yaml）、ja/en 必须基名（ja-JP.toml 会把
# 主题 ja.yaml 整体顶掉）；同基名站点 yaml 也被主题同名文件顶掉——见 AGENTS.md 多语言约定。
# « » 箭头是 post_nav_links.html 模板硬编码（模板未动）；分钟/目次/Table of Contents =
# 主题文案存活探针；容器类 paginav 守主题 DOM；移动端标题 2 行 -webkit-line-clamp
# 防 50% 列宽长标题撑高行（token 守 bundle，minifier 剔 > 两侧空白但保留后代空格与选择器）
check "文章导航(文案+移动端限行)" "test -f i18n/zh-CN.toml && test -f i18n/ja.toml && test -f i18n/en.toml && grep -q '上一篇' i18n/zh-CN.toml && grep -q '« 上一篇' '$PAGE' && grep -q '下一篇 »' '$PAGE' && grep -q '分钟' '$PAGE' && grep -q 'class=\"paginav\"' '$PAGE' && grep -q '前の記事' '$OUT/ja/posts/first/index.html' && grep -q '目次' '$OUT/ja/posts/first/index.html' && grep -q 'Previous' '$OUT/en/posts/first/index.html' && grep -q 'Table of Contents' '$OUT/en/posts/first/index.html' && grep -q 'paginav a>span:not(.title)' '$OUT'/assets/css/stylesheet.*.css && grep -q 'webkit-line-clamp' '$OUT'/assets/css/stylesheet.*.css"
# 字体栈（2026-11-06）：自托管 Inter Variable 拉丁切片（static/fonts/v1/，4 片
# latin/latin-ext × 正体/斜体，~48KB/访客，unicode-range 按需）统一三语拉丁/数字；
# 零字节标点层 Punct SC/JP（fonts.css local() 系统字体）把 —— "" …… 交还 CJK 字体
# 全宽渲染（latin-first 栈会被 SF/Segoe 抢渲染成西文窄破折号，12/15 篇 zh 文用 ——）。
# CJK 刻意留系统栈（切片 CJK 网页字体 ~11MB repo / 200-400KB 每访客，调研后放弃）。
# 耦合点：minifier 会把 font-family 值去引号+小写（"Punct SC"→punct sc），
# 但 src local() 的实参保引号保大小写——token 各按各自形态取
check "字体栈(Inter拉丁+标点层)" "grep -q 'punct sc,inter variable' '$OUT'/assets/css/stylesheet.*.css && grep -q 'punct jp,inter variable' '$OUT'/assets/css/stylesheet.*.css && grep -q 'segoe ui variable,segoe ui' '$OUT'/assets/css/stylesheet.*.css && grep -q '/fonts/v1/inter/files/inter-latin-wght-normal.woff2' '$OUT'/assets/css/stylesheet.*.css && grep -q 'local(.PingFang SC.)' '$OUT'/assets/css/stylesheet.*.css && grep -q 'local(.Hiragino Kaku Gothic ProN.)' '$OUT'/assets/css/stylesheet.*.css && grep -q 'font-variant-numeric:tabular-nums' '$OUT'/assets/css/stylesheet.*.css && ls '$OUT'/fonts/v1/inter/files/*.woff2 >/dev/null && grep -q '/fonts' netlify.toml"

FAILED=0
{
  echo "| 断言 | 结果 |"
  echo "|---|---|"
  for i in "${!NAMES[@]}"; do
    echo "| ${NAMES[$i]} | ${RESULTS[$i]} |"
    [ "${RESULTS[$i]}" = "❌" ] && FAILED=1
  done
} >> "$PAGE.summary.md"

if [ -n "$GITHUB_STEP_SUMMARY" ]; then
  cat "$PAGE.summary.md" >> "$GITHUB_STEP_SUMMARY"
else
  cat "$PAGE.summary.md"
fi

if [ "$FAILED" -eq 1 ]; then
  echo "FAILED: ${FAILS[*]}"
  if [ -n "$GITHUB_STEP_SUMMARY" ]; then
    {
      echo "### ❌ DOM 快照（article 区域，用于修复选择器）"
      echo '```html'
      sed -n '/<article class="post-single">/,/<\/article>/p' "$PAGE" | head -c 4000
      echo '```'
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 1
fi
echo "All feature assertions passed."
