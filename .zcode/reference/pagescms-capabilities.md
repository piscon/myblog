# Pages CMS 能力参考（官方文档全量整理）

> 最后核验：2026-11-04，基于 pagescms.org 当前线上文档。
> Pages CMS 为托管服务 + 开源自托管项目（github.com/pages-cms/pages-cms），**无本地版本号**；本文内容以抓取当日线上文档为准，其托管实例随时间演进，改动不另行通知。所有论断均来自实际抓取的页面；抓不到/没写的明确标注。

## 0. 文档地图与核验方法

- 入口 `https://pagescms.org/docs/`，导航共 5 组约 40 页：Introduction、Quick start、Configuration（含 14 个字段类型页）、Development（5 页）、Guides（7 页）。本次全部抓取成功（每页存在 `.md` 原文，如 `/docs/configuration.md`），无失败页。
- 适用对象：静态站点（内容即仓库文件）。官方定位：只提供「编辑层」，不替代站点生成器/部署/仓库工作流，无独立内容数据库。来源：`/docs/`。

## 1. .pages.yml 配置 schema：顶层键

来源：`https://pagescms.org/docs/configuration/`

| 顶层键 | 作用 |
|---|---|
| `media` | 上传文件的存储位置与写入内容的 URL 前缀 |
| `content` | 可编辑的 collection / file / group 列表 |
| `components` | 可复用字段定义 |
| `settings` | 仓库级行为（合并策略、commit 模板/身份、隐藏设置页） |
| `actions` | 仓库级 GitHub Actions 按钮 |

- `.pages.yml` 置于仓库根；CMS 按「仓库 × 分支」读取。
- 仓库根未提供 `.pages.yml` 时，托管 App 会引导创建。

## 2. content：内容类型定义

来源：`https://pagescms.org/docs/configuration/content/`

- 每个 entry 三种 `type`：`collection`（多文件同 schema）、`file`（单文件专有 schema）、`group`（仅侧边栏导航分组，可嵌套，经 `items` 包含子项，不产生自己的编辑路由）。
- entry 公共键：`name*`、`label`、`type*`、`path*`（collection 为目录、file 为文件路径；group 不用）、`fields`、`filename`（仅 collection）、`exclude`（忽略文件如 README.md）、`format`、`delimiters`、`subfolders`（true/false，是否允许嵌套目录）、`list`、`view`（仅 collection）、`operations`、`commit`、`actions`。
- `format` 可选值：`yaml-frontmatter` / `json-frontmatter` / `toml-frontmatter` / `yaml` / `json` / `toml` / `datagrid` / `code` / `raw`；`delimiters` 可自定义 frontmatter 包裹符（如 `"+++"`）。
- 编辑器选择（来源：`/docs/configuration/content/editors/`）：定义了 `fields` 即结构化编辑；`fields` 省略/为空则回退**原始文件编辑器**（适合 robots.txt、模板片段等）；`format: code` 为单文件代码编辑器；`format: datagrid` 为 CSV 表格编辑器（`.csv` 自动推断）。

### 2.1 filename（来源：`/docs/configuration/content/filename/`）

- 字符串模板（`filename: "{primary}.md"`）或对象 `{ template, field }`；`field`: `false`（隐藏文件名输入）/ `create`（仅新建时显示）/ `true`（新建+编辑都显示）。
- Token：`{primary}`（view.primary → title → 第一个字段）、`{slug}`（=primary）、`{year}/{month}/{day}/{hour}/{minute}/{second}`、`{fields.<name>}`（取值并 slugify）、`{<name>}` 简写。

### 2.2 view（来源：`/docs/configuration/content/view/`）

- 键：`fields`（列表显示字段）、`primary`（默认取 `title`）、`sort`、`search`、`default.search`、`default.sort`、`default.order`（asc/desc）、`layout`（`list`/`tree`）、`node`（`filename`、`hideDirs: all|nodes|others`）。
- 注意：官方 `view` 键表中**没有** `filter`。本仓库曾在三个集合用 `view.filter: {draft: false}` 隐藏草稿（官方未记载的灰色用法），2026-11-04 已按标准做法移除——草稿不隐藏，靠 `fields` 里的 `draft` 列标记状态。

### 2.3 operations（来源：`/docs/configuration/content/operations/`）

- `create` / `rename` / `delete` 三开关。默认值：collection 全 true；file 为 create=true、rename=false、delete=true。`settings` 页面（即 .pages.yml 自身管理）默认禁止删除。

### 2.4 list（来源：`/docs/configuration/content/list/`）

- 字段级 `list: true` 或对象 `{ min, max, collapsible }`，把字段重复为数组；object/block 列表可用 `collapsible: { collapsed, summary }`，summary 支持 `{index}`、`{fields.x}`、`{x}`。
- `type: file` 上 `list: true` 表示整个文件是顶层数组（如 JSON 数组）。

## 3. fields：公共键与校验

来源：`https://pagescms.org/docs/configuration/content/fields/`

- 公共键：`name*`、`label`（`false` 隐藏）、`type*` **或** `component`（二选一）、`required`、`pattern`、`hidden`、`readonly`（对嵌套 object/block/list 子树继承）、`description`（字段下方帮助文字）、`options`（各类型专有）。
- `pattern` 正则校验**当前仅 `string` 和 `text` 支持**。两种写法：字符串 `pattern: "^[a-z0-9-]+$"` 或对象 `pattern: { regex: "...", message: "..." }`（自定义错误提示）。
- `default` 键：未列在公共键表中，但各字段页示例广泛使用（boolean `default: true`、date/uuid `default: ""`）；字段开发文档给出解析顺序：显式 `default` → list 默认 → 字段注册的 defaultValue → 空值。来源：`/docs/development/fields/`。
- **`body` 是特殊键**：frontmatter 类格式下，`body` 字段映射到 frontmatter 之下的正文，其余字段都在 frontmatter 里。
- `component` 引用 `components` 中的定义，字段级属性覆盖组件属性。

## 4. 全部字段类型（14 种）

来源：`https://pagescms.org/docs/configuration/fields/<type>/` 各页。官方清单即下表，无其他内置类型。

| 类型 | 用途 | options / 特有行为 |
|---|---|---|
| `string` | 单行文本 | `minlength`、`maxlength`；支持 `pattern` |
| `text` | 多行纯文本 | `minlength`、`maxlength`；支持 `pattern` |
| `number` | 数字 | `min`、`max` |
| `boolean` | 开关 | 无专有选项；示例用 `default: true` |
| `date` | 日期/日期时间 | `time`（时间选择器）、`format`（date-fns token，如 `yyyy-MM-dd`）、`min`、`max`、`step`；默认初始化为当前本地日期(时间)，`default: ""` 才默认留空 |
| `select` | 本地固定选项 | `values`*（字符串数组或 `[{name,label}]`）、`multiple`+`min`/`max`、`placeholder`；**只支持本地静态选项**，动态来源用 `reference` |
| `image` | 图片选择/上传 | `media`（具名 media source）、`path`（默认浏览目录）、`multiple: {max}`、`extensions`、`categories`（仅 `image`）、`unique`（multiple 时禁重复路径）、`rename` |
| `file` | 非图片文件 | 同 image，但 `categories` 可为 `image/document/video/audio/compressed` |
| `rich-text` | 所见即所得正文 | `format`（`markdown`/`html`）、`switcher`（Editor/Source 切换，默认 true）、`media`（`false` 禁用插图）、`path`、`extensions`、`categories`（`image`）、`rename` |
| `object` | 嵌套字段组 | 无专有 options，写嵌套 `fields`；`required` 作用于对象本身；`readonly` 全子树继承 |
| `reference` | 关联另一 collection | `collection`*、`multiple`+`min`/`max`、`search`（逗号分隔查找字段）、`value`/`label` 模板（token：`{path}`、`{name}`、`{primary}`、`{fields.x}`、`{x}` 简写，嵌套路径支持） |
| `block` | 一列表多种对象形态 | `blocks`（块定义，可引 component 或内联 fields）、`blockKey`（类型标记键，默认 `_block`）；必须 `list: true`；块根内重复数据需再嵌一层 object list，`- list: true + component` 的扁平形态不支持 |
| `code` | 代码编辑器（高亮） | `format`: yaml/yml/javascript/js/jsx/typescript/ts/tsx/json/html/htm/markdown/mdx |
| `uuid` | UUID v4 | `editable`（允许手改）、`generate`（false 隐藏重新生成按钮）；无显式 default 时自动生成，`default: ""` 强制初始为空 |

## 5. components：可复用字段组

来源：`https://pagescms.org/docs/configuration/components/`

- `components.<name>` 定义（多为 `type: object` + `fields`），字段处用 `component: <name>` 引用；字段级 `label` 等覆盖组件级。典型用途：SEO 字段、作者信息。

## 6. media：存储与路径规则

来源：`https://pagescms.org/docs/configuration/media/`

- 服务对象：image/file 字段与 rich-text 的插图上传。回答两件事：文件存仓库哪里（`input`）、写进内容的公开路径是什么（`output`）。
- 三种形态：字符串（`media: media` ≡ `input: media` + `output: /media`）、单对象、具名对象数组（数组时 `name` 必填；不同字段类型可指向不同 source）。
- source 键：`name`**、`label`、`input`*、`output`*、`extensions`、`categories`（`image/document/video/audio/compressed/code/font/spreadsheet`）、`rename`（`false` 保留原名=**默认**；`true`/`safe` slugify；`random` 随机名）、`commit`（可覆写全局 commit 模板/身份）、`actions`（media 级按钮）。
- 字段级（image/file/rich-text）的 `media`/`path`/`extensions`/`categories`/`rename` 可覆盖 source 默认。
- 官方未提及任何「文件大小上限」「存储配额」类规则——未在官方文档中确认。

## 7. settings：仓库级行为

来源：`https://pagescms.org/docs/configuration/settings/`

- `settings.hide: true` 隐藏 UI 的 Settings 页。
- `settings.content.merge`：`false`（默认）= 保存时**仅按 schema 重写文件，schema 外的键一律移除**；`true` = 把提交字段合并进现有文件，schema 外的键保留（编辑器触及的除外）。对 Hugo 这类「模板/其他工具写入 frontmatter 参数」的站点，`merge: true` 是保住未托管参数的关键开关。
- `settings.commit.templates`：create/update/delete/rename 四条模板，默认形如 `Create {path} (via Pages CMS)`；token：`{action}`、`{path}`、`{filename}`、`{name}`、`{owner}`、`{repo}`、`{branch}`、`{user}`（遗留）、`{userName}`、`{userEmail}`、`{oldPath}`、`{newPath}`、`{oldFilename}`、`{newFilename}`。`content[]`/`media[]` 的 `commit.templates` 可按条目覆写。
- `settings.commit.identity`：`app`（默认，不发显式 committer 元数据，GitHub 记为 App 安装身份）或 `user`（随写操作发送当前用户姓名/邮箱）。同样支持按 content/media 条目覆写。

## 8. actions：按钮 → GitHub workflow_dispatch

来源：`https://pagescms.org/docs/configuration/actions/`

- 按钮出现位置：仓库级侧边栏；collection 页 / entry 页 / file 页 / media 页头部。触发方式：以 `workflow_dispatch` 启动对应 workflow，**必带一个 `payload` 字符串 input**（JSON，含触发上下文）。
- 键：`name*`、`label*`、`workflow*`（`.github/workflows/` 下的文件名）、`ref`（`current` = 当前打开的分支；默认值未写明）、`scope`（仅 collection：`collection`/`entry`）、`cancelable`（默认 true）、`confirm`（默认弹确认框；`false` 跳过；可自定义 `title`/`message`/`button`）、`fields`（派发前收集额外输入）。
- `fields` 类型：`text` / `textarea` / `select`（`options: [{label,value}]`）/ `checkbox` / `number`；支持 `required`、`default`。定义了 `fields` 时即使 `confirm: false` 也会弹对话框（表单就在对话框里）；额外输入经 `payload.inputs` 传给 workflow。
- workflow 侧必须声明 `on.workflow_dispatch.inputs.payload`（`required: true, type: string`）。payload JSON 形状（文档示例）：`source`、`action{name,label}`、`repository{owner,repo,ref,workflowRef,sha}`、`triggeredAt`、`triggerType`（如 `rerun`）、`rerunOfActionRunId`、`triggeredBy{userId,name,email,githubUsername,image}`、`context{type,name,path,data}`、`inputs{...}`。文档建议 workflow 内用 `jq`/node/`actions/github-script` 解析。
- 权限/取消：`Run again` 仅 GitHub 用户；`Cancel run` 仅在 workflow run 实际存在后可用；collaborator 只能取消自己发起的 run；`cancelable: false` 全局禁用取消。
- GitHub 侧要求仓库启用 Actions。
- **运行状态追踪机制（源码核实，2026-11-04）**：点击后 CMS 在自己数据库建 run 记录并 dispatch，随后最多 6 次×1.5 秒轮询 GitHub 找匹配 run（按创建时间窗 + 未被其他记录认领）；前端 toast 每 4 秒打状态端点、状态存 sessionStorage（随标签页销毁、刷新/复制标签/Ctrl+Shift+T 都会恢复、12 小时超时）。**故障模式**：dispatch 被限流拒绝时记录永远匹配不到 run（无服务端 TTL 清理，孤儿记录永久留存）→「Waiting for GitHub to start…」卡死，且 4 秒轮询 × 6 次重试持续烧配额形成恶性循环；孤儿记录还会拖慢所有带 action 按钮的页面和 actions 页（每次访问固定 ~6 次 API 重查）。处置：关标签页（不是刷新）止血，结果以 GitHub run summary 为准，慢属预期直至上游修复。
- **Admin→Actions 管理页永久骨架屏（2026-11-04 抓包+git 历史定案）**：该页 `GET /api/{owner}/{repo}/{branch}/actions?all=1` 读 CMS 自身数据库 run 记录（最近 ≤100 条）逐条同步，**同步对 GitHub 的调用无 try/catch**：库里只要有一条孤儿记录指向已删除的 workflow 文件，`findWorkflowRun` 的 `listWorkflowRuns` 首次调用即 404（octokit status 透传，`lib/api-error.ts`）→ 整个列表接口确定性 404 → 前端吞错（`runs` 恒 null，`actions-page.tsx`）→ 骨架屏永转 + 每 4 秒重试持续烧配额（每轮 ≥2 次调用：token 校验 + 404 list）。**本库毒源：lastmod 按钮时代（4ddaa0d 加，f0f82e3/aebaf26 移除并删 workflow 文件）遗留的孤儿记录**，引用的 `pages-cms-lastmod.yml` 已不存在；522480b 移除新按钮治不了它。**与 `.pages.yml` 无关**（删配置实验证实；后台照常还顺带证实 CMS 服务端缓存配置）。官方 demo 秒开仅因其库为空。UI 无删除入口，Cancel 对孤儿不可用（`canCancel` 需已有 workflowRunId）。处置：**勿开此页**；记录无法自行清除，待上游修复。

## 9. 认证 / 权限模型

来源：`https://pagescms.org/docs/development/authentication/`、`/docs/configuration/collaborators/`、`/docs/guides/installing/github-app/`

- 双 token 模型：GitHub 用户 token 优先，失败则回退 GitHub App installation token。选择顺序：①登录用户有无 GitHub token → ②（开启访问检查时）该 token 能否访问目标仓库 → ③能则用用户 token → ④否则查 collaborator 记录（email+owner+repo 匹配）→ ⑤有则用该仓库的 App installation token → ⑥都失败则拒绝。
- 三类操作**必须真实 GitHub 身份**（collaborator 回退不适用）：`.pages.yml` 配置管理、collaborator 管理、缓存管理。
- Collaborators：按邮箱邀请，无需 GitHub 账号；只能编辑受邀仓库的内容与媒体（仍受 `content.operations` 约束）；提交默认走 App installation token，不附带其个人身份（要个人署名需 `commit.identity: user`）。数据存数据库而非 `.pages.yml`，迁移需专门导出/导入（`/docs/guides/migrating-collaborators/`）。
- GitHub App 权限（手动配置页）：Contents RW、Actions RW、Administration RW、Checks R、Commit statuses R、Metadata R、Email addresses R；订阅事件：installation target、repository、push、delete、check run、check suite、status、workflow run。建议关闭 `User-to-server token expiration`。
- 登录方式：官方托管实例为 GitHub 登录（Quick start：`app.pagescms.org` → Sign in with GitHub → 安装 GitHub App）。自托管环境变量含 Better Auth（`BETTER_AUTH_SECRET`）与邮件（Resend/SMTP）配置，即支持邮箱邀请流程；除 GitHub 外的其他 OAuth 登录方式未在官方文档中确认。

## 10. 托管服务架构（缓存 / 数据库 / 自托管）

来源：`https://pagescms.org/docs/development/caching|database|environment-variables/`、`/docs/guides/installing/*`

- GitHub 是唯一事实源；PostgreSQL 只作读缓存（auth、collaborators、解析后的 config、缓存元数据）。缓存表：`config`、`cache_file`、`cache_file_meta`、`cache_permission`。
- 缓存时序要点：配置有 SHA 比对（TTL 门，默认 5 分钟）；文件夹快照须「meta ok + commitSha + 分支状态匹配」才可信，否则整目录回源；空目录不缓存为可信快照；webhook push 按推送规模分级处理（≤120 文件增量、≤800 文件定向失效、更大则整分支失效，`WEBHOOK_PUSH_INCREMENTAL_MAX_FILES`/`WEBHOOK_PUSH_SCOPED_INVALIDATION_MAX_FILES` 可调）；文件缓存 TTL 默认 1440 分钟。
- 对编辑者的可见效应：外部（非 CMS）推送后，CMS 列表可能有最长数分钟陈旧窗口——由上述 TTL/分级失效机制推得，官方未给出明确「刷新按钮」说明。
- 自托管：PostgreSQL + `.env`（`DATABASE_URL`、`BETTER_AUTH_SECRET`、`CRYPTO_KEY`、`BASE_URL`、`GITHUB_APP_*` 九项必填等）+ GitHub App helper（`npm run setup:github-app`）+ 迁移（`npm run db:migrate`）；官方提供 Vercel 部署按钮与 Nginx/Caddy 反代建议；运维脚本 `db:clear-cache`、collaborators export/import。

## 11. 编辑器行为限制（与 Hugo shortcodes 直接相关）

来源：`/docs/configuration/fields/rich-text/`、`/docs/configuration/content/editors/`

- 官方描述：rich-text 是 "WYSIWYG editor for formatted content"，输出 `format: markdown` 或 `html`；默认提供 Editor/Source 双模式切换（`switcher` 默认 true）。
- **当前线上文档完全未提及 Tiptap**（全部 40 页 grep 无命中）；编辑器引擎、其对非标准语法（Hugo shortcode、原生 HTML）的保留策略、Editor↔Source 往返转换行为均无官方说明——「Tiptap 会破坏 Hugo shortcode」在本仓库是实测事实（AGENTS.md），官方文档既未证实也未给出规避开关。
- 可从文档确认的相邻事实：①`body` 字段保存的就是 frontmatter 之下的正文；②需要原样保真的文件可不走 rich-text——省略 `fields` 用原始文件编辑器，或 `format: code/raw`；③`settings.content.merge: true` 只保护 frontmatter/schema 外的键，不涉及正文。
- 结论（供功能设计）：凡含 shortcode/高级排版的内容走 Git 路径编辑，CMS 只托管安全字段——与本仓库现行约定一致。

## 12. 自定义字段（平台扩展，自托管场景）

来源：`/docs/development/fields/`、`/docs/guides/creating-custom-field/`

- 内置字段注册于 `fields/core`，自定义字段放 `fields/custom/<type>/index.tsx` 自动注册，目录名即 `type`；可导出 `label/schema/defaultValue/read/write/EditComponent/ViewComponent`；校验用 Zod（`generateZodSchema` 递归组装，list/required 包裹在外层）。这是修改 CMS 源码的路径，托管实例不可用。

## 13. 已知限制与官方文档未覆盖项（本次核验结论）

- 无版本号/变更日志入口：托管服务，本文以抓取日快照为准。
- 官方文档无「预览（preview）」独立页面；预览类需求只能经 actions 自定义 workflow（如 `scope: entry` 按钮）实现。
- `pattern` 仅 string/text；select 无动态来源；reference 只能指向本仓库已配置 collection。
- 字段 `default`（公共键表未列）未见于当前文档键表（见 §3），语义按现有配置实测运行，属「官方文档未确认」。（`view.filter` 曾是另一项，2026-11-04 已移除，见 §2.2。）
- 媒体大小限制/配额、并发编辑冲突策略、Rich text 往返保真性：未在官方文档中确认。
- 抓取失败记录：无（40 页 + 索引全部 200 OK）。

## 14. 与本仓库的对接现状（仓库实测，非官方文档）

以下来自本仓库 `AGENTS.md` 与 `/home/piscon/codespace/myblog/.pages.yml` 实配，与官方文档逐条对照：

- **正则校验**：`youtube_id` 用 `pattern: ^([A-Za-z0-9_-]{11})?$`、`bilibili_bvid` 用 `^(BV[0-9A-Za-z]{10})?$` 形态校验，带中文 `message`——落在官方「string 支持 pattern（字符串或 {regex,message}）」范围内，官方已确认。
- **audio_file / video_file**：`type: file` + 具名 media source（`audio`/`video`）+ `categories` 限制——官方能力（§4 file 行），小音频自托管走此字段；视频目录在 CMS 可见但仓库约定视频不进 git。
- **「功能体检」按钮**：~~根级 `actions`（`feature-health-check` + 「检查主题更新」）~~ **2026-11-04 已整体移除**——action 按钮的孤儿记录熔炉持续烧配额（§8），手动触发改走 GitHub 界面 workflow_dispatch；恢复按钮时 workflow_dispatch 必须声明 `payload` input。
- **CMS 看不到 static/branding**：`.pages.yml` 的 media/content 只声明了 `static/images|audio|video|files` 与 `content/*`，未声明 `static/branding`——由官方「media/content 仅暴露所配置路径」机制 + 本仓库配置推得的实测事实。
- **`settings.content.merge: true` + `commit.identity: user`** 已启用：schema 外 frontmatter 键保留、提交署名为编辑者本人（官方能力，本仓库选择）。
- **rich-text `body` + Hugo shortcode 冲突**：仓库实测 CMS 编辑器会破坏 shortcode 语法；官方文档未描述该行为（§11），故本仓库约定「正文高级排版走 Git 路径、CMS Tiptap/编辑器只做普通 Markdown」。
- `filename: '{slug}.md'`、`format: toml-frontmatter`、`exclude: [_index.md]`（2026-11-04 加：板块索引原会被 CMS 当普通条目暴露，误开草稿会让整个 posts 列表页下线）、多语言三 collection（zh/ja/en）结构为仓库实测配置；`view.filter` 曾在用，2026-11-04 已移除（标准做法：`fields` 保留 `draft` 列标记草稿，不做列表过滤）。
- **feature-check 体系**（`scripts/feature-check.sh` 10 项断言，weekly PR / build-check / CMS 体检按钮三处运行）是仓库侧对「CMS + 主题耦合点」的回归防线，CMS 文档无关，属仓库自建能力。
