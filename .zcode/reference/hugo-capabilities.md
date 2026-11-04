# Hugo 能力清单（站点层功能设计参考）

> **Hugo 0.169.0 extended**（`netlify.toml` 锁定 `HUGO_VERSION`）；最后核验：2026-11-04；官方文档 https://gohugo.io/documentation/
>
> 核验方式：抓取 gohugo.io 当前文档（与 0.169 匹配，页面 Last updated 2026-10/11）+ 本地 `hugo v0.169.0+extended` 实测构建 + 仓库文件核对；个别未逐字核实的细节已标注。
> 定位：服务「以站点层 Hugo 为主设计功能」——新功能逻辑尽量全放站点层（`layouts/`、`assets/`、`hugo.toml` params），不改主题；故重点为**功能设计会用到的能力面**，每节附官方文档 URL。

---

## 1. 内容模型

**Page kinds**（https://gohugo.io/methods/page/kind/ ）

- `.Kind` 返回 5 种：`home` / `page` / `section` / `taxonomy` / `term`。

**Page bundles**（https://gohugo.io/content-management/page-bundles/ ）

- leaf bundle：`index.md` 所在目录，kind=page，无后代；附属文件全经 `.Resources` 访问，page 类型资源也不单独成页。
- branch bundle：`_index.md` 所在目录，kind 为 home/section/taxonomy/term，可有后代；顶层目录（含 home）天然是 branch bundle。
- headless bundle：front matter `headless: true` 或 `build` 选项（render/list=never），内容与资源可被引用而不发布。

**Archetypes**（https://gohugo.io/content-management/archetypes/ ）

- `hugo new content` 按 `archetypes/` 模板生成新内容，模板动作会被求值；查找顺序 项目 → 主题 → 内置 default。
- 可按内容类型建专用 archetype（`--kind`），也可为 leaf bundle 建目录型 archetype（子目录需至少一个占位文件）。
- 本站仅 `archetypes/default.md`。

**Front matter**（https://gohugo.io/content-management/front-matter/ ）

- 保留字段（不可自定义重名）：`date`/`lastmod`/`publishDate`/`expiryDate`/`draft`/`title`/`linkTitle`/`slug`/`url`/`aliases`/`description`/`keywords`/`weight`/`type`/`layout`/`outputs`/`menu(s)`/`cascade`/`build`/`resources`/`sitemap`/`translationKey`/`isCJKLanguage` 等，各有对应 Page 方法。
- **自定义字段必须放 `params` 下**；模板读取用 `.Params.xxx` 或 `.Param "xxx"`；`cascade` 可从祖先向下批注后代。

**Taxonomies**（https://gohugo.io/content-management/taxonomies/ 、 https://gohugo.io/configuration/taxonomies/ ）

- 默认 `category=categories`、`tag=tags`；在 `[taxonomies]` 新增时必须**显式带上默认两个**；key 单数、value 复数。
- front matter 以 value（复数）为字段名，单个 term 也写数组；term 排序权重用 `<taxonomy>_weight`（如 `tags_weight`）。
- term 元数据：为 term 建 branch bundle（`content/authors/jsmith/_index.md`）加任意 front matter；关闭用 `disableKinds = ['taxonomy','term']`。

**多语言**（本站 zh/en/ja，https://gohugo.io/content-management/multilingual/ ）

- 翻译关联两种方式：文件名语言后缀（`about.en.md`）或分目录 `contentDir`（**本站用后者**）；`translationKey` 可无视路径强行配对。
- `slug`/`url` 可本地化 URL，0.167 起 section 的 `slug` 下传后代路径；leaf bundle 资源在翻译副本间自动继承（同名文件当前语言优先、再按语言 weight）。
- 本地化输出：`time.Format ":date_full"`、`lang.FormatCurrency`/`FormatNumber`/`FormatPercent`。
- 本站要点：`defaultContentLanguage = "zh"` + `defaultContentLanguageInSubdir = true`（zh 也发布到 `/zh/`，Netlify 404 重定向即指向 `/zh/404.html`）；`hasCJKLanguage = true` 影响字数/阅读时间/摘要。

---

## 2. 模板体系（主题锁定 PaperMod 下最核心的一节）

**目录约定**（v0.146 新模板体系，https://gohugo.io/templates/ ）

- 规范位置：`layouts/_partials/`、`layouts/_shortcodes/`、`layouts/_markup/`（render hook，可放任意层级）。
- 旧式路径仍兼容：`layouts/partials/`、`_default/`、扁平单文件（如 PaperMod 的 `archives.html`）。

**baseof**（https://gohugo.io/templates/base/ ；PaperMod 在 `layouts/baseof.html`，已核实）

- 应用条件：被套用的模板必须**只含 `define` 动作**（外加空白与注释），否则按原样执行、不套 base；base 的 `block` 被子模板同名 `define` 替换。

**模板类型与回退链**（https://gohugo.io/templates/base/ ）

- 专用类型：home / page / section / taxonomy / term；list 是 home+section+taxonomy+term 的回退；single 是 page 的回退；`all` 是最终回退（可按 `.Kind` 分支）。

**查找顺序**（https://gohugo.io/templates/lookup-order/ ）

- 影响参数（特异性从高到低）：Kind → Layout（front matter）→ Output Format（名+后缀，如 `index.amp.html`）→ Language（文件名语言标签：`index.fr.amp.html` 胜 `index.amp.html`，`index.amp.html` 胜 `index.fr.html`）→ Type → Section。
- **关键规则原文**：「Templates can live in either the project's or the themes' layout directories, and the most specific templates will be chosen. Hugo will interleave the lookups listed below, finding the most specific one either in the project or themes.」——站点 `layouts/` 与主题 `layouts/` 进入**同一条查找序列交错比对、取最具体匹配**。
- 这就是站点层覆盖主题的机制：站点放一个「同标识、更匹配」的模板即赢，无需复制主题其余部分。
- 配合语言标签可按语言覆盖（曾用 `layouts/archives/list.zh.html|ja|en` 三语言变体；2026-11-04 合并为单份语言感知 `layouts/archives/list.html`，`_index.md` 改定点引用 `layout = "archives/list"`——覆盖数量收敛原则）。

**partial**（https://gohugo.io/functions/partials/include/ 、 https://gohugo.io/functions/partials/includecached/ ）

- `partials.Include`（别名 `partial`）：返回执行结果，partial 内 `return` 可返回任意类型值。
- partial **不感知**调用处页面，输出格式由文件扩展名决定（`.json` → string 需转义；`.html` → template.HTML 不转义）；0.167 起 partial 内支持 `./`、`../` 相对路径。
- `partials.IncludeCached`（别名 `partialCached`）：按 variant 参数生成缓存键，缓存按语言（site）隔离；context 必填（无则传 `nil`）。

**缺失 partial 的行为（重点核实结论）**

- 本地实测（0.169.0，最小站点）：`{{ partial "不存在.html" . }}` → **构建直接失败**：`ERROR ... error calling partial: partial "不存在.html" not found`；`partialCached` 亦同。**「静默跳过」不成立。**
- PaperMod 钩子体系的真实机制是**「主题自带空 stub + 站点同名覆盖」**：主题 `_partials/` 自带 `extend_head.html` / `extend_post_content.html` / `extend_footer.html` 三个仅含注释的 stub（自述「Can be overwritten by partial with the same name in the global layouts」，git 历史显示自最早 #44 就存在）；调用点为**无条件** `{{- partial "extend_head.html" . -}}`（head.html:186、single.html:45、footer.html:42，已核实）；站点层放同名文件后经查找规则覆盖 stub。
- 防御性写法：`{{ if templates.Exists "_partials/foo.html" }}`——参数相对 layouts 目录（项目+主题都算），**不是** `partials/foo.html`。https://gohugo.io/functions/templates/exists/
- 结论：AGENTS.md 简记「Hugo 对缺失 partial 静默跳过」**在 0.169.0 实测不成立**，钩子体系的基础是 stub+覆盖而非静默跳过。
- 推论：任何模板引用不存在的 partial 都会炸构建；新增钩子要么主题有 stub、要么主题侧加 `templates.Exists` 条件，站点侧不能凭空调用主题没有的 partial。

---

## 3. 资源管线（assets/）

**获取资源**（https://gohugo.io/functions/resources/get/ 、 https://gohugo.io/functions/resources/match/ ）

- `resources.Get`（单个）、`resources.Match`/`resources.GetMatch`（通配）、`resources.GetRemote`（远程，受 security.http 允许清单约束，建议 `try` 包裹）、页面资源用 `.Resources.Get`；调用 `Permalink`/`RelPermalink`/`Publish` 才落盘。

**变换**（https://gohugo.io/functions/resources/concat/ 、 https://gohugo.io/functions/resources/minify/ 、 https://gohugo.io/functions/resources/fingerprint/ ）

- `resources.Concat TARGET [资源...]`：拼接同 media type 资源，target path 兼作缓存键。
- `minify`（`resources.Minify`）：支持 CSS/JS/JSON/HTML/SVG/XML。
- `fingerprint`（`resources.Fingerprint`，算法 md5/sha256 默认/sha384/sha512）：文件名嵌入 hash，`.Data.Integrity` 给 SRI 值，配 `crossorigin="anonymous"`。

**CSS / JS 工具链**

- `css.Sass`（https://gohugo.io/functions/css/sass/ ）：**extended 版内置 LibSass**，本版直接可用；但文档注明 LibSass 自 v0.153 弃用、将移除，迁移路径是 PATH 上装 Dart Sass（Netlify 镜像需另装）——升级 Hugo 前留意。选项：outputStyle/enableSourceMap/includePaths/vars（经 `hugo:vars` 命名空间把 hugo.toml params 注入 Sass 变量）。
- `css.PostCSS`（https://gohugo.io/functions/css/postcss/ ）：需 Node + npm 依赖 + 配置文件，`inlineImports` 可内联 `@import`；本站目前不需要。
- `js.Build`（https://gohugo.io/functions/js/build/ ）：esbuild 封装（bundle/TS/JSX/tree-shake/minify/sourcemap）；`params` 选项把配置注入 JS（`import * as params from '@params'`）；支持 node_modules。

**本站模式（`assets/css/extended/*.css` 的基础）**

- PaperMod `head.html`：`{{- $extended := resources.Match "css/extended/*.css" | resources.Concat "assets/css/extended.css" | resources.Minify }}`（common 系列同理，已核实）。
- 即**往 `assets/css/extended/` 扔 css 文件即生效，按文件名顺序拼进最终样式表**；本地构建产物为 `public/assets/css/stylesheet.<sha256>.css`（已核实），与 netlify.toml 对 `/assets/*` 的 immutable 缓存配套。

**资源缓存**

- 处理结果缓存于 `resources/` 目录；提交它可让 CI 跳过重编译（对 Sass/图片处理有效，前提未改缓存位置且 `useResourceCacheWhen` 非 never，见 css.Sass 页）。

---

## 4. 图片处理

（https://gohugo.io/content-management/image-processing/ ）

- 来源三种：页面资源（`.Resources.Get`）、全局资源（`resources.Get`）、远程资源（`resources.GetRemote`+`try`）。
- 方法：`.Resize` / `.Fill`（裁剪+缩放）/ `.Fit`（降采样适配）/ `.Crop` / `.Filter`（滤镜链）/ `.Process`（规格串统一入口，如 `"resize 300x webp"`、`"400x q80"`）；结果被缓存（CI 可复用）；处理时元数据不保留（EXIF 用 `.Meta` 从原图取）。
- 格式支持（官方表）：JPEG/PNG/GIF/TIFF/WebP/AVIF/BMP 可处理转换；SVG/ICO/HEIC/HEIF 不可 transform；WebP 输出即在规格串加 `webp`。
- 全局默认参数（quality、anchor、resample 等）在 `[imaging]` 配置节（https://gohugo.io/configuration/imaging/ ，键名细节未逐字核实）。
- 本站现状：内容图走 `static/images/`（原样复制、不经管线）；管线能力可用于未来生成缩略图/社交卡图。

---

## 5. 输出格式与安全

**Output formats**（https://gohugo.io/configuration/output-formats/ ）

- 内置 15 种：html/rss/json/sitemap/robots/404/alias/amp/css/csv/markdown/calendar/gotmpl/webappmanifest/sitemapindex；每个定义 mediaType/baseName/isPlainText/isHTML/permalinkable/ugly/rel/path 等。
- `[outputs]` 按 kind 配置启用项；页面级用 front matter `outputs`；自定义用 `[[outputFormats.xxx]]` 定义后挂到某 kind。
- 本站：`[outputs] home = ["HTML","RSS","JSON"]`——JSON 即 PaperMod 搜索用的 `index.json`。

**安全模型**（https://gohugo.io/about/security-model/ ）

- `layouts` 与 `assets`/`data`/`i18n`/`static`/`archetypes`/`resources` 可信；`content` **不可信**（例外：开启 inline shortcodes 即视为信任内容逻辑与数据）；默认 Markdown 渲染做消毒；静态输出大幅缩小攻击面；依赖经 `go.sum` 校验，不匹配即失败。

**security 配置**（https://gohugo.io/configuration/security/ ，构建期沙箱允许清单）

- `exec.allow`（默认 sass/go/git/node/postcss）、`http.urls`（默认禁 localhost/数字 IP/内网地址，约束 `resources.GetRemote`）、`funcs.getenv`（默认 `^HUGO_`、`^CI`）。
- `enableInlineShortcodes`（默认 false；本站 2026-11-04 起保持 false——content 属不可信层，CMS collaborator 走 Source 模式可写入 inline shortcode 语法并在构建期执行任意模板函数；仓库零使用，Git 路径如需再开）、`node.permissions`（Node 子进程细粒度限制）、`allowContent`（0.162 起，默认禁 content 目录的 HTML/Org 格式）。
- 一般无需改动；放宽前想清楚信任边界。

**CSP**

- Hugo 不生成 CSP 响应头——HTTP 头属部署层，本站由 `netlify.toml` `[[headers]]` 管理（现只有 Cache-Control/ACAO）；要加 CSP 也是加在那层，与 Hugo 构建无关；Hugo 的 security 配置只管构建期行为。

---

## 6. data / shortcodes / menus / i18n

**Data**（https://gohugo.io/templates/data-templates/ ）

- 项目 `data/` 目录（JSON/TOML/YAML/XML，**不放 CSV**）合并为单一结构经 `site.Data` 访问，主题 data 一并合并且**项目优先**。
- 通用做法：`resources.Get` + `transform.Unmarshal`（全局/页面/远程资源皆可）；data 亦可用于 content adapters 动态生成内容。
- 本站**没有** `data/` 目录（未使用）。

**Shortcodes**（https://gohugo.io/templates/shortcode/ 、 https://gohugo.io/content-management/shortcodes/ ）

- 自定义模板放 `layouts/_shortcodes/`（旧 `shortcodes/` 兼容），查找按 名称/输出格式/语言；模板方法：`.Get`/`.Inner`/`.InnerDeindent`/`.Page`/`.Params`/`.Ordinal`/`.Position`/`.IsNamedParams` 等；嵌入式 shortcode（youtube、figure 等）由 Hugo 内置提供。
- 本站约束：**文章正文不写 shortcode**（Pages CMS 编辑器会破坏语法），高级排版走 Git 路径；`enableInlineShortcodes = false`（安全收紧，理由见第 5 节 security）。

**Menus**（https://gohugo.io/content-management/menus/ ）

- 三种定义方式：`sectionPagesMenu` 自动、front matter `menus`、项目配置（**本站用第三种**：per-language `[[languages.xx.menu.main]]`，站内入口用 `pageRef`）。
- 条目属性：`identifier`（同名/本地化时必填）、`name`、`parent`（嵌套）、`pre`/`post`（本站搜索项用它塞 SVG 图标）、`params`、`title`、`weight`。

**i18n**（https://gohugo.io/functions/lang/translate/ ）

- `i18n/<RFC5646>.toml` 翻译表，函数 `lang.Translate`（别名 `T`、`i18n`）；查找顺序：当前语言 locale → 当前语言 key → defaultContentLanguage 的 locale → key，找不到返回空串；支持 CLDR 复数化；`printI18nWarnings` 排查缺失。
- 本站**没有** `i18n/` 目录，多语言 UI 文案用 PaperMod 内置语言包。

---

## 7. 与本仓库的对接现状

**版本与构建**（`netlify.toml`）

- `HUGO_VERSION = "0.169.0"`、`HUGO_ENV = "production"`、`command = "hugo --gc --minify"`；本地 `hugo version` 同为 v0.169.0+extended（2026-10-27 构建）。
- 本地 `hugo --gc --minify` 实测 exit=0，产物（`assets/css/stylesheet.<hash>.css`、`/zh/404.html` 等）符合预期。

**hugo.toml 关键配置**（读文件确认）

- `baseURL = 'https://deux.top/'`（apex，与 Netlify 主域一致）；`theme = 'PaperMod'`（submodule，v8.0-152-g1181196，layouts 已是 0.146+ 新体系）。
- `defaultContentLanguage = "zh"` + `defaultContentLanguageInSubdir = true`；`timeZone = "Asia/Tokyo"`；`hasCJKLanguage`/`enableEmoji`/`enableRobotsTXT`/`enableGitInfo`/`enableInlineShortcodes` 均开。
- `[outputs] home = ["HTML","RSS","JSON","llms"]`（2026-11-04 起 llms.txt 启用，自定义 `[outputFormats.llms]`）；`[pagination] pagerSize = 8`；`[frontmatter] lastmod = ["lastmod", ":git", "date"]`；params 全是 PaperMod 开关（profileMode/socialIcons/cover/schema 等）+ `mainSections = ["posts"]`（显式固定，不再靠推断）+ `comments = true`（实际渲染由 `[params.giscus]` 凭据门控）。
- `[languages]` zh/ja/en 三语各自带 profileMode、buttons、socialIcons、menu（weight 顺序 zh > ja > en）。

**现有站点层扩展点清单**（全部位于项目根，主题升级不丢）

- `layouts/_partials/extend_head.html` —— og:audio/og:video meta（`audio_file`/`video_file` 参数）+ `media_position = "top"` 置顶排序 CSS + 指纹加载站点 JS `assets/js/site.js`（阅读进度条/图片灯箱/TOC 滚动高亮，功能自门控于主题 DOM）。
- `layouts/_partials/extend_post_content.html` —— 音视频播放器与 YouTube(`youtube_id`)/B站(`bilibili_bvid`) 嵌入，统一 `.post-media` 包裹（对应 stub 覆盖机制，见第 2 节）；末尾按 `Lastmod > Date+1天` 输出「最后更新于」行（CLDR 本地化日期，CSS 在 ui.css，参与置顶 flex 排序）；再输出「相关文章」块（Hugo 内建 Related Content，`[related]` 配置 tags/categories 加权，限 mainSections，最多 3 条）。
- `layouts/_partials/comments.html` —— giscus 评论（2026-11-04 接线；凭据留空不渲染，见 AGENTS.md）。
- `layouts/404.html` —— 独立整页 404，按语言渲染三语文案（Netlify `[[redirects]]`：`/ja/*`→`/ja/404.html`、`/en/*`→`/en/404.html`，其余兜底 `/zh/404.html`）。
- `layouts/archives/list.html` —— archives 模板（2026-11-04 起单份语言感知文件替代原三语言变体，本地化串由 `.Site.Language.Lang` 分支派生），由 `content/<lang>/archives/_index.md` 的 `layout = "archives/list"` 定点引用。
- `assets/css/extended/` 共 4 个：`cover.css`、`post-media.css`、`search-icon.css`、`ui.css`（经 PaperMod 的 Match+Concat+Minify 进入最终指纹样式表；`404.css` 已删——`.not-found` 类只存在于自带内联样式的独立 404 页，全局样式表载入纯属死重）。

**回归保障**

- `bash scripts/feature-check.sh`：12 项断言，构建携带全部自定义 front matter 参数的测试文并断言渲染 HTML（失败时在 CI summary 附 DOM 快照）。
- weekly 主题 PR、build-check 两处都会跑（CMS「功能体检」按钮已于 2026-11-04 移除，防 action 孤儿记录烧配额）；主题升级（`.github/workflows/update-papermod.yml`）后必跑。
- 新增任何依赖主题 DOM/类名/钩子的功能 → 必须同步加断言。

**设计原则落地路径**

- 新功能 = 站点层钩子 partial（依赖主题 stub 的三个，或经 `templates.Exists` 防御）+ `assets/css/extended/` 样式 + `hugo.toml`/front matter params 驱动。
- 内容侧媒体字段经 Pages CMS 校验（`youtube_id`/`bilibili_bvid`/`audio_file` 等）；视频不进 git；品牌资产在 `static/branding/`（CMS 不可见）。

---

## 附：引用的官方文档页

内容模型 https://gohugo.io/methods/page/kind/ · https://gohugo.io/content-management/page-bundles/ · https://gohugo.io/content-management/archetypes/ · https://gohugo.io/content-management/front-matter/ · https://gohugo.io/content-management/taxonomies/ · https://gohugo.io/configuration/taxonomies/ · https://gohugo.io/content-management/multilingual/
模板 https://gohugo.io/templates/ · https://gohugo.io/templates/base/ · https://gohugo.io/templates/lookup-order/ · https://gohugo.io/functions/partials/include/ · https://gohugo.io/functions/partials/includecached/ · https://gohugo.io/functions/templates/exists/
管线 https://gohugo.io/functions/resources/get/ · https://gohugo.io/functions/resources/match/ · https://gohugo.io/functions/resources/concat/ · https://gohugo.io/functions/resources/minify/ · https://gohugo.io/functions/resources/fingerprint/ · https://gohugo.io/functions/css/sass/ · https://gohugo.io/functions/css/postcss/ · https://gohugo.io/functions/js/build/
图片/输出/安全 https://gohugo.io/content-management/image-processing/ · https://gohugo.io/configuration/output-formats/ · https://gohugo.io/about/security-model/ · https://gohugo.io/configuration/security/
其他 https://gohugo.io/templates/data-templates/ · https://gohugo.io/templates/shortcode/ · https://gohugo.io/content-management/shortcodes/ · https://gohugo.io/content-management/menus/ · https://gohugo.io/functions/lang/translate/
