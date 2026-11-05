+++
lang = 'en'
title = 'Automate Blog Translation Pipeline with Cloudflare Workers AI'
date = '2026-11-05'
draft = false
source_hash = '5b09db79430abfb8cbcf134c109e450623104455c390519bbb8dc5bef6634762'
source_fields_hash = 'c1b3b3cb2793487ece0c966fe0f5e1ee56e9e7e3825edbe6eb768fbe8a2b5350'
description = 'Write in Chinese and push it up, and Japanese and English versions are automatically generated and deployed within minutes: This article fully introduces the architecture of this translation pipeline — free quotas of Workers AI, AI Gateway monitoring and caching, dual hash increment, structural QA gate, automatic SEO summary writing, and the switch to take over manual translations in CMS.'
categories = ['Technology']
tags = ['AI', 'Cloudflare', 'Hugo']
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/cf-auto-translate/) for the authoritative version.

This blog is multilingual (Simplified Chinese / Japanese / English). After writing the Chinese article and pushing it, the Japanese and English versions are automatically generated and deployed within minutes — this article fully introduces the final form of this pipeline.

## Overall Architecture

```
Write Chinese article and push
  → GitHub Actions (translate-content)
    → Call Cloudflare Workers AI via AI Gateway
    → Output is validated by Hugo (prevent bad front matter from being deployed)
    → Bot commits back to git
      → Netlify automatically deploys, and the Japanese/English versions go live
```

Four design principles:

- **Output goes into git**: Translations are reviewable, rollbackable, and can be manually taken over; Netlify always gets the final Markdown file
- **Completely static on the visitor side**: API credentials exist only in GitHub Actions; no keys on the front end, no additional requests, no third-party scripts
- **All requests go through AI Gateway**: Each request's token, dollar cost, and time are logged; re-running the same content hits the cache, with zero cost
- **Partial failure does not affect the whole**: A failed translation in one language does not affect the deployment of another language

## Model and Calling Method

The model used is `@cf/qwen/qwen3-30b-a3b-fp8` (available on the free plan, with MoE architecture activated parameters at only 3B, and the lowest billing tier), and the thinking mode is turned off — translation tasks do not require reasoning, saving quotas and being more stable.

Each translation is split into two calls:

| Call | Content | Output Constraints |
|---|---|---|
| Fields | Title / Summary / Category / Tags / Cover Text | Strong JSON Schema constraints, invalid format is directly blocked by the API |
| Main Text | Full Markdown | Pure text output, maintaining Markdown structure |

The main text translation has a **structural QA gate**: comparing the number of inline links, headings, and code blocks between the translated and original text. If the translation is shortened, it is automatically repaired by restoring broken links to `[text](URL)` format based on the original URL list. If it fails to repair, it is re-translated. Combined with output truncation guard (auto-retry with added budget when reaching max_tokens limit), 180-second timeout, and 429/5xx exponential backoff, the failure rate of a single run is very low.

## Incremental: Dual Hash

Each translated file's front matter includes two markers:

```toml
source_hash = '…'        # sha256 of the main text (combined with prompt version number and model name)
source_fields_hash = '…' # sha256 of the fields set
```

- If the **main text** of the Chinese version changes → only the main text is re-translated, and the fields use the original translation
- If only the **summary/tags** are changed → only the fields are re-translated, and the main text is not affected
- If the model is changed or the prompt is upgraded → the version number changes → a full re-translation is done
- If nothing changes → 0 API calls (the weekly scheduled reconciliation at 03:17 on Sundays scans everything to ensure completeness)

## SEO summary is also managed by it

It doesn't matter if the Chinese article doesn't have a summary (left blank in CMS): the pipeline will generate a 70-160 character summary and write it back to the front matter. The three-language fields are translated based on it — **the Chinese, Japanese, and English summaries are always from the same source**. After that, if you modify and save the summary in the CMS, the three languages will automatically follow.

## Humans always have a vote

- In the CMS, check **"Lock Translation"** for the translation entry → this translation is considered a manually written article: it will never be overwritten or deleted, and updates to the Chinese original will no longer be synchronized
- In the CMS, check **"Do Not Translate"** for the Chinese entry → this article exits the pipeline
- Machine-translated content that has been proofread will not be re-translated as long as the corresponding part of the Chinese source remains unchanged (saving in the CMS does not break the hash markers)
- Synchronization of the lifecycle: when the Chinese article is deleted, the translation is automatically cleaned up; when the Chinese article is moved to draft, the translation is automatically taken offline

## Cost

The free plan provides 10,000 neurons per day. Testing shows that a full three-language translation of an article takes about 100 neurons; changing only the summary takes about 5 neurons. Daily incremental usage is far below the limit. In the AI Gateway logs, each request's token, dollar cost, and time can be directly queried.

## This article is the product of the pipeline

The Chinese version was written by me, and the Japanese and English versions were automatically generated and deployed within minutes after this push. You can see the three-language versions using the language switcher at the top of the page.
