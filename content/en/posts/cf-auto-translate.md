+++
lang = 'en'
title = 'Automate Blog Translation with Cloudflare Workers AI'
date = '2026-11-05'
draft = false
source_hash = 'f6cf7bdbfb9b8ae9c4f5210ffae97dca26a99cd8aeb26a4a11ba427d29e56adc'
source_fields_hash = '75278e1f44211bad472181ee549f70ec6a40d96fda0468406ef11c9f939d1444'
description = 'Write in Chinese and push it up, and Japanese and English versions are automatically generated and deployed within minutes. This article explains clearly how this pipeline works: why we need to split Markdown before feeding it to AI, how to make fixing a typo cost only one API call, and who is responsible when AI translation goes wrong.'
categories = ['Technology']
tags = ['AI', 'Cloudflare', 'Hugo']
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/cf-auto-translate/) for the authoritative version.

This blog is multilingual (Simplified Chinese / Japanese / English). After I finish writing the Chinese version and push it, the Japanese and English versions are automatically generated and deployed within minutes — there is no manual translation involved in between. This article explains in plain language how it works, and the pitfalls encountered along the way.

##  I. What does the whole system look like?

The entire pipeline runs on GitHub Actions, using all free resources:

```
写完中文文章 push
  → GitHub Actions 触发翻译
    → 调 Cloudflare Workers AI（免费额度）
    → 译文先过几道自动检查
    → 检查通过，机器人提交回仓库
      → Netlify 自动部署，日/英文版上线
```

Before starting, I set four rules, which later proved to be crucial:

- ** Translation enters git**. The Japanese and English versions are real files in the repository, which can be opened, edited, and rolled back at any time. AI is only the "first draft author," not the publishing channel.
- ** The visitor side is completely static**. API keys exist only within GitHub Actions, there are zero keys on the web page, and no third-party scripts. Readers do not consume extra electricity because of me.
- ** Each call has a bill**. All requests go through the AI Gateway, and each one records how many tokens were used, how much it cost, and how long it took.
- ** Partial failures do not bring down the whole system**. If the Japanese translation succeeds but the English translation fails, then the Japanese version is published first, while the English version remains with the old version waiting for a retry.

##  II. Core Problem: AI will mess up Markdown

Translating plain text with AI already works well. However, blog posts are not plain text — they contain links, code blocks, tables, and list markers. In the early stages, I directly fed the entire Markdown to the model, and the translated results often "looked correct" but were actually broken. Real case example:

```
原文：1. *感谢 [Hugo](https://gohugo.io) 提供代码支持*
翻后：[1. *Hugo](https://gohugo.io)に…（列表标记和星号被吞进了链接文字）
```
The worst part is that such damage ** won't cause any error ** — the link remains the same, the page still renders normally, and it's almost impossible to spot without careful checking. Just writing "please keep the format" in the prompt doesn't work, as tested: the model can see the grammar, and it can't help but mess with the grammar.

The final solution was straightforward: ** prevent the AI from seeing the grammar **.

Before translation, the program first "splits" the article: code blocks, link addresses, inline code, various markup symbols, all replaced with placeholder numbers like «0» «1». What the AI sees is only pure Chinese sentences plus a few numbers; it can't mess with the grammar. After translation, the program restores the placeholders as they were.

The splitting uses a Markdown parser (remark) that locates based on the syntax tree, rather than using regular expressions for hard matching — the parser recognizes all standard syntax, and there's no need to patch when new syntax appears. After translation, there are several automatic checks:

1. ** Check on the integrity of the numbers **: each placeholder must return exactly once; if any are missing, extra, or duplicated, it's considered a failure.
2. ** Position check **: list markers must still be at the beginning of the line, closing symbols must still be at the end of the line.
3. ** Structural comparison **: the number of links, headings, and tables in the translated text must match the original.

If the check fails, it automatically retries; if still not working, it splits the section into smaller parts and translates again; if still not working, it leaves that line as is — better to have one line untranslated than the whole text being corrupted.

##  3. Cost-saving mechanism: translate only what needs to be changed

Each translation file has two "fingerprints" (hash): one corresponds to the main text, and the other corresponds to fields such as title and summary:

```toml
source_hash = '…'        # 正文的指纹
source_fields_hash = '…' # 字段的指纹
```

Before translation, the fingerprints are compared:
-  changed ** main text ** → only re-translate the main text, title and abstract use the old ones
-  only changed ** abstract or tags ** → only re-translate the field, no cost for the main text
-  nothing changed → zero calls (this is how the scheduled reconciliation every Sunday morning works, doing a full scan, costing nothing when clean)

Additionally, Cloudflare's AI Gateway has a built-in 7-day cache: the same request the second time, it directly returns the previous answer, without billing. So, pushing up a typo correction often only costs for the part that actually changed.

Test data: Free plan provides 10,000 neurons per day (Cloudflare's computing unit), translating a 3,000-word article into one language takes about 50-160 neurons — translating a dozen articles a day would not use them all up.

##  4. Chinese abstract is also managed by it

Sometimes after writing an article, the abstract is forgotten. If the pipeline finds a Chinese article without `description`, it automatically writes a 70-160 word abstract based on the main text and writes it back to the article file. All three language abstracts are translated from this source — ** the three-language abstracts always talk about the same thing **. After that, when you manually edit and save the abstract in the CMS, the three languages are automatically updated.

##  5. Humans always have a vote

The easiest direction for automation to go off track is "fully automatic machine, no human intervention possible." This pipeline leaves a complete handover path for humans:

-  In the CMS, check **"Lock Translation"** for a certain translation: this translation is henceforth treated as a manually written article, never overwritten, never deleted, and no longer synchronized with the Chinese original text
-  In the CMS, check **"Do Not Translate"** for a Chinese article: this article directly exits the pipeline
-  Proofread machine translation will not be blindly re-translated: as long as the corresponding part of the Chinese original text is not changed, the fingerprint remains the same, and there is no cost for re-translation
-  Lifecycle is automatically synchronized: when the Chinese article is deleted, the translation is cleaned up as well; when the Chinese article is converted to a draft, the translation is also taken offline

##  6. Pits we've fallen into (if you also want to set up one)

Some lessons learned through real money (and time):

- ** Proactively adapt to rate limits **. Cloudflare's rate limiting is easier to trigger than what is stated in the documentation. It is much more efficient to have the client deliberately slow down the request speed (one every 2 seconds) than to back off after the fact.
- **Do not let AI output the main text in JSON format**. Markdown put into JSON will be disassembled by the model, the main text must be plain text
- **When failing, better to be conservative**. If the translation is questionable, do not publish it, keep the old version, wait for the next retry - the "old" in a static blog is not as fatal as "bad"
- **Each defense line must have an offline self-test**. This system has dozens of assertion checks, run them each time there is a change, with zero API consumption

## 7. This is the living example

The Japanese and English versions you are seeing now were automatically translated and deployed within minutes after this push. Switch to the language switcher at the top of the page to compare - whether the AI translation is natural or not, it's immediately obvious.
