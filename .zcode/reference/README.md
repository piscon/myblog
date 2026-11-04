# 三层能力参考文档索引

服务于 AGENTS.md「功能分层设计原则」：CMS 定输入接口、站点层 Hugo 承载逻辑、PaperMod 只经扩展点接触。功能设计前先查对应文档，**不要凭记忆断言三者能力**。

| 文档 | 对象与版本 | 性质 | 最后核验 |
|---|---|---|---|
| `pagescms-capabilities.md` | Pages CMS（托管服务，无版本号，以抓取日线上文档为准） | 官方文档全量抓取（40 页 + 索引） | 2026-11-04 |
| `hugo-capabilities.md` | Hugo 0.169.0 extended（`netlify.toml` 锁定） | gohugo.io 文档 + 本地 0.169.0 实测构建 | 2026-11-04 |
| `papermod-capabilities.md` | PaperMod v8.0-152-g1181196（submodule 锁定，min Hugo 0.158.0） | 本地源码为权威 + wiki 补充 | 2026-11-04 |

## 重新核验的触发条件

- **Hugo**：`netlify.toml` 的 `HUGO_VERSION` 变更时（尤其跨大版本——已知风险：css.Sass 的 LibSass 自 0.153 弃用）
- **PaperMod**：weekly PR 合入大版本 tag（v8 → v9 这类）或 feature-check 断言开始失败时；小步提交无需重抓
- **Pages CMS**：托管实例行为与文档记录不符时（无版本可对，只能快照重抓）

## 关键结论速查（详见各文档）

1. **「Hugo 对缺失 partial 静默跳过」不成立**（0.169.0 实测：直接构建失败）。钩子体系 = 主题自带空 stub + 站点同名覆盖；站点侧不能调用主题没有的 partial，防御写法 `templates.Exists "_partials/foo.html"`（路径相对 layouts 目录）。
2. PaperMod 显式钩子 3 个：`extend_head`（每页 head 末尾）/ `extend_footer`（在 partialCached 缓存键内，勿放逐页内容）/ `extend_post_content`（仅文章页）。CSS 注入首选 `assets/css/extended/*.css`。
3. Pages CMS `pattern` 校验仅 string/text 支持；`settings.content.merge: true` 是保住 schema 外 frontmatter 键的关键开关（本站已开）；actions 派发必带 `payload` input。
4. `audio`/`videos` 是 PaperMod og 模板保留参数名（要求数组），本站媒体字段用 `audio_file`/`video_file`/`youtube_id`/`bilibili_bvid` 等，og meta 由 extend_head 补发。
