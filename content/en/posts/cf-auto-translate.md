+++
lang = 'en'
title = 'Build an Automatic Translation Pipeline for Your Blog with Cloudflare Workers AI'
date = '2026-11-05'
draft = false
source_hash = '466f5c8d041a9049c49ab5c8c787f169872ea6139674a77d9c9619194b784533'
source_fields_hash = '3a52d9fb87042b2fbecb73ab220895b3a276e593e4fb5fc43a7b533a0863f495'
description = 'Write the Chinese version and push it up, and the Japanese and English versions will be automatically generated and deployed within minutes: This article fully introduces the architecture of this translation pipeline — free quotas of Workers AI, AI Gateway monitoring and caching, dual hash increment, structural QA gate, automatic SEO summary writing, and the switch to take over manually translated content in the CMS.'
categories = ['Technology']
tags = ['AI', 'Cloudflare', 'Hugo']
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/cf-auto-translate/) for the authoritative version.

This blog is multilingual (Simplified Chinese / Japanese / English). After writing the Chinese version and pushing it, the Japanese and English versions are automatically generated and deployed within minutes — this article fully introduces the final form of this pipeline.

##  Overall Architecture

```
写完中文文章 push
  → GitHub Actions（translate-content）
    → 经 AI Gateway 调 Cloudflare Workers AI
    → 产物过 Hugo 构建校验（防坏 front matter 打挂部署）
    → bot 提交回写 git
      → Netlify 自动部署，日/英文版上线
```

Four Design Principles:

- ** Deliverables to git **: Translations are reviewable, rollbackable, and can be manually taken over; Netlify always gets the final finished Markdown
- ** Visitor side is completely static **: API credentials exist only in GitHub Actions, front-end has zero keys, zero additional requests, zero third-party scripts
- ** All requests go through AI Gateway **: Each request's token, dollar cost, and time spent are logged; re-running the same content hits the cache, with zero cost
- ** Partial failures do not bring down the whole system **: A translation failure in one language does not affect the release of another language

##  Model and Calling Method
The model uses `@cf/qwen/qwen3-30b-a3b-fp8` (available in the free plan, MoE architecture activation parameter is only 3B, lowest billing tier), and turns off the thinking mode - translation tasks do not require reasoning, which saves quota and is more stable.

Each translation is split into two segments for calling:

| Call | Content | Output Constraints |
|---|---|---|
| Field | Title / Summary / Category / Tag / Cover Text | JSON Schema strong constraints, invalid format is directly blocked by API |
| Content | Markdown Content | Plain Text Output, Maintaining Markdown Structure |

正文翻译有一条**结构 QA 门**：译文与原文比对行内链接、标题、代码围栏的数量，发现缩水先按原文 URL 清单机械自愈（把被打散的链接还原成 `[文字](URL)`），自愈不成再重译。配合输出截断守卫（到 max_tokens 上限自动加预算重试）、180 秒超时和 429/5xx 指数退避，单次 run 的失败面很小。

##  Increment: Double Hash

Each translation file's front matter has two markers:

```toml
source_hash = '…'        # sha256 of the main text (combined with prompt version number and model name)
source_fields_hash = '…' # sha256 of the field set
```

- 中文**正文**改了 → 只重译正文，字段沿用原译文
- 只改了**摘要/标签** → 只重译字段，正文分文不花
- 换模型或升级提示词 → 版本号变化 → 全量重译一遍
- 什么都不变 → 0 次 API 调用（每周日 03:17 的定时对账就是这样全量扫描兜底的）

## SEO 摘要也归它管

中文文章没写摘要（CMS 里留空）也没关系：流水线会生成一段 70-160 字的摘要写回 front matter，三语字段翻译以它为源——**中日英三语摘要永远同源**。之后你在 CMS 里改写摘要保存，三语自动跟进。

## 人工永远有一票

- CMS 译文条目勾**「锁定译文」**→ 这份译文视同人工稿件：永不覆盖、永不删除，中文原文更新也不再同步
-  In the CMS, if the Chinese entry is marked **"Do not translate"** → this article exits the pipeline
-  Proofread machine translation: as long as the corresponding part of the Chinese source remains unchanged, it will not be re-translated (CMS saving will not destroy the hash tag)
-  Lifecycle synchronization: When Chinese is deleted → translation is automatically cleaned; when Chinese is moved to draft → translation is automatically taken offline

##  Cost

The free plan includes 10,000 neurons per day. Actual test: a full three-language translation of an article uses about 100 neurons; only changing the summary uses about 5 neurons. Daily increments are far below the limit. In the AI Gateway logs, you can directly query the token count, dollar cost, and duration for each request.

##  This article is the product of the pipeline

The Chinese version was written by me, and the Japanese and English versions were automatically generated and deployed within a few minutes after this article was pushed. You can see the three-language versions using the page header language switcher.
