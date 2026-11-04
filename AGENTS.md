# AGENTS.md — 本仓库操作规则

个人博客：Hugo + PaperMod（git submodule）+ Pages CMS + Netlify + GitHub Actions。
线上主域 `https://deux.top/`（www 301 到此）。构建命令 `hugo --gc --minify`。

## GitHub API 节俭规则（2026-11-04 配额打穿事故的产物）

- **禁止** `gh run watch` / 循环轮询 run 状态 / 部署等待循环
- 验证部署结果：`curl https://deux.top/...`（不消耗 GitHub API）
- 验证 CI 结果：单次延迟调用（`sleep N && gh run view`，N ≥ 预期构建时长）；多数情况不需要验证——工作流失败时 GitHub 自会通知/标红
- 需要等待配额重置时，用后台任务延迟执行，绝不手动重试
- API 备忘：Pages CMS 按钮派发必带 `payload` 输入 → workflow_dispatch 必须声明它；Hugo 对缺失 partial 静默跳过（钩子体系的基础）；PaperMod 保留 `audio`/`videos` 参数名（og 模板期待数组）

## 自定义功能回归

- `bash scripts/feature-check.sh`：10 项断言覆盖所有主题耦合点（播放器/置顶 CSS/og/品牌/404）
- 新增任何依赖主题 DOM/类名/钩子的功能 → 必须同步加断言
- weekly 主题 PR、build-check、CMS「功能体检」按钮三处都会跑它

## 内容与媒体约定

- 文章正文不写 Hugo shortcode（Pages CMS Tiptap 会破坏语法）；高级排版走 Git 路径
- 视频不进 git（Netlify 配额/fair-use）；YouTube 用 `youtube_id`、B 站用 `bilibili_bvid` 字段（CMS 会校验 ID 格式）；自托管仅限小音频（`audio_file`）
- 品牌资产在 `static/branding/`（CMS 不可见）；内容图 `static/images/`；音视频目录 `static/audio|video`
- 主题升级流程见 `.github/workflows/update-papermod.yml` 内联检查；升级后必跑 feature-check

## 已知边界

- YouTube iframe 大陆不可达；B 站 iframe 480p 封顶
- Pages CMS actions 只回传成功/失败，详情看 GitHub run summary（feature-check 失败时自动附 DOM 快照）
- `hugo.toml` 的 `baseURL` 必须与 Netlify 主域一致（现为 apex，无 www）
