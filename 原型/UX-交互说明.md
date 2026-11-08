# 二重奏博客 · UX 交互说明（交互版）

## 0. 文件与边界

- 交互版：`原型/二重奏-博客界面设计-交互版.html`
- 原稿：`原型/二重奏-博客界面设计.html`（审计对象，保留）
- 审计：`原型/二重奏-界面设计审计.html`
- 目标栈：**Hugo + PaperMod**。没有引入 Next.js / Tailwind / React；本文件是站点层落地映射。
- 原型仍是单页演示。落地必须拆成 Hugo 静态页（见 §4），不要把 hash 路由和 JS 注入正文搬进站点。

## 1. 本轮补的 UX

| 区域 | 行为 | 状态 |
|---|---|---|
| 语言 | **全宽度 header 常驻 globe 下拉**（≤768px 同样是头部图标，不再收进汉堡）；位置在右簇、紧邻汉堡；语言入口仅头部一处（页脚语言行已收敛移除，与站点「语言列表已收敛(仅头部)」同构）；`hreflang` / `lang` / `aria-current` | 打开/关闭、Esc、外点、当前语言金色对勾、与汉堡面板互斥 |
| 目录 | `<1200px` 为标题下折叠 `<details>`；`≥1200px` 为右侧固定浮层，滚过封面后出现 | 折叠/展开、当前节高亮、平滑滚动、`prefers-reduced-motion` 回退 |
| 搜索 | 860px 居中列；结果摘要 40em；结果下方标签中枢（18 个标签 + 计数） | 标签点击 = 查询 + 全部类目；`aria-pressed` 高亮；空状态提示 |
| 文章 meta | 分类变真实链接；补「更新于」；日期/更新时间改 `<time datetime>` | 有 lastmod 才显示更新于；无则不占位 |
| 导航 | 移除重复的「搜索」菜单项；搜索图标承接当前态；页脚收敛为单行：©/CC 靠左，留言板与 RSS 收成图标靠右（`aria-label` 随语言），品牌块删除（头部 logo 已承载） | `aria-current` 在搜索图标上同样生效 |
| 触屏 | 31 个 `:hover` 全部移入 `@media (hover: hover)` | 触屏点按不再留下下划线/金色/缩放；`:focus-visible` 保留 |
| 字号/目标 | 元信息 12px 下限；独立链接最小 24px；图标/菜单/目录 summary 44px | 390 / 900 / 1440 实测无 <24px 目标 |
| 原生控件 | `color-scheme: light / dark` | 深色下任务清单复选框、滚动条、原生清除按钮跟随主题 |
| **文章分页** | **数字分页条（主流定稿）**：筛选后按页切片、页内保留年份分组；页码窗口式含首尾页±当前±1，间隙折叠省略号；路由 `#/posts/page/N` + 筛选进 URL（`?cat=`，可分享/可回退）；原型 8 篇/页，站点侧 Hugo `pagerSize = 10`（WordPress/Hugo 主流默认）；归档页保持完整索引不分页（分页的逃生口）；调研否决无限滚动（Casper 方案：依赖 JS 预取、URL 不可定位、footer 不可达） | 首尾页禁用态降透明度、当前页金底线、24px 目标、三语 上一页/下一页 |
| **回顶按钮** | 滚过一屏后右下角浮现（与线上站 `#top-link` 同构），44px 圆形、Feather chevrons-up，平滑滚动尊重 `reduced-motion` | 顶部不占位；打印隐藏 |

阅读时长已按站点实际值修正：AI 更新 1、Cloudflare 4、你好世界 1、进度条 2、构建 2、配置 2。

### 2026-11-08 设计遗漏专项排查结论

严重遗漏（已修）：① 文章列表无分页（见上表）；② 无回顶控件（见上表）。
已核非遗漏：路由切换滚动复位 + `main` 焦点管理（已有）；未知路由 404 视图（已有）；搜索空态/筛选空态（已有）；首页 hero/近作/目录均有界（4+5 条，不随语料膨胀）；归档页不分页=完整索引（有意决策）；搜索结果不分页（客户端即时过滤，语料量级内主流可接受）；`reduced-motion`/打印样式/懒加载均已有覆盖。

## 2. 状态清单

- **默认 / hover**：hover 只给指针设备；触屏无粘滞态。
- **focus-visible**：全局 2px accent 轮廓，offset 3px；键盘路径不依赖 hover。
- **active / current**：导航 `aria-current="page"`、搜索图标当前态、语言 `aria-current="true"`、目录 `aria-current="location"`。
- **expanded**：语言菜单、手机菜单、目录 details 均同步 `aria-expanded` / `open`。
- **empty**：搜索无结果给短提示 + 4 个可点示例；不显示空白列表。
- **error**：复制链接失败回退「请手动复制地址栏」；不伪装成功。
- **loading**：静态索引同步返回，无 loading；若未来改异步，用 skeleton + `aria-live`，不加假 spinner。
- **reduced motion**：所有过渡/动画压到 0.001ms，目录滚动改 `auto`。
- **禁用**：正文任务清单复选框是内容状态，不是可操作控件；其余控件无 disabled 态。

## 3. 设计 token

### 颜色

| Token | Light | Dark |
|---|---|---|
| paper | `#f7f3ea` | `#16140f` |
| paper-2 | `#f0eadd` | `#1e1b14` |
| ink | `#1a1712` | `#ece6d8` |
| ink-2 | `#3b3529` | `#d3c9b6` |
| muted | `#6b6455` | `#a49b87` |
| rule | `#dfd6c4` | `#342f25` |
| accent | `#8a5d15` | `#d8ab5b` |
| code bg / ink | `#221f18` / `#ece6d8` | `#0d0c09` / `#e8e1d1` |

对比度：正文 10.98:1 / 11.22:1；muted 5.30 / 6.68；accent 5.19 / 8.67；faint 3.68 / 3.88（仅大字号或图标）。

### 字体

- Display：`Iowan Old Style / Palatino / Songti SC / Noto Serif CJK SC / Noto Serif SC / Noto Serif JP / Source Han Serif SC / SimSun`，400。Windows 实浏定：堆栈里的 `Noto Serif CJK SC` 在 Windows 上不存在（装上的是 `Noto Serif SC`），旧栈因此静默落到 SimSun；补名后 Chrome 实测已用 Noto Serif SC。
- Body：`Segoe UI Variable / SF Pro / PingFang SC / Microsoft YaHei`，400；正文 18px / 1.9（CJK）。
- Mono：`SFMono-Regular / Consolas`，元信息 12px、tabular-nums。
- 字号阶梯（本轮按 15 站实测收敛）：**文字档 12 / 14 / 16 / 18 / 22**，**展示档 28 / 36 / 44 / 52 / 60**；正文统一 **18px**（移动端不再降级）；小字硬下限 **12px**（`brand-en` 10px 是标识副标，唯一豁免）。旧制 30 个杂值（含 11.5 / 14.5 / 17.5 半像素与 24-58 的 13 个近邻阶）已全部归入上述 rung。
- 阅读列：680px；标题流式 `clamp(36px, 4.9vw, 60px)`。

### 空间与组件

- 页沟槽：40px（≤768px 为 24px）。间距标尺（2026-11-08 留白审计定案，4px 栅格）：`--sp-1…9` = 4/8/12/16/28/40/48/64/96，语义档 `--sp-section`（章节间，桌面 96 / 手机 72）、`--sp-head`（页首，64 / 48）、`--sp-tail`（页尾，96 / 72）；正文段落与列表 28、表格与代码块 40、图 48、引用 40；新规则取 token，不写裸数。
- 圆角：图片 0；按钮/代码 2px；`kbd` 3px；无投影、无渐变。
- 分隔线：仅两种用途——列表行分隔、全站 chrome（nav 底线/页脚上线）；板块之间不画线，靠留白 + kicker 标题承载。盒式控件（折叠目录、giscus 壳、正文表格/hr）边界除外。
- Header 86px（手机 68px）；图标按钮 44px；语言菜单 196px 宽 / 行 44px。
- **头部控件顺序（左→右）：主题 → 搜索 → 语言 → 菜单**；桌面隐藏菜单，导航紧邻图标簇。排序依据不是偏好：右往左 = 菜单（17 站里 9/10 最右，它是溢出）→ 语言（W3C i18n：语言链接放右上且不该被隐藏）→ 搜索（内容动作，9/9 在右簇）→ 主题（偏好项，平台规范无归属，取最外格）。DOM 序 = 视觉序 = Tab 序。
- 目录浮层 200px，宽 `right: 32px; top: 120px`；活动项 2px accent 左边。
- 标签按钮最小 24px 高；页脚/标签/章节链接最小 24px。

## 4. Hugo / PaperMod 落地映射

| 区域 | 落点 | 关键点 |
|---|---|---|
| head | `layouts/_partials/extend_head.html` | 保留 hreflang、OG、RSS、OpenSearch；语言菜单的 URL 来自 `.AllTranslations` |
| header | `layouts/_partials/header.html` + `assets/js/site.js` | 搜索图标在 `.nav-actions`；语言 globe **全宽度常驻**（手机同款 44px 图标，面板与汉堡同层互斥）；手机菜单只放站点导航 |
| 首页 | `layouts/index.html` | 不 JS 渲染；lead = `weight`/置顶（无则最新有封面）、近作 = 接下来 4 篇、目录 = 最新 5 篇；用 `.Site.RegularPages` |
| 列表 | `_default/list.html` 或 `archives` | 年份 `.GroupByDate "2006"`；分类筛选来自 taxonomy；分页按 `pagerSize` |
| 文章 | `single.html` + `post_meta.html` | TOC 用 `.TableOfContents` 或 h2 循环；更新于用 `.Lastmod`；分类用 `.GetTerms`；标签链 `/tags/<term>/`；giscus 接相关文章后 |
| 搜索 | 现有 `search.html` + fastsearch | 标签中枢用 `.Site.Taxonomies.tags`；分类筛选用 taxonomy；保留 `?q=` 回填与「不自动聚焦」；Ctrl/⌘+K |
| 样式 | `assets/css/extended/` | 语言菜单、目录、标签中枢、hover 门控、12px 元信息进站点层；不改 `themes/PaperMod` |
| 交互 | `assets/js/site.js` | 语言菜单开关、目录 IO 高亮、标签中枢；目录链接禁止 hash 路由，改用 `scrollIntoView` |

**语言同页切换**：原型的语言项链到 `/zh/`、`/ja/`、`/en/` 首页；落地时按站点现有做法读 `link[rel=alternate][hreflang]` 重写为同页译文，页面无译文时回退语言首页。

**分类链接**：文章 kicker 已是真实 `<a>`；列表行整行是链接，分类不能再嵌套 `<a>`。落地时用 overlay link（标题链接绝对覆盖整行、分类链接在其外）或保留分类为文本 + 顶部筛选。站点 feature-check 要求 meta 分类为真实链接，文章页已满足。

## 5. 已拍板（2026-11-07，15 站横向取样）

样本：jvns.ca、danluu.com、leerob.com、overreacted.io、maggieappleton.com、robinrendle.com、craigmod.com、muan.co、tonsky.me、sive.rs、blog.jim-nielsen.com、ruanyifeng.com/blog、diygod.cc 等 15 家（逐站抓 HTML + 主样式，统计 @media / 导航 / TOC / 字号）。

| 项 | 判断 | 依据 | 落地 |
|---|---|---|---|
| 断点 | **768** | 768 是样本最高频断点（9/15），与 Tailwind `md`/Bootstrap 重合；640 偏早；本站导航只 2 项，768 收不晚 | 已改（860→768，含 JS resize 门控） |
| 归档入口 | **不做独立导航项** | 导航里出现「归档」的：0/15；折进列表/首页的：9/15；本站文章页已按年分组，信息增量接近零 | 交互版保持 文章/关于/🔍；站点 `/archives/` 建议 301 → `/posts/` |
| 目录侧别 | **右** | 样本里唯一有 TOC 的博客（diygod）在右，左侧 0 家；文档站（MDN/Starlight）也把 TOC 放右 | 交互版不改；站点现为左侧，建议后续跟进 |
| 字号 | 正文 **18**、小字硬下限 **12** | 15 站正文 16–18px 为主流（16px 6 家、17.6–18px 4 家）；小字中位 12.8px；8/10px 只用于标识或深层列表 | 已改 |
| 阶梯 | 文字档 **12/14/16/18/22**，展示档 **28/36/44/52/60** | 手写站点阶梯中位 7 级；Tailwind 类工具站虚高到 10–16 级 | 已改（原 30 个杂值） |
| 中文衬线 | 补 **Noto Serif SC / Noto Serif JP** | 本机 Chrome 平台字体实测：旧栈（写 `Noto Serif CJK SC`）全部落 SimSun；补名后为 Noto Serif SC | 已改 |
| hreflang | **`zh`**（不是 `zh-CN`） | 线上实际输出：`hreflang=zh`（Hugo 语言码）；`lang` 属性仍为 `zh-CN` | 已改 |
| 阅读进度条 / 阅读时长 | **保留** | 样本 0/15 博客有；但站点已上线且与「黄金字阶」同批定案 | 不动（与站点一致优先于跟惯例） |
| 手机头部图标 | **4 个**（语言/搜索/主题/菜单） | 样本众数 0、多数 1–3；4 个没有先例但 320px 实测仍余 26px | 语言可见性优先于该启发式，保留 |

仍然待定（与本次取样无关，需产品判断）：

1. ~~**列表形态**~~ → 已由 2026-11-08 实测选定（见 §8）。
2. **正文系统**：680 宋体 / 720 无衬线。交互版保留 680；站点黄金字阶按 720/18 锚定。
3. ~~**评论**~~ → 本轮已入原型（giscus 壳，见 §8）。
4. **首页选文规则**：weight / featured / 最新；需要 CMS 字段或明确回退。

## 8. 接线层（2026-11-08 第二轮：对齐线上站的全部页面与组件）

完整差距矩阵与 Hugo 落地清单见 **`原型/接线差距与替换清单.md`**。本轮增量：

- **路由 ×12**：`#/`、`#/posts`、`#/posts/:slug`、`#/archives`、`#/search`、`#/about`、`#/guestbook`、`#/tags`、`#/tags/:term`、`#/categories`、`#/categories/:term`、未知路径→404 视图；语言前缀 `#/ja/...`、`#/en/...`（对应站点 `/ja/`、`/en/`）。
- **三语同页切换**：语言菜单随当前路由实时改写 href（等价站点 hreflang 重写）；ja/en 文章标题摘要、关于页、留言板引导语、zz-s03 全文用 `public/` 构建产物里的**真实机翻译文**；未带译文的文章显示设计好的「译文准备中」状态（真实瞬态：中文发布后几分钟）。
- **文章页补齐**：灯箱（Esc/外点/滚动锁/焦点回归）、代码复制按钮、#wide/#full 图文破格（公式与站点 kg-width 同源：min(1200px,100vw−2gap)、100vw−2gap，≤1248px 塔回）、视频门面（bilibili_bvid 形态）、自托管音频（可播放演示音）、脚注 + 回跳、分享组（触屏系统分享替换 X/Telegram，桌面保留 intent + 复制）、评论壳（giscus 位置与阅读顺序，不加载第三方脚本）。
- **新页**：归档（紧凑年份台账）、标签/分类索引 + term 详情页（文章标签与 kicker 分类都改指真实 term 路由）、留言板（三语引导语 + 评论壳即本体，与站点同构）、404（代码 + 一句话 + 三出口 + 最近 3 篇）。
- **搜索契约**：不自动聚焦（保留）、`?q=` 回填、Alt+/ 与 Ctrl/⌘K 并存、空态提示词随语言。
- **列表形态选定**：12 站实测 10/12 文字行、2/12 封面卡 → 交互版维持文字目录；替换现站即 /posts/ 去卡片化，属最大视觉变化，需签认。
- 本轮实测：12 路由 × 390/768/1440 无横向溢出；灯箱/复制/快捷键/同页切换全部通过；`node --check` 通过。

## 6. 已验证

- 390 / 900 / 1440 实际渲染，无横向溢出（`scrollWidth - innerWidth = -15`，滚动条）。
- **头部语言切换器 320 / 390 / 768 / 1440 实测**：390px 下 4 个 44px 图标占 184–366px，品牌右缘 94px，中间余量充足；320px 下仍余 24px 间距、零溢出。窄屏面板锚定 `.head-actions`（`right: 0`），196px 宽不会从左侧出界。
- **断点边界实测**：768px 时 `.nav` 为 `none`、汉堡 `grid`；769px 时反过来，且 `overflowX = -15`（仅滚动条）。
- **平台字体实测**（Chrome `CSS.getPlatformFontsForNode`）：改栈前 `.hero-title` / `.brand-cn` 均为 **SimSun**；补 `Noto Serif SC` 后为 **Noto Serif SC**。
- 语言菜单与汉堡面板**互斥**（开一方关另一方，`aria-expanded` 同步）；面板不锁 `body` 滚动（下拉不是模态），`max-height: calc(100dvh - 68px)` + 自身滚动兜住未来加项。
- 语言菜单：打开/关闭、`aria-expanded`、外点/Esc。
- 目录：`<1200` 折叠、`≥1200` 浮层、封面滚过后出现、当前节高亮、点击滚动。
- 搜索：18 个标签、标签点击、结果 560px 摘要、空状态；标签中枢在结果之后。
- 文章：分类链接、更新于、`<time>`、真实阅读时长。
- 31 个 `:hover` 全部在 `@media (hover: hover)` 内；0 个外部 hover。
- 390 / 900 / 1440 无 <24px 的独立链接目标；图标/菜单/目录 summary 44px。
- JS 通过 `node --check`；无重复 ID、无缺 alt。

## 7. 文件清单

- `原型/二重奏-博客界面设计-交互版.html` — 本轮交互版（交付对象，含接线层）
- `原型/接线差距与替换清单.md` — 与线上站的差距矩阵 + Hugo 落地清单（2026-11-08）
- `原型/二重奏-博客界面设计.html` — 原稿（审计对象）
- `原型/二重奏-界面设计审计.html` — 审计报告
- `原型/assets/` — 设计示意图、favicon、演示音（piano-note-8c2f.wav）
- 实测依据（仓库根）：`research-breakpoints.md`、`research-toc.md`、`research-type.md`、`research-header-order.md`、`.zcode/audit/r-inventory.md`（线上站盘点）、`.zcode/audit/survey-list.md`（12 站列表/评论/404）
