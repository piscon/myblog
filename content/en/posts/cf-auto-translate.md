+++
lang = 'en'
title = 'Building an Automatic Translation Pipeline for My Blog with Cloudflare Workers AI'
date = '2026-11-05'
draft = false
source_hash = 'ab9a2bc82cc11976d9fd18aaa3ad93a3ab1483da2a28b2d1c9f6d530632be4ea'
description = 'This article details how to create a fully automated translation pipeline using GitHub Actions and Cloudflare Workers AI, covering challenges like preserving Markdown links, incremental translation with source_hash, and protecting manual translations.'
categories = ['Technology']
tags = ['AI', 'Cloudflare', 'Hugo']
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/cf-auto-translate/) for the authoritative version.

This blog is multilingual (Simplified Chinese / Japanese / English). Previously, each language version was written manually, but as the number of articles increased, it became unsustainable. So I built an automated translation pipeline: after writing the Chinese version and pushing it, the Japanese and English versions are automatically generated and deployed within minutes.

## Overall Architecture

```
Push Chinese article
  → GitHub Actions (translate-content)
    → Call Cloudflare Workers AI for translation
      → Write translated text back to git
        → Netlify automatically builds and deploys
```

Key decisions:

- **Translate content into git**, not generating it temporarily during Netlify builds. This allows translations to be reviewed, rolled back, and manually corrected. Netlify builds remain pure (always receiving finished Markdown)
- **Use Cloudflare Workers AI's free quota** (10,000 neurons per day), which is far more than sufficient for a personal blog's translation needs
- **Visitor side remains completely static**: API keys only exist in GitHub Actions, with zero secrets on the frontend, no additional requests, and no third-party scripts

## Model Selection

The free plan of Workers AI has a model whitelist - not all models can be used. Tested several options:

- GLM, DeepSeek series: Not available in free plan (403 error), immediately eliminated
- `llama-3.3-70b`: Works, but pure text translation will **miss entire sentences** (leaves some Chinese original text in a paragraph), not used
- `qwen3-30b-a3b-fp8`: Best quality for Chinese→Japanese, ultimately selected

## Biggest Pitfall: Don't put Markdown inside JSON

First version tried to save time by packaging title, summary, and content into a single JSON for model translation. The result was all fields normal, but link syntax in the content was broken:

```
Original file format:      [Hugo](https://gohugo.io)
JSON mode output:          Hugo (https://gohugo.io)          ← Link broken, becomes plain text
Plain text mode output:    [Hugo](https://gohugo.io)          ← Syntax preserved as original
```

Testing showed both qwen3 and llama have this issue - not a model-specific problem, but the format of "Markdown embedded in JSON string" is inherently unfriendly to models due to excessive escaping.

Switched to a **two-step approach**: fields (title/summary/categories/tags) are short texts, suitable for small JSON calls; content is processed separately through plain text calls. After this change, links, lists, and code blocks are all preserved as original.

## Incremental: source_hash

Can't re-translate all articles on every push - it would waste quotas and worse, overwrite manually corrected translations. So each translated file's front matter stores a `source_hash`:

```toml
lang = 'ja'
title = '（Translated title）'
date = '2025-11-26'
lastmod = '2026-11-05'
draft = false
source_hash = '4bae5986e7a0…'  # sha256 of Chinese source content, combined with prompt version number and model name
```

Rules:

- Same hash → skip, **0 API calls**
- Chinese original changed → hash mismatch → auto-retranslate
- Model changed → model name in hash changes → full retranslation

## Human Protection Rules

- Translated files without `source_hash` = manually written by humans, script **never touches** (neither overwrites nor deletes)
- Machine-translated files that have been manually corrected won't be overwritten if Chinese original remains unchanged
- To prevent a single article from being translated: add `auto_translate = false` in Chinese front matter
- Chinese source becomes draft → translated version is automatically taken offline; Chinese source deleted → translated files are automatically cleaned up

Machine-translated files have a blockquote at the beginning declaring the original source link, informing readers to refer to the Chinese original.

## This article is the first real test of the pipeline

The Chinese version you're reading is written by me; Japanese and English versions are automatically generated and deployed by the pipeline after this push. If you can read the three language versions in the header switcher, it means the entire workflow is successfully closed.
