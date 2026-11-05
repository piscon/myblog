+++
lang = 'en'
title = 'Engineering a Multilingual Static Site Pipeline: From Content Modeling to Build Output'
date = '2026-11-05'
draft = false
source_hash = 'ecbc67b445d90cb1653d60d4fab8073944a87227f370669317e7e13473994112'
source_fields_hash = '9b22d7a6f9598d97322997fb2e900e5622fb15e5fe3ed225b9f4ef20f0fe8842'
description = 'This article systematically outlines the engineering trade-offs of using Hugo for a multilingual static blog, covering content directory design, front matter field modeling, chunking strategies for translation pipelines, structural fidelity verification, and the division of responsibilities between build and runtime.'
categories = ['Technology']
tags = ['Hugo', 'Markdown', 'CI', 'Multilingual']

[cover]
  image = '/images/grass.jpg'
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/zz-tech-long/) for the authoritative version.

## 1. Problem Domain

Maintaining a static blog in three languages simultaneously, the most intuitive approach is to write three versions of each article in Markdown. However, this quickly leads to three problems: ** redundant work **, ** version drift **, ** inconsistent structure **. When the Chinese version changes a link, the Japanese and English versions are often forgotten to be synchronized; if a certain language uses an incorrect heading level, it is only discovered after publication [^1].

>  A more reliable approach from an engineering perspective is to separate "translatable natural language" from "untranslatable machine syntax", allowing the machine to handle only the former, while the latter is assembled by the program.

The pipeline discussed in this article is built on three constraints:

1.  Content must be persisted as regular Markdown, making it easy to review, roll back, and hand over to humans
2.  The translation process must not rewrite URLs, code blocks, list markers, or link targets
3.  If any step fails, the already published content must remain unchanged, and partially damaged pages must not be published

## 2. Content Modeling

### 2.1 Directories and Languages

Hugo's multilingual mode divides directories by `contentDir`, with each article using ** the same named file ** in three directories:
| Language | Directory | File Name | Description |
|---|---|---|---|
| Simplified Chinese | `content/zh/posts` | `article.md` | Unique True Source  |
| Japanese | `content/ja/posts` | `article.md` | Product  |
| English | `content/en/posts` | `article.md` | Output  |

The benefit of the same name is that `translation_list` and `hreflang` can be aligned directly by path, without the need for an additional mapping table. The cost is that ** renaming must be synchronized across three directories **, and the old path is written into the `aliases` field to generate a redirect page.

###  2.2 front matter fields

Fields are divided into two categories. The first category is visible to readers and needs to be translated:

- `title`, `description`
- `categories`, `tags`
- `cover.alt`、`cover.caption`

The second category is machine consumption and must be kept as-is:

- `date`、`draft`、`weight`
- `aliases`、`searchHidden`、`robotsNoIndex`
- `source_hash`、`source_fields_hash`

Incremental translation relies on two hashes: content hash and field hash ** are not interdependent **. Changing the summary only re-translates the fields, and changing the content only re-translates the content. This is particularly important when frequently correcting typos, saving a lot of unnecessary calls.

## 3. Translation pipeline

### 3.1 Protection pass

Markdown is not plain text; it mixes two languages: human-readable prose and machine-readable markup. If the entire text is given to the model, actual tests show the following damage occurs:

```markdown
原文：1. *感谢 [Hugo](https://gohugo.io) 提供代码支持*
损伤：[1. *Hugo](https://gohugo.io)にコードのサポートを感謝します*
```

注意链接数量、标题层级、围栏计数**全部守恒**，因此基于计数的检查会静默放行。修复方式不是继续加提示词，而是让模型根本看不到语法：

```python
def translate(body: str, lang: str) -> str:
     protected, tokens = protect(body)   # «0» «1» …
    raw = model(protected, lang)        # Model only sees prose
    assert all(t.count == 1 for t in tokens)
    return restore(raw, tokens)
```

被保护的原子包括：

| 类型 | 示例 | 处理方式 |
|---|---|---|
| Fence code block | ```` ```python ```` | Whole block replacement, not entering the model  |
| Link target | `](https://…)` | URL and parenthesis protection  |
| Skeleton markup | `## `、`1. `、`\|` | paired protection, must be placed at the beginning/end of the line  |
| Inline code | `` `token` `` | kept as is  |
| Footnotes and checkboxes | `[^1]`、`[x]` | atomized  |

###  3.2 Block and throttling
Long sequence numbering markers are reliably swallowed by the model. The empirical range is: reliable within ** 19 markers, definitely lost beyond ** 64 markers. Therefore, split by line, greedily merge into blocks of about 20 markers, numbering each block starting from 0.

The request layer also needs to be uniformly throttled. The gateway is set to 100 requests / 60 seconds sliding window, but testing shows that 61 requests / minute triggers a continuous 429 error, and only cache hits are allowed through; after disabling this switch, the problem disappears. Therefore, the client still keeps a 2-second interval (peak 30 requests / minute), leaving sufficient margin for the upstream.

### 3.3 Integrity Gate and Degradation

Post-translation check three things:

- [x] Each marker appears exactly once
- [x] Skeleton markers are still at the beginning or end of the line
- [x] The structure count is conserved after restoration

Any failure triggers a retry; if there are continuous failures, the block is split into two and re-translated ** and **, and only split at boundaries where each half can be independently restored, avoiding splitting fences or tables. Normal path has zero additional overhead, while the failure path incurs a few more calls to gain success rate.

### 3.4 Failure Semantics

The pipeline deliberately defines failure conservatively: ** do not write new files, keep the old translation in place **. This is not contradictory to the common "partial success is submitted" — successful parts are written normally, and failed languages retain the previous version. Online readers may see slightly outdated translations, not pages with damaged structures.

Three typical failure paths:

1.  Model output is `max_tokens` truncated → retry with increased budget
2.  Integrity gate blocks → retry the entire block, if still fails, split into two
3.  Upstream returns 429/5xx → exponential backoff or wait until the throttling window is full

The second type is most worth elaborating. Suppose a block contains twenty markers, and the model swallows a pair of `**`; the gate will report "missing 2". When retrying, remind the model to retain the markers. If it still fails, split the block into two halves by line and call separately. Each half has about ten markers, significantly reducing the probability of losing atoms. In testing, a typical degradation is 21 lines split into 1 line + 20 lines, and both halves pass afterwards.

### 3.5 About Cache
Gateway provides 7-day response caching: replaying the same prompt does not consume neuron, nor forward to upstream. This is especially useful for rerunning ** runs ** — after a run fails, subsequent requests for already successful chunks will directly hit the cache, and only the failed chunks are billed again.

However, caching can also lead to a common misjudgment: when the upstream or gateway enters a rate-limiting state, only requests that hit the cache return 200, while others return 429. If you only see "successful logs" and assume the quota is normal, you will draw a completely wrong conclusion. To determine if the quota is healthy, you must check the response codes of ** non-cached requests **.

A related detail is that the cache key is determined by the complete request body, so changing the prompt version will invalidate all historical caches. This is why the cost of the next full re-translation after upgrading the prompt will be significantly higher, which is an expected behavior, not a failure.

###  3.6 Field calls and body calls

These two types of calls have different structures and should not be confused:

| Dimension | Field call | Body call  |
|---|---|---|
| Input | Short texts such as title, summary, tags | The body after chunking  |
| Output constraints | JSON Schema strict constraint | Plain text  |
| Common failures | Model refuses schema | Token loss, truncation  |
| Retry strategy | Downgrade to plain parsing | Binary downgrade  |

After using `response_format: json_schema`, format errors will be blocked at the API level, almost no additional structure checks are needed. However, some models do not stably support this parameter, and when the script reports "JSON Mode couldn't be met", it will automatically downgrade to normal JSON parsing, and remember this language in this session and no longer attempt schema. The main text is the opposite: Markdown inserted into JSON will cause the model to disperse link syntax, so it must go through plain text.

##  4. Validation strategy

Offline self-testing does not consume any API calls, covering four types of assertions:

1.  Full corpus identity round trip: protection and restoration are inverse
2.  Segment identity round trip: chunking does not change the blank line structure
3.  Old accident equivalence attack: the door must block when markers are deleted, duplicated, shifted, or out of bounds
4.  Rate budget: the number of calls and peak rate upper bound for two medium-length articles
The rendering layer also needs to compare the counts of three-language HTML `table`, `tr`, `td`, `ol`, `ul`, `li`, `pre`, `code`, `del`, `sup`, `input` to ensure the structure is completely consistent. Compilation success only proves that the file can be built, which does not mean the page is correct.

###  4.1 Build-time Validation

Before writing the translation back to git, CI will first run `hugo --gc --minify`. The purpose of this step is not to check the translation quality, but to intercept ** broken front matter **: missing a quote in TOML, mismatched array brackets, will cause the entire site to fail to build. Putting this gate before submission can avoid writing broken deployment content into the repository.

An easy-to-overlook point is `aliases`. In multi-language mode, old paths should not have a language prefix; Hugo will automatically place them according to the language. Manually adding a prefix will instead generate incorrect redirect pages. Similar agreements are better placed in offline assertions, so that scripts can check them every time instead of relying on people to read the documentation.

###  4.2 Coupling Points for Theme Upgrades

The theme is introduced as a submodule, and there are weekly updates from the upstream. The site layer only overrides a small number of necessary templates, and other functions are expressed as much as possible through front matter fields and extension points. The more that is overridden, the higher the probability of conflicts when merging PRs each week.

Therefore, a coupling point list is needed: which selectors, which hooks, which partial names are relied upon by the site layer. Run assertions before and after each upgrade. If it fails, directly provide a DOM snapshot to help locate which upstream change hit the assumption. This list is essentially a ** executable interface contract **, which is much more reliable than comments.

##  5. Responsibility Boundaries
| Layer | Responsibilities | What Should Not Be Done  |
|---|---|---|
| Content Management | Input Regular Markdown | No Business Logic Carried  |
| Site Template | Rendering and Extension Points | Do Not Modify the Original Upstream Theme  |
| Translation script | Structural fidelity | No judgment of translation quality  |
| CI | Trigger and write back | No polling of running status  |

Place the functional logic in the ** stable and fully expressive ** layer, which is the most reusable principle in this design. The theme is updated weekly, and the more templates are covered, the more frequent the merge conflicts; therefore, use front matter fields instead of overriding templates.

## 6. Summary

-  Reliability comes from "the model cannot access the syntax," not "the model obeys"
-  Old content is retained when failure occurs, never allowing damaged pages to appear online
-  Keep prompts extremely simple, moving all complex rules down to the program
-  Each structural change must have an offline assertion as a backup

---

[^1]: The situation of "discovering after release" is especially troublesome on static sites: there is no server to roll back immediately, only to rebuild and redeploy once.
** Further Reading **: [Hugo 多语言文档](https://gohugo.io/content-management/multilingual/), [Goldmark 语法说明](https://github.com/yuin/goldmark), [项目仓库](https://github.com/piscon/myblog).
