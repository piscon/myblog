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

- `bash scripts/feature-check.sh`：20 项断言覆盖所有主题耦合点（播放器/置顶 CSS/og/品牌/404 分流/归档本地化/最后更新/相关文章/站点 JS/搜索入口/语言全名/aliases/llms）
- 新增任何依赖主题 DOM/类名/钩子的功能 → 必须同步加断言
- weekly 主题 PR、build-check 两处会跑它（CMS「功能体检」按钮已于 2026-11-04 移除——action 按钮的孤儿记录会持续烧 GitHub 配额，详见 .zcode/reference/pagescms-capabilities.md §8；手动触发改走 GitHub 界面的 workflow_dispatch）

## 内容与媒体约定

- 文章正文不写 Hugo shortcode（Pages CMS Tiptap 会破坏语法）；高级排版走 Git 路径
- 视频不进 git（Netlify 配额/fair-use）；YouTube 用 `youtube_id`、B 站用 `bilibili_bvid` 字段（CMS 会校验 ID 格式）；自托管仅限小音频（`audio_file`）；外链音视频走 `audio_url`/`video_url`（模板支持但 CMS 不暴露，Git 路径维护）
- 品牌资产在 `static/branding/`（CMS 不可见）；内容图 `static/images/`；音视频目录 `static/audio|video`
- **og 分享图** = `static/branding/og-default.jpg`（1200×630，作为全站 og:image 兜底；文章有 cover 时被 cover 覆盖）。重生成：`NODE_PATH=/tmp/ogtool/node_modules node scripts/gen-og-image.js`（sharp 不进仓库，见脚本头注释）
- **editPost 已启用**（仓库公开）：文章页 meta 行有「在 GitHub 上改进本文」链接（URL+文件路径拼成具体文件）
- **菜单策略**：空的「资源」「发现」板块已从菜单摘除（section 文件保留，URL 仍可直达；填实后把 menu 项加回即可）
- **AI 爬虫**：robots 全放行 + llms.txt 友好——站点立场就是开放 AI 读取；若日后要拦截（GPTBot/ClaudeBot 等）改 robots.txt 模板/CF 规则
- **文章页元素顺序（黄金标准对齐，2026-11-04）**：面包屑（已关 ShowBreadCrumbs）→ 标题 → SEO 摘要 → meta 行（日期·阅读时间·作者·语言列表·编辑链接；ShowWordCount 已关——阅读时间已表达长度）→ 封面 → 目录 → 正文 → 媒体（media_position）→ 最后更新于 → 标签 → 分享 → 上一篇/下一篇 → 相关文章 → 评论（giscus 待凭据）。实现 = `.post-single` 全局 flex 列 + order（footer 4/related 5/giscus 6，0 组按 DOM 序），**margin 补偿**精确还原主题块布局间距（flex 不塌缩 margin：content 10/30、media 0/24、lastmod 0/20、footer-top 0；改任何一侧 margin 前先重算这三个边界）；置顶媒体经 extend_head 注入 media order:1/content order:2 覆盖静态值（feature-check 断言依赖该注入串）
- 结构性文件（`posts/_index.md` 等板块索引）已用 `.pages.yml` 的 `exclude` 挡在 CMS 外，只走 Git 路径——给它们开草稿会整块下线，CMS 列表里的条目都是真实文章
- CMS 发表文章的文件名是自动时间戳（`{year}{month}{day}-{hour}{minute}.md`，中文标题无法自动生成 slug）；URL 语义化 = 事后在 CMS 里改文件名（会换 URL），**改完把旧路径填进「旧链接跳转」（aliases）字段**——注意填 `/posts/<旧名>/`（不含语言前缀，Hugo 多语言模式自动加前缀），旧 URL 即生成 meta-refresh 跳转页；CMS actions 按钮已整体移除，防孤儿记录烧配额
- CMS 已暴露主题原生参数字段：`weight`（置顶）/`showtoc`/`searchHidden`/`robotsNoIndex`/`aliases`——纯字段、零模板工作，主题直接消费
- 评论 = giscus：`comments.html` 站点覆盖 + `hugo.toml [params.giscus]`。**待配置**：到 giscus.app 生成 repo/repoId/category/categoryId 填入即启用（repo 需开 Discussions + 安装 giscus App）；凭据留空时评论区不渲染
- 主题升级流程见 `.github/workflows/update-papermod.yml` 内联检查；升级后必跑 feature-check

## 已知边界

- YouTube iframe 大陆不可达；B 站 iframe 480p 封顶
- Pages CMS actions 只回传成功/失败，详情看 GitHub run summary（feature-check 失败时自动附 DOM 快照）
- CMS actions 卡在「Waiting for GitHub to start…」＝该次点击的 dispatch 大概率被限流拒绝，CMS 数据库里的 run 记录永远匹配不到 GitHub run；前端每 4 秒轮询状态端点、每次后端最多重试 6 次 listWorkflowRuns——**开着页面会持续烧 GitHub 配额，形成恶性循环**。正确处置：**直接关掉 CMS 标签页**（轮询状态存 sessionStorage，随标签页销毁；刷新无效、反而恢复轮询），结果以 GitHub run summary 为准；前端 12 小时后也会自动放弃追踪（2026-11-04 实例，源码 action-toast-context.tsx + api/[runId]/route.ts 核实）
- Admin→Actions 管理页永久骨架屏：库里遗留一条指向已删除 workflow（`pages-cms-lastmod.yml`，lastmod 按钮时代产物）的孤儿 run 记录，后端同步时 `listWorkflowRuns` 404 无 try/catch → 整个接口确定性 404，前端吞错骨架屏永转，每 4 秒重试持续烧配额——与 `.pages.yml` 无关（2026-11-04 抓包+git 历史定案），UI 无清理入口。处置：**勿开此页**；待上游修复（详见 .zcode/reference/pagescms-capabilities.md §8）
- `hugo.toml` 的 `baseURL` 必须与 Netlify 主域一致（现为 apex，无 www）
