# 独立博客头部控件顺序取证

取证日 2026-11-07 ｜ 16 个指定样本 + 1 个补充样本（Casper 官方 demo）

## 0. 方法与证据等级

- 工具：真实 Chromium（Google Chrome for Testing 153.0.8010.12，Playwright 1.65 驱动），非 curl、非读源码猜测。
- 视口：桌面 1280×900，手机 390×844（同一页面先量桌面、再缩窗量手机，CSS 媒体查询实时生效）。
- 判定方式：页面渲染后遍历 `a / button / input / summary / label` 及带图标的 div，取 `getBoundingClientRect()`，**按 x 坐标升序**输出；同时截取头部像素图人工核对图标身份。
- 每站请求数：2–3 次（HTML + 渲染测量 + 截图）。并发 ≤3。
- 证据等级：本文件全部为 **A 级（一手实测：同一 URL 上真实渲染的坐标 + 截图）**。坐标单位 CSS px，为桌面 1280 视口下的左边缘 x。
- 口径：「左侧/右侧」按该控件所处的**半区**判断（x < 640 / x > 640）；「最右/次右」按右簇内部顺序判断。

## 1. 总表

| 站点 | logo | 主导航 | 工具控件（桌面，左 → 右，括号为 x） | 手机 390 头部剩余（左 → 右） | 汉堡位置 |
|---|---|---|---|---|---|
| joshwcomeau.com | 左（115） | 紧贴 logo 右侧（311–704） | 搜索(975) → 音效(1023) → 主题(1071) → RSS(1119)，全右半区 | logo · 搜索 · 主题 · ☰ | **最右**（327–359） |
| css-tricks.com | 左（29） | 中右横排 6 项（536–1081） | 账户(1081) → 搜索(1138) → 主题(1195)，全右半区 | logo + 导航横排溢出屏幕；工具在视口外（主题 x=582） | 无汉堡 |
| smashingmagazine.com | 左（40） | 紧跟 logo（109–839） | More(725) → 搜索框(890–1240)，右半区 | logo · Menu 按钮(258–371)；搜索框掉第二行通栏 | 右侧「Menu」文字+图标 |
| sspai.com | 左（40） | 中右文字菜单（388–892：共创/PRIME/Matrix/栏目/Pi Store） | 搜索(1128) → 创作笔(1168) → 登录头像(1208)，全右半区 | logo · 推荐⌄(56) · 九宫格菜单(302) · 登录头像(342) | **次右**（登录在最右） |
| developer.mozilla.org | 左（10） | 中左（205–1023） | **两行**：行1 搜索(1119–1199) → 账户(1215–1249)；行2 主题(1008–1101) → 语言(1117–1249)，全右半区 | 行1 logo · 搜索胶囊 · ☰(329)；行2 MDN · 主题 · 语言 | **最右**（行1，329–375） |
| ghost.org | 左（24） | 紧跟 logo（173–581） | Sign in(1000) → Get Started(1080–1256)，右半区 | logo · ☰(346–382) | **最右** |
| diygod.cc | 左（153） | 右（809–1073） | 语言切换(1073–1135，globe+⌄)，右半区唯一工具 | logo · 语言 globe(290–334) · ☰(342–374) | **最右** |
| ruanyifeng.com/blog | 左（104，h1 纯文本非链接） | 无导航 | RSS(905) → 搜索框(960–1164)，右半区 | 仅站名 | 无 |
| maggieappleton.com | 左（21） | 右（1012–1250：The Garden⌄ / Now / About） | 无独立工具；Garden 的 ⌄ 是 popover 按钮(1098) | logo · ☰(338–370) | **最右** |
| craigmod.com | 左（≈70，CM 圆标） | 中部两列（365–892） | Instagram(1143–1158)，右半区 | logo + 4 行折行导航（无汉堡） | 无 |
| leerob.com | 左（44，@leerob 巨字） | 无 | 无 | 仅 @leerob | 无 |
| jvns.ca | 居中横幅内左（347–738） | 右纵列 5 项（825–930） | 无 | 字标 + 导航横排两行 | 无 |
| tonsky.me | 无（名字在正文 about 块） | 左中（353–617） | 主题(857–883) → ☰(896–928)，右半区 | 导航横排 + ☰(371–403，贴右缘溢出)；主题被压到 0 宽 | **最右** |
| sive.rs | 居中窄列内左（278–557） | 无 | 搜索(567–607)，紧贴站名右侧 | 站名 · 搜索(309–349) | 无 |
| blog.jim-nielsen.com | 头部无可见站名（品牌链接 hidden，h1 在正文） | 无 | 搜索(792) → RSS(840) → ☰(888–928)，全右半区 | 搜索 · RSS · ☰（238/286/334） | **最右** |
| muan.co | 居中窄列内左（≈323） | 无（页身另有 nav 组） | 无（语言 English/Deutsch/正體中文在正文流） | 仅 logo 图形 | 无 |
| *demo.ghost.io（Casper，补充）* | 无（demo 未设 logo） | 左（40–428） | 搜索(1007) → Sign in(1059) → Subscribe(1127–1240)，右半区 | **搜索在最左(14–46)** · ☰(343–373) | **最右** |

## 2. 逐站要点（含原始顺序，可直接复核）

**joshwcomeau.com** — `header` 为 flex + `justify-content:space-between`，宽度 1036 居中（x=115）。左：字标；中左：Categories/Courses/Goodies/About；右簇 4 个 32px 图标按钮：Search(975)、Disable sounds(1023)、Activate dark mode(1071)、RSS Feed(1119)。手机：字标 + Search(231) + 主题(279) + Toggle menu(327)，音效开关消失。

**css-tricks.com** — 左 logo；导航从 x=536 起横排 6 项；右簇 Account(1081)/Search(1138)/Theme(1195)，主题在**最右**。手机 390：logo 放大到 280px 宽，导航整排横向溢出（无汉堡、无折叠），右簇三个控件被推到 x=478–633，**全部在视口外**。

**smashingmagazine.com** — logo + 导航同一左簇，More 是文字按钮(725)，搜索是**常驻输入框**而非图标(890–1240)。手机：logo 左、Menu 文字按钮右上，搜索框掉到第二行通栏。

**sspai.com** — 文字菜单居中偏右（共创/PRIME/Matrix/栏目/Pi Store），右端 3 个纯图标：搜索(1128)、创作(1168)、登录(1208)。手机：logo、推荐下拉(56)、九宫格菜单(302)、登录(342) —— **菜单类按钮不是最右，登录才是**（本样本唯一破坏「汉堡恒最右」的站）。

**developer.mozilla.org** — 唯一「两行头部」：第一行 logo + 主导航 + 搜索 + 账户；第二行「MDN」左，右端 **Theme(1008) → English (US) 语言(1117–1249)**。语言是全站最右控件。手机：第一行 logo/搜索/☰，第二行保留主题+语言。

**ghost.org** — 注意：ghost.org 首页是 Tailwind 自写的营销站，**不是 Casper 主题**（原始需求里「ghost.org（Casper 主题站）」的假设不成立）。其头部：logo 左、导航紧跟(173–581)、右端 Sign in + Get Started 按钮，无主题/语言/搜索图标。手机只剩 logo + ☰。

**diygod.cc** — logo 左，导航整体靠右(809–1073)，**语言切换器(1073–1135)是最右元素**（globe + ⌄，无主题按钮）。手机：logo、globe(290)、☰(342)。

**ruanyifeng.com/blog** — 无 `<header>` 元素；`#header-inner` 内只有 h1 站名(104–247)、RSS 图标(905)、百度搜索框(960–1164)。**没有任何导航菜单**。手机 390：只剩站名（搜索与 RSS 全部隐藏）。

**maggieappleton.com** — logo 是 M 字图形，贴最左(21)；右端 nav：The Garden + ⌄ 按钮(1098)、Now(1151)、About(1209)。无搜索/主题/语言。手机：logo + ☰(338)。

**craigmod.com** — 左 CM 圆形标志；导航是**两列文字**（ABOUT CRAIG / BOOKS & ESSAYS / SHOP! 与 MEMBERSHIP / PODCASTS / NEWSLETTERS 等）位于中段 365–892；最右是 Instagram 图标(1143)。无汉堡，手机靠折行 + `desktoponly/mobileonly` 类切换条目。

**leerob.com** — 头部只有 `@leerob` 一个巨型文字链接(44–644)，无任何导航与图标。手机相同。

**jvns.ca** — 头部是一张居中横幅（280–965），字标左置(347–738)，导航在**横幅内右侧纵列**：ABOUT/TALKS/PROJECTS/MASTODON/BLUESKY（825–930）。无图标控件、无汉堡；手机横幅缩为两行文字导航。

**tonsky.me** — 无 logo；`ul.menu` flex 一条：Blog/Work/Talks/Logos/About(353–617) → spacer(629–845) → 主题开关(857–883) → ☰(896–928)。手机：导航横排 + ☰(371–403)，主题按钮宽度塌成 0（不可用）。

**sive.rs** — 头部无导航：站名(278–557) + 紧贴其右的搜索图标(567–607)。手机同样只这两件，搜索在最右(309–349)。

**blog.jim-nielsen.com** — 头部无可见站名（品牌 `<a>` 带 `hidden`，真正的 h1 在正文）。右簇三图标：搜索(792)、RSS(840)、Menu(888–928)。手机同序(238/286/334)。

**muan.co** — 头部只有 logo 图形（居中窄列内左对齐）。语言切换（English / Deutsch / 正體中文）是**正文里的行内链接**，不在头部。

**demo.ghost.io（Casper 官方 demo，补充样本）** — 桌面：无 logo（demo 未设置），导航左(40–428)，右簇 搜索(1007) → Sign in(1059) → Subscribe 按钮(1127–1240)。手机：**搜索图标跑到最左(14–46)**，汉堡在最右(343–373) —— 大厂主题里唯一「搜索占左角」的形态。

## 3. 分布总结

1. **汉堡/菜单按钮恒在最右**：有汉堡的 10 站里 9 站最右（joshwcomeau、smashing、mdn、ghost.org、diygod、maggieappleton、tonsky、jim-nielsen、casper）；唯一例外 sspai 把**登录**放最右、菜单次右。
2. **工具控件几乎全在右半区**：16 站中 0 站把主题/语言/搜索放在左半区；唯一「搜索在左」出现在 Casper 的手机断点。
3. **搜索的位置**：9 个桌面头部带搜索，**全部在右簇**；其中 5 站是右簇**首位**（joshwcomeau/sspai/mdn/jim-nielsen/casper，即最靠近文字导航的一侧），3 站是右簇**最末**（smashing 输入框、ruanyifeng 输入框、sive），css-tricks 排右簇第二（前面是账户）。
4. **主题开关**：4 站有（joshwcomeau/css-tricks/tonsky/mdn），全在右侧；css-tricks 在最右，tonsky 在汉堡左侧，mdn 在第二行、语言左侧。
5. **语言切换**：头部可见的只有 2 站 —— diygod（最右）、mdn（最右）；muan 放在正文流。**没有一家把语言放左侧**。
6. **主题 + 语言同站**只有 mdn，顺序恒为 **主题 → 语言**，语言更靠外。
7. **logo 位置**：16 站**无一家居中**；jvns 是「居中横幅内左对齐」、sive/muan 是「居中窄栏内左对齐」，视觉上易误判为居中。
8. **导航位置**：紧贴 logo 左侧簇 4 站（joshwcomeau/smashing/ghost.org/casper）、靠右 6 站（css-tricks/sspai/mdn/diygod/maggieappleton/jvns）、中部 1 站（craigmod）、无导航 5 站（ruanyifeng/sive/leerob/muan/jim-nielsen）。**导航与工具控件从不同侧**。
9. **手机端收敛方式**：有汉堡的 10 站里 6 站收敛为「logo + ≤3 个图标 + 汉堡」（joshwcomeau/sspai/mdn/ghost.org/diygod/maggieappleton）；tonsky 与 jim-nielsen 头部无 logo（只剩图标 + 汉堡）；smashing 用文字「Menu」+ 第二行通栏搜索框；casper 无 logo 且搜索在左。css-tricks/jvns/craigmod 完全不折叠（文字导航横排溢出或折行）；ruanyifeng/leerob/sive/muan 手机头部只剩站名或 logo。

## 4. 建议：语言 / 搜索 / 主题 / 菜单 四枚 44px 图标怎么排

**推荐顺序（左 → 右）：语言 → 搜索 → 主题 → 菜单。**

理由按证据强度排序：
- 菜单（汉堡）**锚定最右**是唯一接近普适的规则（9/10），不要动。
- 搜索要**离开最外缘、贴内容/文字导航一侧**：5 站把搜索放在右簇首位；搜索在最右的 3 站都是「输入框形态」而不是图标。
- 主题/语言是低频「设定一次」控件，夹在中间最省高频位；mdn 的 主题 → 语言 顺序可直接沿用（语言更靠外）。
- 把两个**会展开面板**的按钮（语言、菜单）分置两端，避免相邻误触——本站汉堡面板与语言面板本就互斥，物理分开更稳。

若语言切换对本站是高频动作（三语读者），把主题与语言对调即可：**搜索 → 语言 → 主题 → 菜单**；四图标排布在样本中无先例，这一层是推断，不是实测结论。

## 5. 限制与待证

- 均为**未登录、默认 locale** 的首屏；A/B、地域重定向、cookie 主题可能造成差异（mdn 本次渲染为深色即受其主题脚本影响）。
- 只测首屏静止态，**未测滚动后 sticky 收起、hover 展开**的形态变化（如 smashing 的 More、maggieappleton 的 Garden 面板）。
- sspai 的文字菜单项 `getBoundingClientRect().top` 返回 0（fixed 定位 + 内部滚动容器），其**纵向读数不可信，横向顺序已用截图交叉核对**。
- 390px 之外的平板断点（768–1024）未覆盖；如需「平板是否已折叠」的结论要另测。
- 样本偏向英文技术博客与个人站，**中文内容站仅 sspai、ruanyifeng 两家**，中文站惯例样本不足。
