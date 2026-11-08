import io
p = 'AGENTS.md'
s = io.open(p, encoding='utf-8', newline='').read()
edits = [
# 25 列表视图约定 → 文字目录
("- **列表视图约定（2026-11-07 二次改定：逐值照抄 Ghost Casper；行式形态 2026-11-05~11-06 已废，同日早间的「映射本站字阶」方案亦废）**",
 "- **列表视图约定（2026-11-08 改定：年份分组文字目录，签认①；**推翻 11-07 Casper 堆叠卡**，行式/堆叠卡形态均废）**"),
# 25 内文关键词组（分段替换长条目内要点）
("`/posts/` 等列表页卡片为 **image-top 堆叠卡**，**全部数值照抄 Casper screen.css 原样**（Casper `html{font-size:62.5%}` 即 1rem=10px，换算 px 直写——用户拍板「全部对齐」，放弃早间映射到黄金字阶的方案）：封面 `aspect-ratio: 1.818`（=55% spacer）**直角**（img radius 在卡作用域清零——base 圆角是单页封面的，Casper 卡图无圆角）；图下距 32px；卡距 `4.8vmin`（≤768px 40px，ui.css/cover.css）；标题 **26px/800/1.2/-0.01em、不截断**（主题从未声明 heading 字重=UA 700、列表行高 1.3，均覆盖）；摘要 **16px/1.5/clamp 3**、上距 12px；meta **13px**、上距 12px，构成=**日期 · 阅读时间**（**分类已移出卡片 meta**——Casper 卡无分类；分类入口=搜索中枢+文章页 meta 行；回退=删 cover.css `.meta-cats` 两条 :has 配对规则）；**meta 行无分隔符、纯间距，Feather 图标保留**（2026-11-07 同日三改：圆点实装后用户拍板「不要圆点也不能紧贴」——sep span 转纯 spacer，`visibility:hidden` 静音 `·`、nbsp 夹宽即间距，文章页 `.post-meta` 同处理，归档行仍显 `·`；图标此前也曾按逐值对齐隐藏、同日拍板回补——图标是卡级唯一保留的偏离；配对契约不变）；hover=标题 opacity **0.9**（Casper 原值，`@media(hover:hover)` 门控）。",
 "`/posts/` 与 term 页统一为**年份分组文字目录**（`layouts/_default/list.html` 覆盖，tier-3）：`.year-group`（156px 列 + 衬线年份标签 60px/0.95 + N 篇计数）× `.post-row`（**01.02 日期** 56px（年份归组标签，行日期不重复）/ **22px 衬线标题** / 分类 / 读时 58px 右对齐，hairline 行分隔、组间 --sp-8）；分类 term 页自动 **no-cat** 变体（常量分类删列）；页头 h1 保留 RSS 按钮 + 「N 篇」计数（i18n `postsUnit`：篇/件/entries）。hover=标题 opacity 0.9（`@media(hover:hover)` 门控）。**数字分页器**：窗口式（首尾+当前±1+省略号），`pagerSize = 10`；现 zh 语料恰好 10 篇不出 pager 属预期（第 11 篇点亮；机制经 `hugo -D` 草稿构建实测）——**feature-check 用 -D 构建，草稿会撑出分页，断言不可守 pager DOM**，改守 CSS token。"),
("**u/φ 节奏体系退出卡片内部**（卡内全 Casper px；`--u` 仍管搜索行/term 行/页沟槽——两套节奏并存是拍板代价）；meta tabular-nums 保留；sep 兄弟配对契约喂三表面（卡片/文章页 sep 已静音为纯间距，配对契约本身不变，勿动）。**手机 = Casper 原样**：单列 40px 卡距、标题 26px 不降级不截断、摘要 clamp 3——**已接受代价（用户签认）：CJK 26px 在 ~347px 列 ≈13 字/行 且长标题永不截断**（推翻早先「18px 2 行截断」的手机决定，该决定是行式布局产物）。无封面条目=纯文字卡、高度自然参差（Ghost 行为）。**term 行（tag-entry）回归纯主题样式**：共享字阶条已删，term 标题=主题 24px/1.3/700（一次性 22.9→24px 漂移，换干净归属权）；≤349px 隐 meta-cats 规则保留（现只实际服务 term 行）。**页沟槽保持 14px**（拍板：`--gap` 是全站手机档身份层——.main/页眉/页脚/菜单共用，不对齐 Casper 的 max(4vmin,20px)=20px；沟槽差属页面层身份差，非卡片形态）。文章页封面/meta 不受影响（基础 `.entry-cover` 1.91:1 + sizes 统一 720px/100vw，见 cover.html tier-3 条目）。主题耦合点：①DOM 序 cover 先于 header（image-top 恰需 cover 在前，天然满足）；②**所有列表规则必须带 `:not(.tag-entry)`**——term 页 figure 在 DOM 但被主题 display:none，裸选择器会误命中。feature-check「列表堆叠卡(CSS门控+DOM序)」守 `:not(.tag-entry)` 门控 token + **`--thumb` 负断言**（行式机制根除守卫）+ DOM 序 cover-first + `<article class=\"post-entry\">`；两次改版断言 token 未变。历史：2026-11-05 初稿~11-06 横向缩略图行（1:1 方图 176/110px 新闻 App 形态）→2026-11-07 早 Casper 形态+字阶映射→同日晚逐值照抄定稿",
 "**Casper 堆叠卡已根除（2026-11-08）**：cover.css 只剩 `.entry-cover` 基础规则（现仅服务文章页封面与首页 hero），ui.css 卡片/`.entry-footer` 规则删除，`post-entry` DOM 不再在任何列表渲染；「分类移出列表 meta」升级为「首页与列表页分类一律纯文本」（term 页标题即分类，文章页 meta 行保留真实 `<a>` 不变）。taxonomy 索引页（/categories/ /tags/）保持主题 terms-tags chips 页（不覆盖）；archives 保留既有台账覆盖（完整索引不分页，归档断言全保）。页沟槽 `--gap` 约定不变。主题耦合点：**list.html 整文件覆盖**（weekly PR 碰主题 list.html 需人工 re-diff，文件头有注释）；feature-check「列表文字目录(年份分组+分页器)」守 DOM token（year-group/post-row/p-title）+ `post-entry`/`entry-cover` 负断言 + CSS `.list-pager{display:flex`/`.pager-num.is-current` token。历史：2026-11-05 缩略图行 → 11-07 Casper 堆叠卡（db03baf）→ 11-08 文字目录定稿（签认①）"),
# 35 feature-check 清单
("- `bash scripts/feature-check.sh`：63 项断言覆盖所有主题耦合点（",
 "- `bash scripts/feature-check.sh`：68 项断言覆盖所有主题耦合点（"),
("/**间距单位(--u双断点)**/", "/**间距体系(--sp-)**/"),
("**间距单位(--u双断点)**", "**间距体系(--sp-*)**"),
("**列表堆叠卡**", "**列表文字目录(年份分组+分页器)**"),
("62→63（**文章图文三档破格(bundle)**——Casper kg-width 系统 #wide/#full 上线，守两档选择器+50vw 公式+1200px 几何）",
 "62→63（**文章图文三档破格(bundle)**——Casper kg-width 系统 #wide/#full 上线，守两档选择器+50vw 公式+1200px 几何）；2026-11-08 接线施工 63→68（「间距单位(--u双断点)」→「间距体系(--sp-*)」——--u 退役，--sp-1…9+section/head/tail 全站换轨，含 `--u:` 负断言；「列表堆叠卡」→「列表文字目录(年份分组+分页器)」签认①落地；**新增五条**：编辑部首页(hero+近作+目录入口，profile_inner 负断言)/404 出口页(三出口+最近)/TOC 右浮(右缘公式+左浮 transform 负断言)/衬线 display 层(--font-display 三语栈)/评论壳样式(giscus margin token)；「更新于入首屏meta(门控)」改 archive 侧 token（卡片侧退役）；「封面 sizes(统一720)」改守首页 hero+文章页（列表无封面）；「404 en 文案分流」升三语字符串守卫（404 出口页重写）；「theme-color」值改 #f7f3ea/#16140f；翻译自测 node<20 自动升本地 v26（WSL 默认 node 18 跑不了的既有环境坑））"),
# 37 元信息行约定
("`layouts/_partials/post_meta.html`（站点覆盖，一个 partial 喂三处：文章页 `.post-meta`/列表卡 `.entry-footer`/归档行 `.archive-meta`）",
 "`layouts/_partials/post_meta.html`（站点覆盖，喂两处：文章页 `.post-meta`/归档行 `.archive-meta`；原列表卡 `.entry-footer` 已随 2026-11-08 堆叠卡退役）"),
("现存四处：ui.css 卡片/归档行隐藏 meta-updated、cover.css 手机隐藏 meta-read、typography.css 文章页头部 ≤768px 隐 meta-read / ≤420px 隐 meta-updated（摘要折叠行行宽预算，见黄金字阶条目末尾）",
 "现存三处：ui.css 归档行隐藏 meta-updated、typography.css 文章页头部 ≤768px 隐 meta-read / ≤420px 隐 meta-updated（摘要折叠行行宽预算，见黄金字阶条目末尾；卡片侧规则已随堆叠卡退役）"),
# 43 cover.html 条目
("img sizes 统一为 `720px/100vw`（堆叠卡改造后列表封面同为全宽槽位，`IsSingle` 三元分支已删——weekly re-diff 范围缩小）",
 "img sizes 统一为 `720px/100vw`（`IsSingle` 三元分支已删；2026-11-08 列表文字目录后列表无封面 DOM，sizes 现服务文章页封面 + 首页 hero——断言守 zh/index.html+文章页）"),
# 57 文章页元素顺序 margin 补偿
("**margin 补偿**精确还原主题块布局间距（flex 不塌缩 margin：content 10/30、media 0/24、footer-top 0；改任何一侧 margin 前先重算边界",
 "**margin 补偿**（flex 不塌缩 margin：**2026-11-08 编辑部间距**——header 落点 `--sp-head`（64/48px，原 24px）、content 上边界 `--sp-8` 64px（原型 70px 近值，原 10px）、content 下界 30、media 0/24、footer-top 0；改任何一侧 margin 前先重算边界"),
# 58 响应式 TOC 左→右
("**≥1280px 目录悬浮**于正文**左**侧空白、**视口垂直居中**（右缘离内容列 `--gap`；`top:50%` + `translate(-100%,-50%)`，不再贴顶遮头部；",
 "**≥1280px 目录悬浮**于正文**右**侧空白（**2026-11-08 签认③**，原左侧已废）、**视口垂直居中**（浮层左缘离内容列右缘 `--gap`：`left:calc(50% + (var(--main-width)/2) + var(--gap))` + 仅 `translateY(-50%)`；形态=原型款**透明底+左侧发丝线+14px 内衬**，非盒——旧「translate(-100%,-50%) 左浮」已根除并有负断言；"),
# 59 字体栈 衬线层
("**升级字体**：",
 "**衬线 display 层（2026-11-08 签认②）**：chrome.css 的 `--font-display`（**零下载系统衬线栈**，按 html[lang] 分语种——zh=Iowan/Palatino+Songti/SimSun/Noto Serif SC、ja=+Hiragino Mincho/Yu Mincho/Noto Serif JP、en=纯拉丁+Georgia）只上品牌与页面 h1 面（logo/hero-title/post-title/page-header h1），正文仍 Inter；fonts.css 零改动、删 chrome.css 该段即可回退；feature-check「衬线 display 层(签认②)」守 bundle token（minifier 对 font-family 值**保引号保大小写**：`--font-display:\"Iowan Old Style\"`）。**升级字体**："),
]
n_ok = 0
for old, new in edits:
    if old in s:
        s = s.replace(old, new, 1)
        n_ok += 1
    else:
        print('MISS:', old[:60])
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('applied', n_ok, '/', len(edits))
