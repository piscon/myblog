# PaperMod 能力清单（扩展点为主）

**PaperMod v8.0-152-g1181196**（提交 `118119693`，git submodule 锁定 `themes/PaperMod/`，每周自动 PR 跟 upstream master）；Hugo 最低版本 **0.158.0**（`theme.toml` min_version，`layouts/baseof.html:1-3` 构建期 errorf 强制）；本仓库 Hugo 0.169.0（netlify.toml）。最后核验：**2026-11-04**。
结论以本地源码为权威（路径均相对 `themes/PaperMod/`），wiki 结论标注链接；冲突时以源码为准。

## a. 内置功能清单

- 首页三模式：Regular（默认）/ `homeInfoParams`（`_partials/home_info.html`）/ `profileMode`（`_partials/index_profile.html`，本站在用）
- 全文搜索：Fuse.js（`assets/js/fuse.basic.min.js` + `fastsearch.js`），依赖 home 输出 JSON（`layouts/index.json`）；`searchHidden` 页面可排除出索引（index.json）、排除出 `llms.txt`；快捷键 ↑/↓/Enter/Esc，搜索页 accesskey=/
- 归档页 layout（`layouts/archives.html`）：按年聚合、可选全站页（`ShowAllPagesInArchive`）、页码（`ShowPageNums`）、RSS 按钮
- TOC（`_partials/toc.html`）：自研标题解析（非 Hugo `.TableOfContents`，`UseHugoToc` 可切回），details/summary 可折叠，`TocOpen` 默认展开
- 标题锚点（`_partials/anchored_headings.html`）、阅读时间/字数（`_partials/post_meta.html`）、上一篇/下一篇（`_partials/post_nav_links.html`）、面包屑（`_partials/breadcrumbs.html`）
- 封面图（`_partials/cover.html`）：页面 bundle 图片自动 srcset 响应式（360/480/720/1080/1500）、`linkFullImages` 点击看原图、caption 走 markdownify
- 明暗主题 light/dark/auto + 切换按钮（localStorage `pref-theme`，`head.html:141-184`、`footer.html:115-130`）、代码复制按钮（`footer.html:128` 起）、回到顶部按钮（`footer.html:100-113`，滚动超一屏出现）
- 分享按钮（`_partials/share_icons.html`）：x（自动带 tags 作 hashtags）/linkedin/reddit/facebook/whatsapp/telegram，`ShareButtons` 可白名单
- 多语言：i18n 46 种语言；header 语言切换、`languageAltTitle`、翻译版本列表（`_partials/translation_list.html`）
- SEO：production env 下注入 og / twitter_cards / schema_json（`head.html:189-194`）+ canonical；RSS（`layouts/rss.xml`，`ShowFullTextinRSS` 控制全文）；`layouts/robots.txt`；`robotsNoIndex` 单页禁索引（head.html:4）；`canonicalURL` 外部来源（`_partials/post_canonical.html`）
- 多作者（`_partials/author.html`，author 为 string 或 list）、草稿标记（`single.html:8-15`）、AccessKeys（h/t//c 等）
- 图片渲染钩子（`layouts/_markup/render-image.html`）、llms.txt 输出（`layouts/llms.txt`，站点 markdown 索引）
- GA 接入：`head.html:190` 调 `google_analytics.html`——**主题未随附此文件**，回退到 Hugo 内嵌 `embedded/templates/_partials/google_analytics.html`（站点可同名覆盖，见 c.2）
- 短代码：`audio` / `video`（自带 muted）/ `collapse` / `figure`（覆盖 Hugo 内建）/ `inTextImg` / `ltr` / `rtl` / `rawhtml`（`layouts/_shortcodes/`）
- 「置顶」：无专用 pinned 功能；wiki 以 `weight` 页面变量排序置顶（[Variables](https://github.com/adityatelange/hugo-PaperMod/wiki/Variables) Page Variables）。注意本仓库术语「置顶」另有所指＝播放器置顶注入（见 e）。

## b. 参数清单

`.Param` 查找顺序：页面 front matter → site/language params（Hugo 内建），参数名大小写不敏感（本站 `showtoc` 小写即生效）。✅=本仓库 hugo.toml 已用。

**站点级（Site Params）**

| 组 | 参数 | 说明（源码位置） |
|---|---|---|
| 基础 | `env` ✅ | `production` 时启用 GA/og/twitter/schema（head.html:189）、robots 放行（robots.txt） |
| | `title` / `description` ✅ / `keywords` ✅ / `author` ✅（可 list）/ `images` ✅（og/twitter 兜底图，rss.xml:40）| head.html:11-24 |
| | `copyright` | Hugo 站点变量，footer 版权行支持 markdown（footer.html:4-10） |
| | `DateFormat` | post_meta.html，默认 `:date_long` |
| 品牌 | `label.text/icon/iconHeight/iconSVG` | header 左上 logo；icon 支持 assets 路径（可 Resize）或外链；iconSVG 须 `<svg` 开头字符串 |
| 资产 | `assets.favicon/favicon16x16/favicon32x32/apple_touch_icon/safari_pinned_tab` ✅ / `theme_color` / `msapplication_TileColor` / `disableFingerprinting` | head.html:65-94 |
| 主题 | `defaultTheme` ✅ / `disableThemeToggle` | head.html:141-184；auto 模式读 prefers-color-scheme |
| 首页 | `profileMode.enabled/title/subtitle/imageUrl/imageWidth/imageHeight/imageTitle/buttons[].name/url` ✅ | index_profile.html:2-35 |
| | `homeInfoParams.Title/Content/AlignSocialIconsTo` | home_info.html |
| | `socialIcons[].name/title/url` ✅（三语言各自配置） | social_icons.html:3 |
| 列表 | `ShowReadingTime` ✅ / `ShowWordCount` ✅ / `ShowShareButtons` ✅ / `ShareButtons` / `ShowPostNavLinks` ✅ / `ShowBreadCrumbs` ✅ / `ShowCodeCopyButtons` ✅ / `disableSpecial1stPost` | wiki Variables；special1st 见 list.html:59 |
| | `mainSections`（归档范围）/ `ShowAllPagesInArchive` / `ShowRssButtonInSectionTermList` / `ShowPageNums` / `ShowFullTextinRSS` | archives.html:30-32、list.html:12,102,110、rss.xml:65 |
| | `hideMeta` / `hideSummary` / `hideAuthor` / `hideFooter` / `footer.text` / `footer.hideCopyright` / `disableScrollToTop` ✅ / `disableAnchoredHeadings` | list.html:82-89、footer.html:1,13、post_meta.html:15 |
| TOC | `showtoc(ShowToc)` ✅ / `tocopen(TocOpen)` ✅ / `UseHugoToc` | single.html:33、toc.html |
| 搜索 | `fuseOpts`（Fuse.js 全量选项，经 js.Build 注入） | head.html:75；[Features](https://github.com/adityatelange/hugo-PaperMod/wiki/Features) |
| SEO | `analytics.google/bing/yandex/naver.SiteVerificationTag` | head.html:26-37（GA 账号 ID 走 Hugo `services.googleAnalytics`，非主题参数） |
| | `schema.publisherType` ✅（Person） / `schema.sameAs`（list） | schema_json.html:5,15-16 |
| | `CanonicalLinkText` / `displayFullLangName` / `disableLangToggle` / `Taxonomies.tag`（语言级，文章 tag 分类名） | post_canonical.html、header.html、single.html:48 |
| | `editPost.URL/Text/appendFilePath/disabled` | edit_post.html:1-8 |

**页面级（front matter）**

| 参数 | 作用（源码位置） |
|---|---|
| `showtoc` / `tocopen` / `UseHugoToc` | 单页 TOC 开关/默认展开/切换 Hugo 原生 TOC（single.html:33、toc.html） |
| `hidemeta` / `hideAuthor` / `hideSummary` / `hideFooter` | 逐项隐藏 meta 行（single.html:22-29）、作者（post_meta.html:15）、列表摘要（list.html:82）、页脚（footer.html:1） |
| `comments` | 启用 comments.html 占位区（single.html:62-64） |
| `description` | 标题下摘要段 + meta description（single.html:17-21、head.html:21-23） |
| `canonicalURL` + `ShowCanonicalLink` + `CanonicalLinkText` | 外部来源文章的 canonical 与署名链接（head.html:25、post_canonical.html） |
| `disableShare` | 单页关分享（single.html:57）；`ShareButtons` 可页面级覆盖白名单 |
| `searchHidden` | 移出搜索索引与 llms.txt（index.json、llms.txt） |
| `placeholder` | 搜索页输入框文案（search.html:24） |
| `robotsNoIndex` | meta robots 置 noindex（head.html:4） |
| `author`（string/list） | 单页作者覆盖（author.html） |
| `weight` | 列表排序，等效置顶（wiki Variables） |
| `cover.image/alt/caption/relative/responsiveImages/hidden/hiddenInList/hiddenInSingle` | 封面图族（cover.html） |
| `images` | og/twitter 兜底图（get-page-images.html:2,17） |
| `audio` / `videos` | **保留名**：og 数组参数，见 d |

多数站点级布尔参数亦可页面级覆盖（`.Param` 回退机制）。

**仓库约定**：内容媒体字段用 `audio_file`/`audio_url`/`video_file`/`video_url`/`youtube_id`/`bilibili_bvid`（CMS 校验 ID 格式）——非主题参数，由站点钩子消费（见 e）。

## c. 扩展点清单（核心）

### c.1 显式钩子 partial（主题留占位文件，站点同名文件自动生效）

| 钩子 | 调用点 | 上下文 | 缓存注意 |
|---|---|---|---|
| `extend_head.html` | `_partials/head.html:186`（baseof.html:16 引入 head） | 每个 HTML 页 `<head>` 末尾；**不受 env 门控**，本地与生产都执行；上下文＝当前页 | 无缓存，每页执行 |
| `extend_footer.html` | `_partials/footer.html:42` | 页脚文本之后、页脚 JS（回到顶部/主题切换/复制代码）之前 | footer 经 `partialCached`，缓存键 `(.Layout .Kind hideFooter ShowCodeCopyButtons)`（baseof.html:28）——**同键页面共享输出**，勿放逐页内容 |
| `extend_post_content.html` | `layouts/single.html:45` | `.post-content` 之后、`.post-footer`（tags/分享）之前，仅文章页 | 无缓存 |

主题自带的三个钩子文件均为空占位；站点在 `layouts/_partials/` 放同名文件即整体接管。weekly PR 不触碰站点文件，冲突风险≈0。

调用点源码摘录（便于核对）：
- `head.html:186`：`{{- partial "extend_head.html" . -}}`，其后仅隔 env 门控的 Misc 块（head.html:189-194：GA/og/twitter/schema）——extend_head 是进入 `<head>` 的最后一个站点可写入口。
- `footer.html:42`：`{{- partial "extend_footer.html" . }}`，其后是菜单高亮/回到顶部/主题切换/复制代码四段 JS。
- `single.html:45`：`{{- partial "extend_post_content.html" . }}`，位于 `</div><!-- post-content -->` 与 `<footer class="post-footer">`（tags/post_nav/share）之间——本站播放器即借位渲染。

### c.2 隐式钩子（主题调用但不随附 → 回退机制）

- `google_analytics.html`（head.html:190，仅 production env）：主题无此文件，但调用不炸构建——因为该名字能解析到 Hugo 内嵌模板（project → theme → embedded 逐级查找）；站点可放 `layouts/_partials/google_analytics.html` 完全接管。注意这不是「静默跳过」：若名字连 embedded 也匹配不到，构建直接失败（见 hugo-capabilities.md 第 2 节实测）。本站未使用。
- `comments.html`：主题自带**空占位**（注释区），`single.html:63` 由页面参数 `comments` 门控；站点同名接管即可接入评论系统（giscus/utterances 等）。本站未启用。

### c.3 CSS 注入（拼接顺序见 `_partials/head.html:47-63`）

1. **`assets/css/extended/*.css`**（首选）：`resources.Match "css/extended/*.css"` 拼成 extended.css，**在 core 之后**追加（head.html:59,63）——同名即覆盖 CSS 变量/类。按文件名字典序拼接（命名 `01-xx.css` 可控序）。本站在用（见 e）。
2. `assets/css/common/*.css`：同 Match 机制并入 **core**（head.html:51,58，位于 zmedia 媒体查询之前）。站点可加同目录新文件注入，但与上游 common 语义耦合更深，优先用 extended。
3. `resources.Get` 单名引用（`css/core/theme-vars.css` / `reset.css` / `zmedia.css` / `css/includes/chroma-styles.css|chroma-mod.css`，head.html:47-55）：Hugo 项目 assets 挂载优先于主题——站点放**同路径同名**文件即整体替换，属高危覆盖（weekly PR 上游改这些文件时不会合并到站点副本），除非有意锁定否则勿用。
4. CSS 变量体系（`assets/css/core/theme-vars.css`）：`--theme --entry --primary --secondary --tertiary --content --code-block-bg --code-bg --border --gap --main-width --nav-width --radius` 等，light/dark 各一套（`:root[data-theme="dark"]`）——extended 里改变量即完成全站配色定制。
5. 代码高亮：要求 `markup.highlight.noClasses = false`（head.html:53 注释）；配色由主题拼接的 `css/includes/chroma-styles.css` 提供（不在 Hugo config 里配 style 类，改色走 extended 覆盖 chroma 类）。

### c.4 模板覆盖面（站点 `layouts/` 同路径同名即接管）

全部主题模板（47 个，= 可覆盖清单；站点同名路径即接管）：

- 页面模板（10）：`baseof.html`、`single.html`、`list.html`、`taxonomy.html`、`archives.html`、`search.html`、`404.html`、`index.json`、`llms.txt`、`robots.txt`（rss.xml 见下）
- partial（20）：`head`、`footer`、`header`、`cover`、`toc`、`post_meta`、`post_nav_links`、`post_canonical`、`breadcrumbs`、`author`、`comments`、`edit_post`、`translation_list`、`share_icons`、`social_icons`、`svg`（图标链）、`home_info`、`index_profile`、`anchored_headings`、3 个钩子占位（extend_head/extend_footer/extend_post_content）
- SEO 模板（4，`_partials/templates/`）：`opengraph.html`、`twitter_cards.html`、`schema_json.html`、`_funcs/get-page-images.html`（三者均覆盖 Hugo 内嵌模板）
- RSS：`rss.xml`；渲染钩子：`_markup/render-image.html`
- 短代码（8，`_shortcodes/`）：`audio`、`video`、`collapse`、`figure`（覆盖 Hugo 内建）、`inTextImg`、`ltr`、`rtl`、`rawhtml`

- **风险模型（weekly PR）**：站点覆盖文件是独立副本，上游对同名文件的后续改动**不会**自动同步——覆盖=从此自己维护该文件。低风险姿势：只借 `define "main"` 结构重写块内容（本站 404/archives 即如此，不复制主题内部细节）；高风险姿势：整文件复制后小改（footer/header/head 这类高频改动文件尤其如此——上游本次 HEAD 提交正是 footer 键盘导航修复）。
- **partialCached 缓存键**（baseof.html:24,28）：header 按 `.Page` 缓存；footer 按 `.Layout .Kind (.Param "hideFooter") (.Param "ShowCodeCopyButtons")` 缓存。接管这两个 partial 时，内部若读取其它页面参数，须自行把参数并入缓存键或改用非缓存调用。
- og/twitter/schema 三模板是 Hugo 内嵌模板的**主题级覆盖**（[Template_Overrides](https://github.com/adityatelange/hugo-PaperMod/wiki/Template_Overrides)）；站点层再覆盖时注意 production env 门控（head.html:189-194）。

### c.5 图标体系

`_partials/svg.html` 单文件 if/else 链：`socialIcons[].name` 小写匹配，内含约 100 个平台图标（github/youtube/twitter/x/bilibili/rss/email 等，全表见 [Icons wiki](https://github.com/adityatelange/hugo-PaperMod/wiki/Icons)）；**未知 name 不报错**，回退渲染一个链形占位 SVG（svg.html 尾部 `else if $icon_name`）。新增图标＝站点覆盖整个 svg.html（文件大、上游新增图标时无法自动跟进，高合并风险）——优先从内置表选名。

### c.6 其它可扩展面

- 菜单：`menu.main` 项支持 `Pre`/`Post` 注入 HTML（本站搜索项塞 SVG）；菜单项 `KeyName` 指向 layout 为 `search` 的页面时自动获得 accesskey=/（header.html）。
- i18n：站点 `i18n/<lang>.yaml` 覆盖主题词汇（46 种语言自带；常用键 `read_time`、`words`、`code_copy`、`code_copied`、`toc`、`edit_post`、`share_on`、`previous_post`/`next_post` 等，见 `i18n/zh.yaml`）。
- 短代码/render hook：站点新增 `_shortcodes/*`、`_markup/*` 零冲突（勿与主题同名）；注意 AGENTS.md——CMS 正文禁写 shortcode，高级排版走 Git 路径。

**新增定制的推荐路径（按风险从低到高）**：① extend_* 三钩子（零冲突）；② assets/css/extended/ 新文件（零冲突）；③ 新短代码/新 render hook/新 i18n（零冲突）；④ 参数/菜单/i18n 配置（零冲突，受 weekly PR 语义变化影响仅理论存在，feature-check 兜底）；⑤ 覆盖低频改动模板（404/archives——本站现状）；⑥ 覆盖高频模板（head/footer/header/cover/og——仅在钩子不够用时，须整文件自维护并加 feature-check 断言）。

## d. 不可动区

1. **`themes/PaperMod/` submodule 本体禁改**：weekly PR 按上游 master 硬同步，任何本地提交会被冲掉；一切定制必须落在站点层（layouts/assets/hugo.toml）。
2. **`audio` / `videos` 是保留参数名**：`_partials/templates/opengraph.html:52-58` 以 `{{ range . | first 6 }}` 消费并逐项 `absURL`——**必须是字符串数组**；误当单字符串用会产出坏 meta。站点自有媒体一律用其它字段名（本站 `audio_file`/`video_file` 等），og meta 由 extend_head 补发（AGENTS.md 约定的出处）。
3. `label.iconSVG` 必须是 `<svg` 开头的字符串（header.html 有 hasPrefix 门控，否则图标不渲染）。
4. GA/og/twitter/schema、robots 放行均系于 `env = "production"`（head.html:189、robots.txt）——本站已设，改动 hugo.toml env 会连锁关闭 SEO 输出。
5. `baseURL` 必须与 Netlify 主域一致（apex 无 www，AGENTS.md 已知边界）。
6. `markup.highlight.noClasses` 必须为 `false`（head.html:53 依赖 chroma-styles.css 按类着色）。

## e. 与本仓库的对接现状

**钩子**：`layouts/_partials/extend_head.html`＝①按 `audio_file`/`video_file` 补发 og:audio/og:video meta；②`media_position: "top"` 时注入 flex order CSS 把 `.post-media` 提到正文上方（2026-11-04 起该 CSS 同时编排 `.post-lastmod`）。`layouts/_partials/extend_post_content.html`＝六个媒体字段（audio_file/audio_url/video_file/video_url/youtube_id/bilibili_bvid）渲染 HTML5 播放器或 nocookie/B 站 iframe，统一 `.post-media` 包裹；末尾输出「最后更新于/Last updated/最終更新」行（`.Lastmod` 晚于日期一天以上才显示）与「相关文章」块（Hugo Related Content，tags/categories 加权，≤3 条）。`layouts/_partials/comments.html`＝giscus 评论接线（2026-11-04；凭据在 `hugo.toml [params.giscus]`，留空不渲染）。`extend_footer` 未用。

**CSS（assets/css/extended/，4 个）**：`cover.css`、`post-media.css`（播放器样式+top 布局）、`search-icon.css`、`ui.css`（`404.css` 已于 2026-11-04 删除——`.not-found` 类只存在于自带内联样式的独立 404 页，进全局样式表纯属死重）。

**模板覆盖**：`layouts/404.html`（全自定义页）；`layouts/archives/list.html`（归档页，define "main" 块级重写；2026-11-04 由三语言变体合并为单份语言感知文件）。

**hugo.toml 已用参数**：env、description、author、keywords、images、defaultTheme=auto、ShowReadingTime、ShowWordCount、ShowPostNavLinks、ShowBreadCrumbs、ShowCodeCopyButtons、ShowShareButtons、showtoc、tocopen、disableScrollToTop、cover.hiddenInList/hiddenInSingle、assets.favicon 系列（指 `/branding/`）、schema.publisherType=Person；三语言各自的 profileMode（enabled+title/subtitle/imageUrl/buttons）、socialIcons（youtube/twitter/github）、menu.main（含搜索 SVG+accesskey）。顶层：home 输出含 JSON（搜索前提）、frontmatter lastmod `:git`。

**品牌资产**：`static/branding/`（CMS 不可见）；内容图 `static/images/`；自托管小音频 `static/audio/`，视频目录 `static/video/` 但**视频文件不进 git**（Netlify 配额），线上依赖外链/Embed。

**回归保障**：`scripts/feature-check.sh` 12 项断言（audio/video 播放器、置顶 order CSS、og:audio/og:video、品牌 favicon、og:image、404 页、归档 zh/en 本地化、YouTube nocookie iframe、B 站 iframe）——新增主题耦合功能必须同步加断言（weekly PR、build-check 两处执行；CMS 体检按钮已于 2026-11-04 移除）。

**已知边界**（AGENTS.md）：YouTube iframe 大陆不可达；B 站 iframe 480p 封顶。

---
**wiki 参考**（部分旧页已并入新页：Configuration-Options/Settings/Integrations → Variables；抓取旧 URL 返回 wiki 首页）：[Features](https://github.com/adityatelange/hugo-PaperMod/wiki/Features) · [Variables](https://github.com/adityatelange/hugo-PaperMod/wiki/Variables) · [Icons](https://github.com/adityatelange/hugo-PaperMod/wiki/Icons) · [Template_Overrides](https://github.com/adityatelange/hugo-PaperMod/wiki/Template_Overrides)。源码/wiki 差异点：无（`disableSpecial1stPost`、og audio/videos 数组、weight 置顶等均与源码一致核实）。
