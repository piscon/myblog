# AGENTS.md — 本仓库操作规则

个人博客：Hugo + PaperMod（git submodule）+ Pages CMS + Netlify + GitHub Actions。
线上主域 `https://deux.top/`（www 301 到此）。构建命令 `hugo --gc --minify`。

## GitHub API 节俭规则（2026-11-04 配额打穿事故的产物）

- **禁止** `gh run watch` / 循环轮询 run 状态 / 部署等待循环
- 验证部署结果：`curl https://deux.top/...`（不消耗 GitHub API）
- 验证 CI 结果：单次延迟调用（`sleep N && gh run view`，N ≥ 预期构建时长）；多数情况不需要验证——工作流失败时 GitHub 自会通知/标红
- 需要等待配额重置时，用后台任务延迟执行，绝不手动重试
- **配额按 token 计，不按账号计**：gh CLI PAT、Pages CMS（用户 OAuth token）、CI（GITHUB_TOKEN）各是独立池，打穿互不影响；2026-11-04 CMS 池也打穿过一次——CMS 一次保存≈一串 Git 请求，actions 按钮派发后 CMS 还会查询 run 状态，别连发保存、别高频重跑按钮、别长期多标签页挂着 CMS；owner 池紧张时可让 collaborator 分流编辑（他们走 App installation token，独立池）
- API 备忘：Pages CMS 按钮派发必带 `payload` 输入 → workflow_dispatch 必须声明它；~~Hugo 对缺失 partial 静默跳过~~（2026-11-04 实测推翻：缺失 partial 直接构建失败；钩子体系的基础是「主题自带空 stub + 站点同名覆盖」）；PaperMod 保留 `audio`/`videos` 参数名（og 模板期待数组）

## 功能分层设计原则（2026-11-04 定案）

三者角色：Pages CMS = 输入边界（只能经 front matter 字段表达）；站点层 Hugo = 逻辑承载（唯一同时稳定且全表达的层）；PaperMod = 每周更新的易变依赖（不动 submodule 本体）。**功能逻辑绝不放在每周会变的层上。**

新功能按此顺序选实现层级：

1. **首选**：front matter 字段 + 站点层 Hugo 模板逻辑（如 `youtube_id`/`bilibili_bvid` 模式：CMS 出 ID，渲染全在站点层）
2. CSS/JS：站点层扩展机制——`assets/css/extended/*.css` + 钩子 partial（`layouts/_partials/extend_head.html` 等；主题自带空 stub、站点同名文件覆盖，天然兼容升级）
3. 必须改模板时：拷贝到站点 `layouts/` 覆盖；代价是 weekly PR 碰同名文件需人工 review diff，且 feature-check 必须覆盖该耦合点
4. **永远不改 submodule 本体**

覆盖模板的数量要克制——覆盖越多，weekly PR 可合并性越差；新功能尽量往 1、2 级收。

三者能力参考文档（版本锁定、扩展点全清单、与官方文档逐条对照）：`.zcode/reference/` 下 `pagescms-capabilities.md` / `hugo-capabilities.md` / `papermod-capabilities.md`（最后核验 2026-11-04；版本变更后应重新核验）。

## 自定义功能回归

- `bash scripts/feature-check.sh`：10 项断言覆盖所有主题耦合点（播放器/置顶 CSS/og/品牌/404）
- 新增任何依赖主题 DOM/类名/钩子的功能 → 必须同步加断言
- weekly 主题 PR、build-check、CMS「功能体检」按钮三处都会跑它

## 内容与媒体约定

- 文章正文不写 Hugo shortcode（Pages CMS Tiptap 会破坏语法）；高级排版走 Git 路径
- 视频不进 git（Netlify 配额/fair-use）；YouTube 用 `youtube_id`、B 站用 `bilibili_bvid` 字段（CMS 会校验 ID 格式）；自托管仅限小音频（`audio_file`）；外链音视频走 `audio_url`/`video_url`（模板支持但 CMS 不暴露，Git 路径维护）
- 品牌资产在 `static/branding/`（CMS 不可见）；内容图 `static/images/`；音视频目录 `static/audio|video`
- 结构性文件（`posts/_index.md` 等板块索引）已用 `.pages.yml` 的 `exclude` 挡在 CMS 外，只走 Git 路径——给它们开草稿会整块下线，CMS 列表里的条目都是真实文章
- 主题升级流程见 `.github/workflows/update-papermod.yml` 内联检查；升级后必跑 feature-check

## 已知边界

- YouTube iframe 大陆不可达；B 站 iframe 480p 封顶
- Pages CMS actions 只回传成功/失败，详情看 GitHub run summary（feature-check 失败时自动附 DOM 快照）
- CMS actions 卡在「Waiting for GitHub to start…」＝该次点击的 dispatch 大概率被限流拒绝，CMS 数据库里的 run 记录永远匹配不到 GitHub run；前端每 4 秒轮询状态端点、每次后端最多重试 6 次 listWorkflowRuns——**开着页面会持续烧 GitHub 配额，形成恶性循环**。正确处置：**直接关掉 CMS 标签页**（轮询状态存 sessionStorage，随标签页销毁；刷新无效、反而恢复轮询），结果以 GitHub run summary 为准；前端 12 小时后也会自动放弃追踪（2026-11-04 实例，源码 action-toast-context.tsx + api/[runId]/route.ts 核实）
- `hugo.toml` 的 `baseURL` 必须与 Netlify 主域一致（现为 apex，无 www）
