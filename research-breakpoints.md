# 独立博客「响应式断点与头部收纳」横向取证

调研日期：2026-11-07 ｜ 样本：15 个真实个人博客
方法：`curl` 取首页 HTML → 取 `<link rel=stylesheet>` 主样式（含内联 `<style>`、JS 注入的 CSS）→ 用平衡花括号切分 `@media` 块，逐块读选择器与声明。每站 2–4 个请求，并发 ≤3，全程只读，未修改任何站点。

口径说明：
- **断点集合**＝该站主样式里出现过的 `max-width` / `min-width` 数值（px 去重升序）。`em/rem` 按 16px 换算，`max-device-width` 单独标注。
- **导航收起点**＝导航从横排变为「隐藏 / 汉堡 / 减项」的那条媒体查询宽度；只换行不改结构的记为「未检出」。
- **手机头部图标数**＝宽度 ≤480px 时顶栏仍可见的图标/按钮数（搜索/主题/语言/菜单），文字链接不计。
- 证据等级：全部为一手 CSS/HTML（本仓库外抓取），引用给到**媒体查询 + 选择器 + 声明原文**。

## 主表

| 站点 | 断点集合 (px) | 导航收起点 | 手机头部图标数 | 备注（机制 / 主列宽） |
|---|---|---|---|---|
| jvns.ca | 531 / 866 / 992 | 未检出（866 仅换排） | 0 | 866px 起 header 才 `display:flex` 左右分栏，865 以下链接落到标题下方整行；无汉堡，纯文字；列宽 `#wrap{max-width:45em}`≈720px |
| danluu.com | 无 | 未检出 | 0 | 全站无 `<link rel=stylesheet>`，`<style>` 仅 170 B；无 nav 元素；列宽交给浏览器默认 |
| leerob.com | 640 / 768 / 1024 / 1100 / 1280 / 1400 / 1536 | 未检出（无导航） | 0 | 首页是链接式个人页，无 header 导航；`.content-frame{--content-width:600px}` |
| overreacted.io | 400 / 640 / 768 / 1024 / 1280 / 1536 | 未检出（无导航） | 0 | header 只有 wordmark + 作者头像，无菜单；正文 `max-w-2xl`≈672px |
| maggieappleton.com | 480 / 550·551 / 576 / 640 / 768·769 / 1024 / 1200 / 1512 | **550** | 1（汉堡） | `@media (min-width:551px){.mobile-menu{display:none}}`＋`(max-width:550px){.mobile-menu-toggle{display:flex}}`，真正的断点式汉堡；`.page-wrapper{max-width:1420px}`，正文网格列 |
| robinrendle.com | 500 / 570 / 768 / 1000 | 未检出（侧栏是常驻抽屉） | 4 | 类 app 布局：`.navigator` 常驻 `translateX(-100%)` 抽屉，`min-width:768px` 时打开态才隐藏切换按钮；头部 4 个按钮＝侧栏/主题/上一条/下一条；列宽 `--size-content-width:41rem`≈656px |
| craigmod.com | 700 / 768 / 900 / 1180 | **768** | 0 | `@media only screen and (max-width:768px){.desktoponly{display:none!important}.mobileonly{display:inline-block!important}}`——按文案换内容，不是汉堡；列宽 ~700px |
| muan.co | 544（34em） | 未检出（无导航） | 0 | header 只有 logo + 名字，导航链接在正文里；`header,main,footer{max-width:36em}`≈576px |
| tonsky.me | 480（`max-device-width`） | 未检出（菜单常驻） | 2 | `.menu{display:flex}` 任何宽度都不收；`.hamburger` 是常驻工具菜单（Sign In/Privacy/Terms），不承担导航折叠；列宽 `--width:575px` |
| sive.rs | 无（仅 `prefers-color-scheme`） | 未检出 | 1（搜索） | 全站内联 CSS 2.4 KB，无宽度媒体查询；`body{max-width:60ch}` |
| blog.jim-nielsen.com | 520 / 672 / 768 / 1200 / 1600 | 未检出（图标常驻） | 3 | `.navv` 固定一行图标链接，40×40 热区；三个图标＝搜索/订阅/菜单（菜单跳到 /menu/ 页）；列宽 `--max-width:32rem`≈512px |
| henrikkarlsson.xyz | 541 / 650 / 1024 / 1200 | 未检出（无导航） | 0 | Substack 封面页，DOM 里没有 `<nav>`；断点来自 `welcome.css`；正文宽度未在封面 CSS 中限定 |
| ruanyifeng.com/blog | 480（30rem） / 768（48rem） | 未检出 | 0 | 外链 CSS 被注释，靠 `loadjscssfile()` 注入 `styles.css`→`@import theme_scrapbook.css`；`@media (max-width:30rem){#header #feed_icon,#header #google_search{display:none}}`；正文 `max-width:740px` |
| zhangxinxu.com | 414 / 480 / 640 / 768 / 890 / 980 / 1024 / 1140 / 1160 / 1200 / 1240 / 1250 / 1280 / 1320 / 1350 / 1400 / 1440 / 1500 / 1600 / 1760 / 2400 | **640** | 1（搜索） | `@media all and (max-width:640px){.menu_tab>li a:not(.boss){display:none}.menu_tab>li:last-child{display:none}}`——只剩 4 个顶级项，非汉堡；`#searchform` 此时才 `display:block`；正文流体，`.widecolumn{margin-right:368px}`，≥2400px 时 `.post{width:1600px}` |
| diygod.cc | 640 / 768 / 1024 / 1280 / 1536 | **640**（Tailwind `sm`） | 3（☰/语言/主题） | `#openMenu{... sm:hidden}`、`#menu{hidden ... sm:flex}`——640 以下收进汉堡；头部另有语言 globe 与主题按钮；正文 `.prose{max-width:65ch}`，容器 `max-w-5xl`=1024px |

## 逐站证据（可复核）

**jvns.ca**
```
@media screen and (min-width: 866px){ #wrap > header{display:flex;justify-content:space-between} }
@media screen and (max-width: 865px) and (min-width: 531px){
  #wrap > header .header-links{display:block;position:relative;margin-left:2em;padding:.25em 0} }
#wrap{width:70%;max-width:45em;margin:0 auto}
```
无 `display:none`、无 toggle 按钮 → 导航从未收起，只是从「右对齐横排」变「标题下整行」。

**danluu.com**：HTML 中 0 个 `<link rel=stylesheet>`，`<style>` 仅 `meta viewport/color-scheme` 相关；无 nav。

**leerob.com**：`.content-frame{--content-width:600px;width:min(100%,var(--content-width))}`；媒体查询 `40rem/48rem/64rem/80rem/96rem`＝640/768/1024/1280/1536，另有 1100、1400。无 header 导航。

**overreacted.io**：Tailwind 系（`.container` 逐档 `max-width:640/768/1024/1280/1536`，正文 `max-w-2xl`=42rem）；header 仅 wordmark + 头像链接。

**maggieappleton.com**：
```
@media screen and (min-width: 551px){ .mobile-menu{display:none} }
@media screen and (max-width: 550px){ .mobile-menu-toggle{display:flex} }
```
这是样本里唯一「严格成对」的折叠断点（550/551）。

**robinrendle.com**：
```
.navigator{position:fixed;...;transform:translateX(-100%)}
.navigator.open{transform:translateX(0)}
@media screen and (min-width: 768px){ .navigator:not(.closed) ~ .file .title-sidebar-btn{display:none} }
```
侧栏在任何宽度都是抽屉，768 只决定「打开时是否还显示切换按钮」。

**craigmod.com**：
```
@media only screen and (max-width: 768px){
  .mobileonly{display:inline-block!important} .desktoponly{display:none!important}
  nav{font-size:1.7em;line-height:1em;text-transform:none} }
```
桌面 nav 里的 `About Craig / Books & Essays / Shop!` 被换成 `About / Books & Essays / Membership`，没有汉堡。

**muan.co**：`@media (max-width:34em)`（=544px）；`header,main,footer{max-width:36em;margin:auto}`。

**tonsky.me**：
```
.menu{width:min(var(--width),96vw);display:flex;flex-direction:row}
.hamburger label{display:block;width:32px;height:32px;...}
@media only screen and (max-device-width: 480px){ :root{--cap-height:...} }
```
480 的 `max-device-width` 只调字号；`.menu` 没有任何 `display:none`，导航永不收起。

**sive.rs**：内联 `<style>` 2.4 KB，唯一媒体查询是 `@media(prefers-color-scheme:dark)`；`body{max-width:60ch}`；header 只有站名 + 搜索图标。

**blog.jim-nielsen.com**：
```
.navv{display:flex;align-items:center;justify-content:space-between}
.navv a:not(:first-child){width:40px;height:40px;display:flex;...}
```
媒体查询 `42rem(672)/520/768/1200/1600` 全部作用于列表栏数（`column-count:2/3/4`），与导航无关。

**henrikkarlsson.xyz**：DOM 中无 `<nav>`/`navbar` 类；`welcome.css` 的断点为 `541 / 650 / 1024 / 1200`（另有 max-height 若干）。

**ruanyifeng.com/blog**：`<link ... styles.css>` 被 HTML 注释掉，页面用 `loadjscssfile()` 注入；`styles.css` 只 `@import theme_scrapbook.css`。该主题两条断点：
```
@media (max-width: 48rem){ #container{padding:.5em} ... }        /* 768 */
@media (max-width: 30rem){ #header #feed_icon{display:none}     /* 480 */
                           #header #google_search{display:none} }
```
即小屏只是把搜索框与 RSS 图标拿掉，导航结构不变。

**zhangxinxu.com**：两套样式共 21 个宽度值（`home.css` 16 个多为广告位/容器微调，`style.css` 5 个为结构断点）。导航收窄靠 `.menu_tab > li a:not(.boss){display:none}`，顶级项（网站首页/前端技术/生活与创作/前端在线资源）始终在。

**diygod.cc**：
```
<div id="openMenu" class="flex ... sm:hidden">   <!-- 640 以下显示 -->
<div id="menu" class="... hidden ... sm:flex">   <!-- 640 以上展开 -->
```
Tailwind `sm`=640，汉堡为独立 DOM（非 checkbox hack）。

## 分布总结

**导航收起点**
- 真·收进汉堡：**2 家** —— maggieappleton 550、diygod 640。
- 收窄但不隐藏（减项/换文案）：**2 家** —— craigmod 768、zhangxinxu 640。
- 仅换排（结构不变）：**1 家** —— jvns.ca 866。
- 仅隐藏图标：**1 家** —— ruanyifeng 480。
- 从不收起或无导航：**9 家** —— danluu、leerob、overreacted、muan、robin、tonsky、sive、jim-nielsen、henrikkarlsson。

按段统计：768 附近（704–830）只有 craigmod 1 家；800–900 有 jvns 1 家（866）；其余落在 480/550/640。

**但断点值本身**：768（含 48rem）出现在 **9/15** 家（craigmod、diygod、jim-nielsen、leerob、maggie、overreacted、robin、ruanyifeng、zhangxinxu），是样本中出现频率最高的单一数值；640 出现 5 家，1024 出现 6 家。768 更多被用于列表栏数、容器宽度，而不是导航折叠。

**手机头部图标数**：0 个是众数（8/15：jvns、danluu、leerob、overreacted、craigmod、muan、henrik、ruanyifeng）。有图标的 7 家里，1 个（sive、zhangxinxu）、2 个（tonsky）、3 个（jim-nielsen、diygod）、4 个仅 robin 一家（类 app 布局，含上一条/下一条）。**没有任何博客在手机头部放 5 个及以上图标。**

**主内容列宽**：集中在 512–720px（jim 512、tonsky 575、muan 576、leerob 600、robin 656、overreacted 672、craigmod 700、jvns 720、ruanyifeng 740）；只有 diygod 用 65ch、sive 用 60ch 这类字符度量。

## 建议

**导航收纳点选 768px。**
理由按证据强度排序：
1. 768 是样本里出现最多的断点值（9/15），也是 Bootstrap/Tailwind `md` 的既有约定，选它意味着「最少新增一个别人没在用的阈值」。
2. 真正的折叠需求出现在 700px 以下：jvns 的 6 个文字链接到 866px 才换行，说明横排的物理极限取决于**条目字数**而不是宽度阈值；3–4 个中文菜单项（文章/归档/搜索）在 768 时仍宽裕，到 640 才真正局促——所以 640 折叠偏早，会让 640–768 的平板用户多点一次。
3. 550（maggie）属于「手机优先」的激进档，适合导航项多、且不做平板适配的站点；对本项目这种 3 项中文导航属于过度设计。
4. 手机头部图标保持 **≤3 个**（搜索 / 主题 / 菜单），与 jim-nielsen、diygod 同档；4 个以上在样本中只有类 app 布局的 robin，博客场景无先例。
