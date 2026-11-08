# 独立博客字号体系与小字下限调研（15 站）

- 取样日期：2026-11-07
- 样本：batch 给定的 15 个站点，全部抓取成功
- 方法：抓首页 HTML → 主 `<link rel=stylesheet>`（最多 3 个）→ 解析 `font-size` / `line-height` / `max-width`；无外链 CSS 的站点直接读内联 `<style>`；每站 2–3 个请求，并发 ≤3
- 只读抓取：样本站 CSS 只缓存在 `/tmp/fontsurvey/`，未改动任何样本站；本文件是唯一写入

## 一、结论

1. **正文主流是 16–18px，不是 20px+。** 15 家里 11 家正文落在 16–18px（16px 六家、17px 一家、17.6–18px 四家），只有 4 家用 20–22px。
2. **小字下限的实测中位数是 12–13px。** 排除上标/代码/未使用 token 后：10px 一家、11px 两家、12px 四家、13px 三家、14–15px 三家、16px 两家。
3. **8px 只在一个 About 作者 bio 的显式规则里出现，且不在文章阅读路径；10px 只出现在侧栏深层列表这类非阅读路径（另有个别未使用工具类）。** 没有站点把 8/10px 用作常规 meta、日期或标签。
4. **11–11.5px 不算“离谱”，但已经在辅助文字的下沿。** 规范里 11px 只出现在 Material 3 的 `label-small` 这类非关键标签档；中文正文旁的说明文字用 11px 会明显偏小。
5. **字号阶梯多数收敛在 6–10 级，中位数 7 级。** Tailwind/Substack 站点因为工具类/营销页 token 会虚高到 10–16 个值，手写站点多在 6–9 级。
6. **规范并不支持 8px：** WCAG 不设最小字号（只要求 200% 可缩放）；USWDS 明确正文“至少 16px”；GOV.UK 正文 19px、16px 只作小号 sparingly；Butterick 给网页正文 15–25px；Material 3 最小档 `label-small` 是 11px。**结论：8px 应删除；10px 只配装饰性数字；11/11.5px 合并进 12px。**

## 二、口径

- **“正文”**＝阅读段落的实际字号，不是 `body` 元素本身。典型例子：craigmod 的 `body` 是 62.5%（10px）的换算基座，段落 `p` 是 1.8em＝18px；robinrendle 的 `body` 16px，但 `main` 是 1.3rem＝20.8px。
- **“字号取值数（绝对 / 含相对）”**：斜杠左边只数主 CSS 里可直接解析的 px/rem 值（去重、去 0、不含 em/%/calc/var）；右边把 CSS 变量、em、% 按上下文换算后计入（估算，用于看真实阶梯）。
- **“最小字号”**：排除 `sup/sub`、代码块、装饰性 drop cap、以及首页没有出现的工具类；优先取日期、meta、图注、标签、页脚等常驻辅助文字。
- **列宽换算**：1 个 CJK 字≈1em，1 个西文字符≈0.5em；CSS 原生 `ch` 单独标注。所有“≈”均为估算，不是渲染测量。
- 只做静态 CSS 核对，未在浏览器渲染；媒体查询里的移动值只在 CSS 明写时记录。

## 三、主表

| 站点 | 正文 px | 字号取值数（绝对 / 含相对） | 最小字号 / 用途 | 行高 | 列宽（≈ch） |
|---|---:|---:|---|---|---|
| jvns.ca | 16 | 3 / 9 | 12px 日期·标签（75%）；13px 代码 | 1.25（20px） | 45em＝720px（≈90 西文 / 45 汉字） |
| danluu.com | 16 | 0 / 1 | 仅 16px（无小字层级） | normal（≈1.2） | 未限宽（全宽） |
| leerob.com | 17 | 11 / 11 | 13px 文章 meta/脚注（10/11px 是未使用工具类） | 1.6（27.2px） | 600px（≈75 / 37.5） |
| overreacted.io | 16 | 7 / 8 | 13px 日期；14px small | 1.5（24px） | 42rem＝672px（≈84 / 42） |
| maggieappleton.com | 20–22 | 1 / 7 | 13px 2xs 标签；14px tooltip | 1.5（30–33px） | 未声明（页面容器 1420px） |
| robinrendle.com | 20.8 | 1 / 6 | 15px 页脚（12px token 未在首页用） | 1.3（27px） | 41rem＝656px（≈82 / 41） |
| craigmod.com | 18 | 8 / 10 | 11px 页脚/版权；12px 图注；6px 上标 | 1.5em（27px） | 65.4%×1140≈746px（≈93 / 46） |
| muan.co | 17.6 | 7 / 7 | 11.2px 标签胶囊；12.8px 语言链接 | 1.62em（28.5px） | 36em＝634px（≈79 / 40） |
| tonsky.me | 17.9 | 1 / 7 | 14.9px 日期/注释/图注（12.5px 上标） | 1.5（26.9px） | 575px（≈72 / 36） |
| sive.rs | 20 | 2 / 6 | 12.8px 小字/日期/meta | 1.6（32px） | 60ch≈600px（≈75 / 37.5） |
| blog.jim-nielsen.com | 18 | 11 / 11 | 12px 网格列表 meta；12.6px 列表 meta | 1.5（27px） | 32rem＝576px（≈72 / 36） |
| henrikkarlsson.xyz | 20 | 16 / 16 | 14px meta（11/12/13px 是设计 token） | 1.6em（32px） | 728px（≈91 / 45.5） |
| ruanyifeng.com/blog | 16 | 0 / 1 | 仅 16px（主 CSS 被注释掉） | normal（≈1.2） | 未限宽（全宽） |
| zhangxinxu.com | 16 | 9 / 9 | 10px 侧栏三级列表；11px 图注；12px 页脚 | 1.7（27.2px） | 728px（≈91 / 45.5） |
| diygod.cc | 16 | 10 / 10 | 12px 日期/分类；14px meta | 1.75（28px） | 65ch≈520px（≈65 / 32.5） |

## 四、分布

### 4.1 正文字号

| 档位 | 家数 | 站点 |
|---|---:|---|
| 16px | 6 | jvns.ca、danluu.com、overreacted.io、ruanyifeng.com/blog、zhangxinxu.com、diygod.cc |
| 17px | 1 | leerob.com |
| 18px 档（17.6–18） | 4 | muan.co（17.6）、tonsky.me（17.9）、craigmod.com（18）、blog.jim-nielsen.com（18） |
| 20–22px | 4 | sive.rs（20）、henrikkarlsson.xyz（20）、robinrendle.com（20.8）、maggieappleton.com（20–22） |

**读法**：16px 仍是最大公约数；17–18px 是“舒适阅读”档；20px+ 四家全部是长文型/设计导向站点，不是主流。

### 4.2 最小字号

| 档位 | 家数 | 站点（最小字号 / 用途） |
|---|---:|---|
| 10px | 1 | zhangxinxu.com（侧栏三级列表） |
| 11px | 2 | craigmod.com（页脚/版权 11）、muan.co（标签 11.2） |
| 12px | 4 | jvns.ca（日期/标签 12）、blog.jim-nielsen.com（网格 meta 12）、diygod.cc（日期/分类 12）、sive.rs（meta 12.8） |
| 13px | 3 | leerob.com（meta 13）、overreacted.io（日期 13）、maggieappleton.com（2xs 13） |
| 14–15px | 3 | tonsky.me（日期/图注 14.9）、henrikkarlsson.xyz（meta 14）、robinrendle.com（页脚 15） |
| 16px | 2 | danluu.com、ruanyifeng.com/blog（无小字层级） |

**读法**：落在 11px 的 2 家、12px 的 4 家、13px 的 3 家——**11/12/13px 是真实存在的辅助文字区间，但 12–13px 才是多数派**。10px 及以下只有 1 家，且不在阅读路径上。

### 4.3 阶梯数量

有效阶梯数排序：1、1、6、6、7、7、7、7、8、9、9、10、10、11、16。中位数 **7 级**，去掉 Tailwind/Substack 的工具类虚高后，手写站点集中在 **6–9 级**。

## 五、逐站证据

> 均为 2026-11-07 抓取到的规则原文（节选）；“→”后为换算值。

- **jvns.ca**（`https://jvns.ca/stylesheets/screen.css`）
  - `html, body, div, span, ... { font-size: 100%; }`；`body { line-height: 1.25em; }`；`#wrap { max-width: 45em; }`
  - `.date { font-size: 75%; }`、`.post-tag { font-size: 75%; }` → 12px；`pre { font-size: 13px; }`；`.article-list time, .article-list a { font-size: 14px; }`
  - 行高 1.25 在样本里属于偏紧的一档，正文密度明显高于其他站。

- **danluu.com**（无外链 CSS；首页内联 `<style>` 仅 170B，只有列表/图片规则，无 `font-size`）
  - 浏览器默认 16px，全文无字号层级；首页是裸 `<ul>` 列表，正文页也无内容列宽限制。
  - 这是“零排版系统”的极端样本：0 个字号声明。

- **leerob.com**（`https://leerob.com/_next/static/chunks/5856c06b82696be0.css`）
  - `body { font-size: 17px; line-height: 1.6; }`；`.content-frame { --content-width: 600px; width: min(100%, var(--content-width)); }`
  - `.article-meta { font-size: 13px; }`；`.footnote > p { font-size: 13px; }`；CSS 另有 `.text-[10px]` / `.text-[11px]` 工具类，首页 HTML 未出现。

- **overreacted.io**（`https://overreacted.io/_next/static/css/32243486fa3c683e.css`）
  - 无 `body` 字号声明 → 16px 默认；`html { line-height: 1.5; }`；`.max-w-2xl { max-width: 42rem; }`（672px）
  - `.text-[13px]` 用于日期；`.text-sm` 14px；标题 28/30/40px。

- **maggieappleton.com**（`https://maggieappleton.com/_astro/_slug_.rSj0_u2z.css` 等 3 个）
  - 流体 token：`--font-size-2xs: 13px`；`--font-size-xs: 14.5–15`；`--font-size-sm: 16–16.5`；`--font-size-base: 20–22`；`md: 25–28.6`；`lg: 30–36`；`xl: 39.06–44`；`2xl: 46.87–56`
  - `p, ul, ol { font-size: var(--font-size-base); }`；`body { line-height: 1.5; }`；未找到正文列 `max-width`（页面 wrapper 1420px）。

- **robinrendle.com**（内联 `<style>` 34KB）
  - `--font-size-1: .75rem`（12）、`-2: .875rem`（14）、`-3: .9375rem`（15）、`-4: 1.1rem`（17.6）、`-5: 1.3rem`（20.8）；`main { font-size: var(--font-size-5); }`
  - `body { line-height: 1.3; }`；`--size-content-width: 41rem`；12px token 在首页只定义未使用，页脚实际 15px。

- **craigmod.com**（`https://craigmod.com/css/master-1140.css?v=20261018a` + `1140.css`）
  - `body { font-size: 62.5%; }`（10px 基座）；`p, li, blockquote { font-size: 1.8em; line-height: 1.5em; }` → 18px / 27px
  - `@media (max-width: 768px) { body { font-size: 55% !important; } }`，移动端 p 约 15.8–17.6px；`.eightcol { width: 65.4%; }` × 1140px 容器 ≈746px
  - `.small { .6em }`、`sup/sub { .6em }`；About 的 `.metabio { .8em }` → 8px 是本样本唯一 8px，但不在文章阅读路径。

- **muan.co**（`https://muan.co/assets/new.css`）
  - `body { font-size: 1.1rem; line-height: 1.62em; }` → 17.6 / 28.5；`header, main, footer { max-width: 36em; }` → 634px
  - `.note-tag { font-size: 11.2px; }`；`.lang { font-size: 12.8px; }`；`article { font-size: 1rem; }`

- **tonsky.me**（`https://tonsky.me/style.css?t=1792101836`）
  - `:root { --cap-height: calc(1rem * 12.5 / 16); --cap-ratio: calc(1 / 0.698); --font-size: calc(var(--cap-height) * var(--cap-ratio)); --width: 575px; }`
  - `body { font-size: var(--font-size); line-height: 1.5; }` → 17.9 / 26.9；`.date` / `.note` / `figcaption` 均用 `font-size: var(--font-small)` → 14.9
  - 移动端 `@media (max-device-width: 480px) { :root { --cap-height: calc(1rem * 18 / 16); } }` → 25.8px，手机反而放大。

- **sive.rs**（内联 `<style>` 2.4KB）
  - `body { max-width: 60ch; font-size: 1.25rem; line-height: 1.6; }` → 20 / 32
  - `small, li > time, p.meta { font-size: .8rem; }` → 12.8

- **blog.jim-nielsen.com**（`https://blog.jim-nielsen.com/styles.css`）
  - `html { font-size: 1.125rem; line-height: 1.5; }` → 18；`--max-width: 32rem` → 576
  - `.posts-list--grid span:last-child { font-size: .666rem; }` → 12；`.posts-list span:last-child { .7rem }` → 12.6；`footer p { .777rem }` → 14

- **henrikkarlsson.xyz**（Substack 主题 CSS：`https://substackcdn.com/bundle/theme/main.03ed383a0f1560d492bc.css`）
  - `body { font-size: calc(var(--font_size_body_desktop, 19px) + var(--font_size_body_offset, 0px)); }`；页面变量 `--font_size_body_offset: 1px` → 20px；移动端 `17px + 1px` → 18
  - `.typography p { line-height: 1.6em; }` → 32；`.container { max-width: 728px; }`；字号 token 11/12/13/14/15/17/19/20/24/28/30/32/36/38/44/55

- **ruanyifeng.com/blog**（无外链 CSS：主页 `<link rel="stylesheet" ...>` 被 HTML 注释包住；内联 `<style>` 仅 204B，只有背景色）
  - 浏览器默认 16px，行高 normal，无列宽限制；0 个字号声明。

- **zhangxinxu.com**（`https://www.zhangxinxu.com/wordpress/wp-content/themes/default/style.css?v=1`）
  - `.entry { font-size: medium; line-height: 1.7; }` → 16 / 27.2；`.post, #content ... { width: 728px; max-width: 100%; }`
  - `.sldebar_out ul ul li { font-size: 10px; }`；`.wp-caption p.wp-caption-text { font-size: 11px; }`；`#footer p { font-size: 12px; }`

- **diygod.cc**（`https://diygod.cc/_astro/_slug_.BO2eiwd2.css`）
  - `.prose { font-size: 1rem; line-height: 1.75; max-width: 65ch; }` → 16 / 28 / ≈520px
  - `.text-xs { font-size: 12px; }`（日期/分类）；`.prose-sm { 14px }`、`.text-sm { 14px }`

## 六、规范依据

| 来源 | 关键原文/结论 | URL |
|---|---|---|
| WCAG 2.2 SC 1.4.4 Resize Text | 正文可放大到 200% 且不丢内容/功能；**标准本身不设最小字号** | https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html |
| USWDS Typography | “For most text, including body copy, use at least an effective size of 16px (font-size 5). Smaller and larger text can be used sparingly for special purposes (like headings, captions, photo credits, footnotes, data tables, or specialized UI elements).”；正文 45–90 字符；长文行高至少 1.5 | https://designsystem.digital.gov/components/typography/ |
| GOV.UK Design System — Paragraphs | 默认段落 19px；`govuk-body-s` 16px，“use sparingly”，“majority of your body copy should use the standard 19px” | https://design-system.service.gov.uk/styles/paragraphs |
| Butterick’s Practical Typography — Point size | “On the web, the optimal size is 15–25 pixels.” | https://practicaltypography.com/point-size.html |
| Material Design 3 type tokens（v0.192） | `body-large` 1rem（16px）、`body-medium` .875rem（14）、`body-small` .75rem（12）、`label-small` .6875rem（11） | https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/v0_192/_md-sys-typescale.scss |

**规范侧的读法**：16px 是“正文”的推荐下限（USWDS），不是“所有 UI 文字”的下限；11px 只出现在 Material 的最小 label 档。**没有任何一份主流规范把 8px 列为可用字号。**

## 七、建议

1. **正文**：CJK 博客定 **18px**（下限 16px）；西文为主的正文 16–18px 均可。样本里 16px 最多，但 CJK 16px 的阅读密度明显高于西文。
2. **小字下限**：**12px 作为硬下限**。11px 只允许用于非关键的拉丁标签/数字/角标（Material `label-small` 的 11px 依据），中文说明文字不要低于 12px；**8px、10px 从设计稿删除；11.5px 并入 12px**。
3. **字号阶梯收敛到 7 级**：`12 / 14 / 16 / 18 / 22 / 28 / 36`（辅助 12、标签/meta 14、正文 18、卡片标题 16–18、区块标题 22、文章标题 28、展示 36）。若要更紧，用 6 级 `12 / 14 / 16 / 18 / 24 / 32`。
4. **对设计稿的直接判断**：8px 和 10px 明显偏离真实博客与规范；11px/11.5px 不算离谱但偏小，且 11.5 这种半像素档没有样本支持——**统一到 12px 更干净**。

## 八、局限

- 静态 CSS 核对，未渲染；maggieappleton 首页、leerob 首页等有 JS 注入/按需 CSS，可能漏掉页面级样式。
- Tailwind（overreacted/leerob/diygod）和 Substack（henrikkarlsson）的“字号取值数”包含工具类/营销页 token，偏高于真实阅读页使用的级数。
- 字号数量按 CSS 声明去重，不等于全部在正文页出现；表格已尽量用 selector 与用途交叉核对。
- 未核对颜色对比度、字重、字体 x-height；同一 px 在不同字体上视觉大小不同（Butterick 也强调这点）。
- 抓取时间 2026-11-07，站点改版后结论可能变化。