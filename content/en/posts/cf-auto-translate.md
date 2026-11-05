+++
lang = 'en'
title = 'Automate Blog Translation Pipeline with Cloudflare Workers AI'
date = '2026-11-05'
draft = false
source_hash = '1709fde02138a301b30bb6d2436086cc4ea57ca4428aca3018f8faa2e899bd73'
source_fields_hash = 'c1b3b3cb2793487ece0c966fe0f5e1ee56e9e7e3825edbe6eb768fbe8a2b5350'
description = 'Write in Chinese and push it up, and Japanese and English versions are automatically generated and deployed within minutes: This article fully introduces the architecture of this translation pipeline — free quotas of Workers AI, AI Gateway monitoring and caching, dual hash increment, structural QA gate, automatic SEO summary writing, and the switch to take over manual translations in CMS.'
categories = ['Technology']
tags = ['AI', 'Cloudflare', 'Hugo']
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/cf-auto-translate/) for the authoritative version.

This blog is multilingual (Simplified Chinese / Japanese / English). After writing in Chinese, the Japanese and English versions are automatically generated and deployed within minutes — this article fully introduces the final form of this pipeline.

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

- ** Deliver to git **: Translations are reviewable, rollbackable, and can be manually taken over; Netlify always gets the final Markdown
- ** Visitor side is completely static **: API credentials exist only in GitHub Actions, front-end has zero keys, zero additional requests, zero third-party scripts
- ** All requests go through AI Gateway **: Each request's token, dollar cost, and duration are logged; re-running the same content hits the cache, zero cost
- ** Partial failure does not bring down the whole **: Translation failure in one language does not affect the launch of another language.

##  Model and calling method

Use `@cf/qwen/qwen3-30b-a3b-fp8` (available in the free plan, MoE architecture activation parameter is only 3B, lowest billing tier), and turn off thinking mode - translation tasks do not need reasoning, saving quota and more stable.

Each translation is split into two calls:

| call | content | output constraints  |
|---|---|---|
| field | title / summary / category / tag / cover text | JSON Schema strong constraints, invalid format is directly blocked by the API  |
| Body | Markdown Full Text | Plain text output, keeping Markdown structure  |

The body translation has one ** structure QA gate **: compare the number of inline links, headings, and code blocks between the translation and the original. If the translation is shortened, automatically heal it mechanically according to the original URL list (restoring broken links into `[文字](URL)`). If healing fails, re-translate. Combined with output truncation guard (auto add budget and retry when reaching max_tokens limit), 180 second timeout, and 429/5xx exponential backoff, the failure rate of a single run is very low.

##  Incremental: Double hash

Each translation file's front matter has two markers:

```toml
source_hash = '…'        # 正文的 sha256（混入提示词版本号与模型名）
source_fields_hash = '…' # 字段集的 sha256
```

- Chinese**Body**changed → only re-translate the body, keep the original translation fields
- only changed**summary/tags** → only re-translate the fields, no need to re-translate the body
-  Change model or upgrade prompt → Version number changes → Translate entirely again
-  remains unchanged → 0 API calls (this full scan backup is done every Sunday at 03:17)

##  SEO summary is also managed by it

No problem if the Chinese article doesn't have a summary (left blank in CMS): the pipeline will generate a 70-160 character summary and write it back to the front matter, using it as the source for the three-language fields. The three-language summaries of ** Chinese, Japanese and English will always be from the same source**. After that, when you edit and save the summary in the CMS, the three languages will automatically follow.

##  Human always has one vote

-  Check **"Lock Translation"** in CMS translation entries → This translation is considered a human-written article: it will never be overwritten, never deleted, and even if the Chinese original is updated, it will no longer be synchronized

-  Check **"Do Not Translate"** in CMS Chinese entries → This article exits the pipeline

-  Machine translation that has been proofread will not be re-translated as long as the corresponding part of the Chinese source remains unchanged (CMS saving will not break the hash mark)

-  Lifecycle synchronization: when the Chinese is deleted, the translation is automatically cleaned up; when the Chinese is moved to draft, the translation is automatically taken offline

##  Cost

Free plan: 10,000 neurons per day. Actual test: full three-language translation of an article is about 100 neurons; only changing the summary is about 5 neurons; daily incremental updates are far from the limit. In the AI Gateway logs, you can directly query each request's token, dollar cost, and time spent.

##  This article is the product of the pipeline

The Chinese was written by me, and the Japanese and English versions were automatically generated and deployed within a few minutes after this push. You can see the three-language versions using the header language switcher.
