# 独立博客「目录（TOC）与阅读辅助」横向实况

调研日期：2026-11-07　｜　方法：只读抓取，每站首页 + 1 篇文章页 + 主样式表（共约 40 次请求，并发 ≤3）
判定口径：**文章页** DOM 中存在指向文内标题的目录结构（class/id 含 `toc` / `目录` / `aria-label="文章目录"`）才算「有」；站点导航、左侧文章树、面包屑不计。

---

## 1. 总表

| 站点 | 有无 TOC | 位置 | 实现痕迹（CSS / DOM） | 进度条 / 预计阅读时长 |
|---|---|---|---|---|
| jvns.ca | 无 | — | `screen.css` 只有 `#skiptocontent`（跳转正文），无任何 `toc` 选择器 | 无 / 无（仅日期 `May 15, 2026`） |
| danluu.com | 无 | — | 全站 3 段内联 `<style>`，无 class 化目录结构 | 无 / 无（页面无日期） |
| leerob.com | 无 | — | Next.js CSS chunk 无 `toc` 选择器；`progress` 仅浏览器控件 reset | 无 / 无 |
| overreacted.io | 无 | — | 4 个 CSS chunk 无 `toc`；`progress` 6 次全为正文单词 | 无 / 无 |
| maggieappleton.com | 无（抽样 3 页零渲染） | — | CSS **有** `.toc-panel{width:180px}`、hover 展开到 260px（`_slug_.Cj9FnxF_.css`），但 `/fortune-telling`、`/planning-agents`、`/garden` 三页均 0 命中 | 无 / 无（显示相对时间 `about 14 hours ago`） |
| robinrendle.com | 无 | 左侧固定 `nav.directory` 是**站点导航树**（7 个 `<details>` 折叠相册年份），非文内目录 | 文章页无 `toc` 类；3 段内联 `<style>` | 无 / 无 |
| craigmod.com | 无（抽样 4 页零渲染） | — | `master-1140.css` **有** `.toc{text-align:center}`、`.toc ul.bluetoc li`，但 `/essays/as_we_may_read/`、`/essays/fast_software/`、`/onmargins/`、`/books/` 全 0 命中 | 无 / 无 |
| muan.co | 无 | — | `new.css` 无 `toc`；抽样为 6KB 短 note | 无 / 无 |
| tonsky.me | 无 | — | `style.css` 无 `toc`；内联样式 0 段 | 无 / 无 |
| sive.rs | 无 | — | 内联 `<style>`，无目录结构 | 无 / 无（`2010-05-25`） |
| blog.jim-nielsen.com | 无 | — | `styles.css` 无 `toc`；`progress` 仅原生控件 reset | 无 / 无 |
| henrikkarlsson.xyz | 无 | — | Substack 模板；配置项 `enable_code_embed_toc:false`，正文无目录块 | 无 / 无（`progress` 86 次全为 `fl_progressive` 图片参数） |
| ruanyifeng.com/blog | 无 | — | **20 个 `<h2>` 的长文也无目录**；单段内联样式 | 无 / 无 |
| zhangxinxu.com | 无 | — | WordPress 主题 `style.css`（42KB）无 `toc`；文章 6×h2 + 4×h3 亦无 | 无 / 无 |
| diygod.cc | **有** | ①正文前内联折叠（默认收起）②≥1280px 右侧浮动刻度轨 | 见 §3：`<details>` + `aside[data-floating-toc]{position:absolute; left:calc(100%+44px); width:170px}` | 无 / 无（`10×h2` 长文也没有） |

> 备注：zhangxinxu.com 首次用 Chrome UA 返回 403，换 Safari UA 后 200，非站点下线。

---

## 2. 分布统计

- **有 TOC：1 / 15（6.7%）**。位置分布：**右侧 1 家（diygod.cc）、左侧 0 家**。没有「顶部内联常开」型。
- **阅读进度条：0 / 15**。没有任何一站出现 `class="*progress*"` 的进度元素；丹丹/leerob/jim 样式表里的 `progress` 都是原生 `<progress>` 控件 reset。
- **预计阅读时长：0 / 15**。正则覆盖 `min read` / `reading time` / `X min` / `分钟` 全零命中；元信息普遍只有「日期（+分类/标签）」。
- 值得注意的两个反例：
  - ruanyifeng 的 weekly 单篇 **20 个小节**，仍然没有目录——中文长文博客也不靠 TOC。
  - robinrendle 有 `<details>` 折叠结构，但那是**站点导航树**（相册年份），不是文章目录，容易误判。
- **两家「有 TOC 组件但没渲染」**：maggieappleton（Astro `.toc-panel`）、craigmod（`.toc/.bluetoc`）——样式层留了实现，抽样文章页都没输出，说明目录在这两家是**按模板/长度条件触发**而非默认开启（触发条件待证）。

### 博客 vs 文档站

样本 15 家**全部是个人博客**，无一文档站，所以「文档站怎么做」另取两家对照（同法取证）：

| 站点 | TOC 位置 | 实现 |
|---|---|---|
| starlight.astro.build（Astro Starlight 文档） | 右侧常驻 | `.right-sidebar{position:fixed; top:0; height:100vh; overflow-y:auto}`（`_astro/*.css`） |
| developer.mozilla.org（MDN） | 右侧栏 | `<aside class="layout__right-sidebar reference-layout__toc">`，内含 `reference-toc` 容器 |

差别很清楚：**文档站把 TOC 当导航骨架，默认常驻右侧、fixed/sticky、整栏独立滚动**；博客把 TOC 当可选增强，15 家里只有 1 家做，且做成了「桌面细轨 + 移动折叠」的低打扰形态。

---

## 3. 唯一有 TOC 的样本：diygod.cc（值得抄的形态）

文章：`https://diygod.cc/home-gateway/`（10×h2、9×h3 的长文）

1. **正文前内联折叠**
   ```html
   <div class="w-full max-w-2xl mx-auto px-5 lg:px-0 mb-10">
     <details class="group border border-neutral-200 dark:border-neutral-800 rounded-xl">
       <summary …><span class="… uppercase …">目录</span><span …></span></summary>
       … <button data-toc-slug="起因">起因</button> …
   ```
   - 位置：`<h1>` + 日期/分类之后、正文之前；`<details>` **无 `open` 属性**＝默认收起。
   - 条目是 `<button data-toc-slug>`，不是锚点 `<a>`——点击走 JS 滚动。

2. **≥1280px 右侧浮动刻度轨**
   ```html
   <aside class="hidden xl:block absolute top-0 left-[calc(100%+44px)] w-[170px] pointer-events-none"
          data-floating-toc aria-label="文章目录">
     <div class="flex flex-col gap-2 group/toc pointer-events-auto" data-toc-panel
          style="position:absolute; top:0; left:0">
       <button data-toc-slug="起因" class="… py-1 pr-1 …">
         <span class="block h-[3px] rounded-full … w-12"></span>
   ```
   - `position: absolute`，锚在正文列右侧 `calc(100% + 44px)`，宽 170px；`hidden xl:block` → **仅 ≥1280px 出现**。
   - 视觉是 3px 横条刻度（`h-[3px]`，宽 12/8 两档表示层级），hover 才浮出标题文字；`data-[active=true]` 时条变 4px 并转深色＝滚动高亮。
   - `pointer-events-none` 外壳防止挡住正文，只有面板本身 `pointer-events-auto`。

3. 没有配套的阅读进度条，也没有阅读时长——滚动高亮是它唯一的「阅读辅助」。

---

## 4. 建议：面向长文阅读的个人博客，TOC 放右边

1. **右侧不挡阅读动线**：正文左对齐、阅读起点在左上，右侧栏不会抢占视线第一落点；左侧留给站点 logo/导航才符合直觉。
2. **右侧更容易「弱化」**：样本里唯一实现者用 170px 细轨 + hover 出字，视线不主动扫过去几乎不存在——这正好解决「博客读者多数不需要 TOC」的现实（15/15 里 14 家干脆不做）。
3. **移动端一律折叠**：diygod 的做法（`<details>` 内联 + `hidden xl:block` 浮动轨）同时满足「窄屏不占位」和「宽屏可跳转」，且 `<details>` 无 JS 也能用。
4. 若要再加一层，**阅读进度条优先级低于 TOC**：进度条 0/15 命中，说明它不是博客的既有惯例，属于加分项而非基线。

---

## 5. 待证项

- maggieappleton `.toc-panel` 与 craigmod `.toc/.bluetoc` 的**触发条件**（按模板？按标题数？仅会员/书籍页？）——本次抽样 7 页均未命中，需查其仓库源码或逐篇枚举。
- MDN 右栏 TOC 的 `position` 具体声明：其 CSS 被拆成多个 chunk，本次抓到 `reference-layout__toc{display:flex}` 与布局片，未命中 sticky 声明；如需精确值应在 DevTools 取 computed style。
- diygod 的 `<details>` 内联目录在 ≥1280px 是否被 CSS 隐藏（DOM 上未见 `xl:hidden`，疑与浮动轨并存）——需浏览器实测确认。

## 6. 抽样文章清单（复现用）

jvns.ca/blog/2026/05/15/moving-away-from-tailwind--and-learning-to-structure-my-css-/ ｜ danluu.com/astra-testing/ ｜ leerob.com/cursor ｜ overreacted.io/how-to-fix-any-bug/ ｜ maggieappleton.com/fortune-telling（+ /planning-agents、/garden） ｜ robinrendle.com/notes/reading-matters-deeply/ ｜ craigmod.com/essays/as_we_may_read/（+ /essays/fast_software/、/onmargins/、/books/） ｜ muan.co/notes/2026-11-06-cc ｜ tonsky.me/blog/every-frame-perfect/ ｜ sive.rs/sakamoto ｜ blog.jim-nielsen.com/2026/it-gives-great-demo/ ｜ henrikkarlsson.xyz/p/four-useful-questions ｜ ruanyifeng.com/blog/2026/11/weekly-issue-418.html ｜ zhangxinxu.com/wordpress/2026/11/js-drag-set-pointer-capture/ ｜ diygod.cc/home-gateway/
