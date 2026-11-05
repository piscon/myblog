+++
lang = 'en'
title = 'Building an Automated Blog Translation Pipeline with Cloudflare Workers AI'
date = '2026-11-05'
draft = false
source_hash = 'de9ac8b34f390c6997848e694a961f44c99ddb6777184da3ba96e09c4a11e6ec'
source_fields_hash = 'be5b7a14d7d7e75a0df12394bcfbbec0466d7670a85d27a211ac0463172f2cc4'
description = 'Learn how to build a pipeline that automatically generates Japanese and English versions of your blog posts using Cloudflare Workers AI. This guide covers protecting Markdown syntax, optimizing costs, and ensuring translation quality.'
categories = ['Tech']
tags = ['AI', 'Cloudflare', 'Hugo']
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/cf-auto-translate/) for the authoritative version.

This blog is trilingual (Simplified Chinese / Japanese / English). Once I finish writing in Chinese and push it, the Japanese and English versions are automatically generated and deployed within minutes—with no manual translation involved in between. This article explains in plain language how it works and the pitfalls I encountered along the way.

## I. The Big Picture

The entire pipeline runs on GitHub Actions, using only free resources:

```
写完中文文章 push
  → GitHub Actions 触发翻译
    → 调 Cloudflare Workers AI（免费额度）
    → 译文先过几道自动检查
    → 检查通过，机器人提交回仓库
      → Netlify 自动部署，日/英文版上线
```

Before starting, I set four rules that proved to be lifesavers:

- **Translations go into git**. The Japanese and English versions are real files in the repository, which can be opened, edited, or rolled back at any time. AI is just the "first draft author," not the publishing channel.
- **The visitor side is completely static**. API keys exist only within GitHub Actions; there are zero keys and zero third-party scripts on the webpage, so readers won't use an extra watt of electricity on my account.
- **Every call is billed**. All requests pass through an AI Gateway, which logs every detail: how many tokens were used, how much it cost, and how long it took.
- **Partial failures don't bring down the whole system**. If the Japanese translation succeeds but the English one fails, the Japanese version goes live first, while the English version keeps the old version and waits for a retry.

## II. The Core Challenge: AI Can Ruin Markdown

Having AI translate plain text works quite well. But blog posts aren't just plain text—they are mixed with links, code blocks, tables, and list markers. In the early days, I would throw the entire Markdown file directly at the model, and the results often "looked correct" but were actually broken. Here is a real example:

```
原文：1. *感谢 [Hugo](https://gohugo.io) 提供代码支持*
翻后：[1. *Hugo](https://gohugo.io)に…（列表标记和星号被吞进了链接文字）
```
The worst part is that this kind of damage ** won't trigger an error **—the link remains the same, the page renders as usual, and you won't notice it unless you look closely. Simply writing "Please maintain the format" in the prompt is useless in practice: if the model can see the syntax, it can't help but mess with it.

The final solution I used was very direct: **don't let the AI see the syntax**.

Before translating, the program "disassembles" the article: code blocks, link addresses, inline code, and various markup symbols are all replaced with numbered placeholders like «0» and «1». All the AI sees are pure Chinese sentences plus a few numbers, so it has no way to break the syntax. After translation, the program swaps the placeholders back exactly as they were.

The disassembly uses a Markdown parser (remark) to locate elements via a syntax tree rather than using hard-coded regular expression matching—the parser understands all standard syntax, so no patches are needed when new syntax emerges. After translation, there are several automated checks:

1. **Placeholder Integrity**: Each placeholder must return exactly once; if any are missing, extra, or duplicated, it's considered a failure.
2. **Position Check**: List markers must still be at the beginning of the line, and closing symbols must still be at the end of the line.
3. **Structural Comparison**: The number of links, headings, and tables in the translation must match the original.

If the checks fail, it automatically retries; if that still doesn't work, it splits the segment into smaller pieces and retries; if all else fails, it keeps the single line as-is—it's better to have one untranslated line than a broken entire article.

## III. Cost-saving mechanism: Translate only what has changed

Each translation file carries two "fingerprints" (hashes): one for the body text and one for fields like titles and summaries:

```toml
source_hash = '…'        # 正文的指纹
source_fields_hash = '…' # 字段的指纹
```

Before translating, the fingerprints are compared:
-  changed ** body text ** → Only re-translate the body; the title and abstract remain as they were.
-  only changed ** abstract or tags ** → Only re-translate those fields; the body costs nothing.
-  nothing changed → zero calls (the scheduled reconciliation every Sunday at midnight performs a full scan like this; if everything is clean, it costs nothing).

Additionally, Cloudflare's AI Gateway has a built-in 7-day cache: for the same request asked a second time, it returns the previous answer directly without charging. Therefore, pushing a fix for a typo often only costs the amount for the part that actually changed.

Real-world numbers: The free plan offers 10,000 neurons per day (Cloudflare's compute unit). Translating a 3,000-word article into one language takes about 50-160 neurons—you won't run out even if you translate over a dozen articles a day.

##  IV. Chinese abstracts are also managed by it

Sometimes after writing an article, you forget to fill in the abstract. The pipeline detects that the Chinese article lacks an `description` and automatically writes a 70-160 word abstract based on the body text, writing it back to the article file. The abstracts for all three languages are translated from this source—** the three-language abstracts will always say the same thing **. Afterward, if you manually edit and save the abstract in the CMS, all three languages will update automatically.

##  V. Humans always have the final say

The direction automation most easily goes astray is "fully automated by machines, with no way for humans to intervene." This pipeline leaves a complete path for human intervention:

-  Check **"Lock Translation"** for a specific translation in the CMS: This translation will henceforth be treated as a human-written draft, never overwritten or deleted, and will no longer sync even if the Chinese original is updated.
-  Check **"Do Not Translate"** for a Chinese article in the CMS: This article will exit the pipeline directly.
-  Proofread machine translations won't be blindly re-translated: As long as the corresponding part of the Chinese original hasn't changed, the fingerprint remains the same, so no money is spent on re-translation.
-  Automatic lifecycle synchronization: If a Chinese article is deleted, the translations are cleaned up accordingly; if a Chinese article is moved to drafts, the translations are taken down accordingly.

##  VI. Pitfalls encountered (if you want to build one too)

A few lessons learned through spending real money (and time):

- ** Proactively adapt to rate limits **. Cloudflare's rate limiting is easier to trigger than what is stated in the documentation; having the client consistently slow down the request rate (one every 2 seconds) is much more hassle-free than handling backoff after the fact.
- **Don't let the AI output the main body in JSON format**. Stuffing Markdown into JSON causes the model to mangle it; the body text must be sent as plain text.
- **When in doubt, err on the side of caution**. If a translation is questionable, don't publish it; keep the old version live and wait for the next attempt—for a static blog, "old" is far less fatal than "broken."
- **Every line of defense must include offline self-testing**. This system's validation logic consists of dozens of assertions; run them with every change for zero API cost.

## VII. This post is a living example.

The Japanese and English versions you see now were automatically translated and deployed within minutes of this recent push. Use the language switcher at the top of the page to compare them—you'll be able to tell at a glance whether the AI's translation sounds natural.
