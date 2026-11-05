# AGENTS.md — 本仓库操作规则

个人博客：Hugo + PaperMod（git submodule）+ Pages CMS + Netlify + GitHub Actions。
线上主域 `https://deux.top/`（www 301 到此）。构建命令 `hugo --gc --minify`。

## GitHub API 节俭规则（2026-11-04 配额打穿事故的产物）

- **禁止** `gh run watch` / 循环轮询 run 状态 / 部署等待循环
- 验证部署结果：`curl https://deux.top/...`（不消耗 GitHub API）
- 验证 CI 结果：单次延迟调用（`sleep N && gh run view`，N ≥ 预期构建时长）；多数情况不需要验证——工作流失败时 GitHub 自会通知/标红
- 需要等待配额重置时，用后台任务延迟执行，绝不手动重试
- **配额按 token 计，不按账号计**：gh CLI PAT、Pages CMS（用户 OAuth token）、CI（GITHUB_TOKEN）各是独立池，打穿互不影响；2026-11-04 CMS 池也打穿过一次——CMS 一次保存≈一串 Git 请求，actions 按钮派发后 CMS 还会查询 run 状态，别连发保存、别高频重跑按钮、别长期多标签页挂着 CMS；owner 池紧张时可让 collaborator 分流编辑（他们走 App installation token，独立池）
- API 备忘：~~Pages CMS 按钮派发必带 `payload` 输入~~（按钮已移除；若日后恢复 action，workflow_dispatch 必须声明 `payload`）；~~Hugo 对缺失 partial 静默跳过~~（2026-11-04 实测推翻：缺失 partial 直接构建失败；钩子体系的基础是「主题自带空 stub + 站点同名覆盖」）；PaperMod 保留 `audio`/`videos` 参数名（og 模板期待数组）

## 功能分层设计原则（2026-11-04 定案）

三者角色：Pages CMS = 输入边界（只能经 front matter 字段表达）；站点层 Hugo = 逻辑承载（唯一同时稳定且全表达的层）；PaperMod = 每周更新的易变依赖（不动 submodule 本体）。**功能逻辑绝不放在每周会变的层上。**

新功能按此顺序选实现层级：

1. **首选**：front matter 字段 + 站点层 Hugo 模板逻辑（如 `youtube_id`/`bilibili_bvid` 模式：CMS 出 ID，渲染全在站点层）
2. CSS/JS：站点层扩展机制——`assets/css/extended/*.css` + `assets/js/site.js`（经 extend_head 指纹加载，功能自门控于主题 DOM：进度条/灯箱/TOC 高亮/**Ctrl+K 搜索快捷键**）+ 钩子 partial（`layouts/_partials/extend_head.html` 等；主题自带空 stub、站点同名文件覆盖，天然兼容升级）
- **搜索约定**：头部菜单与首页按钮统一为「图标+文字」；图标经 ui.css 定为 `1em`（精确跟随菜单文字大小）+ inline-flex 垂直居中；搜索权重在 `hugo.toml [params.fuseOpts]`（标题 2 > 摘要 1.5 > 正文 1 > 链接 0.5）；快捷键 Ctrl/Cmd+K（site.js）与主题 Alt+/ 并存；曾经把头部搜索做成 icon-only 的 `search-icon.css` 已删（2026-11-04，与首页文字按钮不一致）
3. 必须改模板时：拷贝到站点 `layouts/` 覆盖；代价是 weekly PR 碰同名文件需人工 review diff，且 feature-check 必须覆盖该耦合点
4. **永远不改 submodule 本体**

覆盖模板的数量要克制——覆盖越多，weekly PR 可合并性越差；新功能尽量往 1、2 级收。

三者能力参考文档（版本锁定、扩展点全清单、与官方文档逐条对照）：`.zcode/reference/` 下 `pagescms-capabilities.md` / `hugo-capabilities.md` / `papermod-capabilities.md`（最后核验 2026-11-04；版本变更后应重新核验）。

## 自定义功能回归

- `bash scripts/feature-check.sh`：25 项断言覆盖所有主题耦合点（播放器/置顶 CSS/og/品牌/404 分流/归档本地化/最后更新/相关文章/站点 JS/搜索入口/语言全名/aliases/llms/RSS 全文/feed 发现/x-default/RSS 列表入口/theme-color）
- 新增任何依赖主题 DOM/类名/钩子的功能 → 必须同步加断言
- weekly 主题 PR、build-check 两处会跑它（CMS「功能体检」按钮已于 2026-11-04 移除——action 按钮的孤儿记录会持续烧 GitHub 配额，详见 .zcode/reference/pagescms-capabilities.md §8；手动触发改走 GitHub 界面的 workflow_dispatch）

## 内容与媒体约定

- 文章正文不写 Hugo shortcode（Pages CMS Tiptap 会破坏语法）；高级排版走 Git 路径
- 视频不进 git（Netlify 配额/fair-use）；YouTube 用 `youtube_id`、B 站用 `bilibili_bvid` 字段（CMS 会校验 ID 格式）；自托管仅限小音频（`audio_file`）；外链音视频走 `audio_url`/`video_url`（模板支持但 CMS 不暴露，Git 路径维护）；**`video_file` 与 `video` 媒体源也已移出 CMS**（2026-11-05，防误传大视频烧 Netlify 配额；`merge: true` 保住已有键，Git 路径字段仍可用）
- `.pages.yml` 三集合 schema 经 **YAML 锚点共享**（zh 块 `&post-fields`，ja/en 引用，2026-11-05）——加字段只改 zh 块一处；代价是字段 label 统一中文。**勿在 CMS Settings UI 重存该文件**（重新序列化会展开锚点）；锚点属官方文档未确认用法，CMS 端异常时优先怀疑它（回退=展开重写）
- 品牌资产在 `static/branding/`（CMS 不可见）；内容图 `static/images/`；音视频目录 `static/audio|video`
- **og 分享图** = `static/branding/og-default.jpg`（1200×630，作为全站 og:image 兜底；文章有 cover 时被 cover 覆盖）。重生成：`NODE_PATH=/tmp/ogtool/node_modules node scripts/gen-og-image.js`（sharp 不进仓库，见脚本头注释）
- **editPost 已启用**（仓库公开）：文章页 meta 行有「在 GitHub 上改进本文」链接（URL+文件路径拼成具体文件）；URL 的分支段必须写 **master**（默认分支）——曾误写 `main` 致全站死链（2026-11-04 修复）
- **菜单策略**：空的「资源」「发现」板块已从菜单摘除（section 文件保留，URL 仍可直达；填实后把 menu 项加回即可）
- **AI 爬虫**：robots 全放行 + llms.txt 友好——站点立场就是开放 AI 读取；若日后要拦截（GPTBot/ClaudeBot 等）改 robots.txt 模板/CF 规则
- **RSS/分发约定（2026-11-04）**：RSS 全文 = PaperMod 原生 `ShowFullTextinRSS`（rss.xml 的 content:encoded，纯配置零模板，勿再自建 rss.xml 覆盖）；文章页 feed 发现链接与 hreflang `x-default` 由 extend_head 补发（主题只在首页/列表页发 feed link——单页自身无 RSS 输出格式；x-default 恒指默认语言 zh 版，仅多语言页发出、单语言页不发，feature-check 正反双断言；默认语言判断用 `hugo.Sites.Default`——`site.Sites` 自 0.156 弃用）；安全头（nosniff/XFO DENY/Referrer-Policy/HSTS 1年）在 netlify.toml `/*` 规则，CSP 因主题与站点层大量 inline style/script 暂不上；profileMode 社交图标占位死链（平台首页）已删，拿到真实主页后经 `profileMode.socialIcons` 加回
- **多语言约定**：`displayFullLangName = true`（头部切换器与文章页翻译列表显示 简体中文/日本語/English 全名，而非 Ja/En 缩写）；头部切换器经 site.js 注入**全量常驻**——当前语言按权重位插入并高亮标记（不可点），三语言顺序恒定（简体中文→日本語→English），JS 禁用回退主题默认「只列其他语言」；**小屏（≤768px，与主题 zmedia 断点一致）自动切短码 ZH/JA/EN**（双标签 span 由 site.js 包裹、CSS 按断点显隐——三个全名+logo+主题按钮在手机上会换行）；切换器容器标 `translate="no"`/`notranslate`（防 Chrome 翻译篡改语言名；页面级翻译提示是 Chrome 设备语言≠页面语言的正常行为，用户侧「一律不翻译此网站」可永久关闭，站点不强禁——访客可能需要翻译 zh 长文）；切换器语义 = 跳对方语言首页（文章页同页切换走 translation_list，hreflang 已对齐）；翻译标签主题自带（语言:/言語/Translations，旧式 `- id:` YAML 格式，grep 顶层键会漏查）；站点 i18n 覆盖试验过——新格式 yaml **未能稳定覆盖**主题旧格式键，故不采用，缺文案时优先查主题 `- id:` 格式
- **语言级元数据必须覆盖**（2026-11-04 修复 en/ja 中文泄漏）：`languages.ja/en` 各自显式设置 `title`（ja=二重奏，日文原生词；en=Deux，域名品牌）与 `[languages.xx.params]` 的 `description`/`keywords`——全局 `[params]` 的中文 title/description/keywords 曾原样泄漏到 en/ja 页面与 RSS。meta author 与页脚 © 的「二重奏」是**笔名/品牌，有意保留不翻译**
- **文章页元素顺序（黄金标准对齐，2026-11-04）**：面包屑（已关 ShowBreadCrumbs）→ 标题 → SEO 摘要 → meta 行（日期·阅读时间·作者·语言列表·编辑链接；ShowWordCount 已关——阅读时间已表达长度）→ 封面 → 目录 → 正文 → 媒体（media_position）→ 最后更新于 → 标签 → 分享 → 上一篇/下一篇 → 相关文章 → 评论（giscus 待凭据）。实现 = `.post-single` 全局 flex 列 + order（footer 4/related 5/giscus 6，0 组按 DOM 序），**margin 补偿**精确还原主题块布局间距（flex 不塌缩 margin：content 10/30、media 0/24、lastmod 0/20、footer-top 0；改任何一侧 margin 前先重算这三个边界）；置顶媒体经 extend_head 注入 media order:1/content order:2 覆盖静态值（feature-check 断言依赖该注入串）
- **响应式约定**：断点与主题对齐（768px = zmedia；1280px = 浮动目录自定）；**≥1280px 目录悬浮**于正文右侧空白（site.js 强制 `details.toc` open + CSS `details.toc[open]` fixed 定位、隐藏 summary——`:has`/open 门控保证 JS 禁用时回退内联折叠条；.toc 独立滚动防长目录溢出）；表格 `overflow-x:auto` 防撑破窄屏；移动端语言短码 ZH/JA/EN（见多语言约定）；正文列保持 720px 窄测（65-75ch 可读性标准，大屏留白是特性）；不加汉堡菜单（5 项折行可接受）、不加 CJK 两端对齐（中英混排拉伸难看）
- **字体栈约定（2026-11-04）**：主题原栈纯拉丁、无 CJK 字体——ja 页面兜底命中中文字体，汉字被排成中式字形。ui.css 按语言显式栈：zh=系统 UI 拉丁 + PingFang SC/微软雅黑 UI/Noto Sans CJK SC；**ja=系统 UI 拉丁 + Hiragino/Yu Gothic/Noto Sans CJK JP**（字形变体正确）；en=纯拉丁栈；`text-autospace: normal` 自动中西文间距（渐进增强）。**有意不引网页字体**：大陆可达性 + CJK 字体多 MB；若未来要全平台像素级一致，自托管切片 Noto Sans SC/JP（重量级工程，暂不做）
- 结构性文件（`posts/_index.md` 等板块索引）已用 `.pages.yml` 的 `exclude` 挡在 CMS 外，只走 Git 路径——给它们开草稿会整块下线，CMS 列表里的条目都是真实文章
- CMS 发表文章的文件名默认时间戳（`{year}{month}{day}-{hour}{minute}.md`，中文标题无法自动生成 slug），`field: create`（2026-11-05）＝**新建时文件名输入框可见、可当场改成语义化 slug**（需实测确认预填模板值）；事后改名的老流程不变（会换 URL），**改完把旧路径填进「旧链接跳转」（aliases）字段**——注意填 `/posts/<旧名>/`（不含语言前缀，Hugo 多语言模式自动加前缀），旧 URL 即生成 meta-refresh 跳转页；CMS actions 按钮已整体移除，防孤儿记录烧配额
- CMS 已暴露主题原生参数字段：`weight`（置顶）/`showtoc`/`searchHidden`/`robotsNoIndex`/`aliases`——纯字段、零模板工作，主题直接消费
- **AI 翻译流水线（2026-11-05，架构加固版）**：push `content/zh/**`（另有 workflow_dispatch 与周日 03:17 JST weekly 对账）→ `translate-content` workflow 跑 `scripts/translate.mjs`（Workers AI 免费计划，模型 `@cf/qwen/qwen3-30b-a3b-fp8`，经 **AI Gateway `blog-translate`**：7 天响应缓存=同 prompt 重放 0 neuron、请求日志在 CF dashboard 看 token/neuron 消耗；本地无 token 时自动回退 `cf` CLI OAuth 直连）生成 `content/{ja,en}/posts/<同名>.md` 并回写 git（`[skip-translate] [skip-lastmod]`）；commit 前 `hugo --gc --minify` 校验产物防坏 TOML 打挂 Netlify 部署。两段式调用：字段走 `response_format json_schema` 强约束（qwen3 实测支持，官方支持列表未收录；报「JSON Mode couldn't be met」自动降级纯解析）、正文走纯文本（**Markdown 塞 JSON 会被模型打散链接语法**）。可靠性：finish_reason=length 判截断自动加预算重试；REST 180s/子进程 240s 超时；429/5xx 指数退避 2s/8s，403/400 快速失败；**结构 QA 门**（链接/标题/代码围栏计数与原文比对，缩水先 `healLinks` 自愈——按原文 URL 清单把 `text（url）` 机械还原成 `[text](url)`，自愈不成再升级式重试：第 2 次在 user 消息附加链接语法强提醒）。**增量双 hash**：`source_hash`=正文、`source_fields_hash`=字段，互不连坐（CMS 里改摘要只花字段调用的钱）；旧合并 hash 文件下次源变更自动迁移。**部分成功即提交**：失败计数写 `GITHUB_OUTPUT`，workflow 红牌步骤标红 run，重跑 hash 命中不重复计费；全部失败才 exit 1。**人工保护**：无 `source_hash` 的译文（手写，或经 CMS 编辑后标记被剥离）永不覆盖/删除；人工校对过的机翻只要 zh 源不动就不会被重译。zh 源删除→删机翻目标；zh 转 draft→目标 draft 同步。单篇退出：zh 加 `auto_translate = false`。Secrets：`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`（Workers AI Run 权限）。每次 zh 内容变更会有两次 Netlify 部署（原文 push + 译文 push），正常现象
- 评论 = giscus：`comments.html` 站点覆盖 + `hugo.toml [params.giscus]`。**待配置**：到 giscus.app 生成 repo/repoId/category/categoryId 填入即启用（repo 需开 Discussions + 安装 giscus App）；凭据留空时评论区不渲染
- 主题升级流程见 `.github/workflows/update-papermod.yml` 内联检查；升级后必跑 feature-check

## 已知边界

- YouTube iframe 大陆不可达；B 站 iframe 480p 封顶
- Pages CMS actions 只回传成功/失败，详情看 GitHub run summary（feature-check 失败时自动附 DOM 快照）
- CMS actions 卡在「Waiting for GitHub to start…」＝该次点击的 dispatch 大概率被限流拒绝，CMS 数据库里的 run 记录永远匹配不到 GitHub run；前端每 4 秒轮询状态端点、每次后端最多重试 6 次 listWorkflowRuns——**开着页面会持续烧 GitHub 配额，形成恶性循环**。正确处置：**直接关掉 CMS 标签页**（轮询状态存 sessionStorage，随标签页销毁；刷新无效、反而恢复轮询），结果以 GitHub run summary 为准；前端 12 小时后也会自动放弃追踪（2026-11-04 实例，源码 action-toast-context.tsx + api/[runId]/route.ts 核实）
- Admin→Actions 管理页永久骨架屏：库里遗留一条指向已删除 workflow（`pages-cms-lastmod.yml`，lastmod 按钮时代产物）的孤儿 run 记录，后端同步时 `listWorkflowRuns` 404 无 try/catch → 整个接口确定性 404，前端吞错骨架屏永转，每 4 秒重试持续烧配额——与 `.pages.yml` 无关（2026-11-04 抓包+git 历史定案），UI 无清理入口。处置：**勿开此页**；待上游修复（详见 .zcode/reference/pagescms-capabilities.md §8）
- `hugo.toml` 的 `baseURL` 必须与 Netlify 主域一致（现为 apex，无 www）
