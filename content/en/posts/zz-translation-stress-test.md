+++
lang = 'en'
title = 'Structural Fidelity in Large Model Translation Pipelines: An Empirical Study Based on Placeholder Atomization'
date = '2026-11-05'
draft = true
source_hash = 'c47a9ea58fdbd6b1b40d5dd479f5fe86eab0ee86f48e7ea3867f50ba2b8d105e'
source_fields_hash = '0d913653f167e342ac45592ac0b90689375dc0ab76ee7c62b29ddb1b474e8e93'
description = 'This paper studies the failure modes of large language models when translating technical documents with complex Markdown structures, using a three-language translation pipeline for static blogs, and proposes a protective architecture centered on placeholder atomization, verifying its structural fidelity through offline self-testing and real corpus validation.'
categories = ['Research']
tags = ['AI', 'Markdown', 'Translation', 'Structural Fidelity']

[cover]
  image = '/images/grass.jpg'
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/zz-translation-stress-test/) for the authoritative version.

##  Abstract

Large language models have approached the practical threshold in ** machine translation ** tasks, but when the input is a Markdown technical document, the failure mode shifts from "poor translation" to "structure destruction": link targets are rewritten, list markers are absorbed into anchor texts, and code blocks are swallowed. Such damage does not trigger syntax errors, yet it causes silent distortion of the page. This paper formalizes this issue as a ** character space conflict ** problem: the translation space of natural language and the markup space of machine syntax share the same character stream, and the model cannot reliably distinguish between them[^1].

##  1. Research Background

>  A fundamental conclusion in reliability engineering is: we should not require components to "not make a certain type of error," but rather ensure that they have ** no opportunity ** to make that type of error. — quoted from the post-mortem analysis of the * Co-op Translator * production incident

Early solutions relied on prompt constraints, with typical rules as follows:

-  "Keep the Markdown structure unchanged"
-  "Only translate link text, keep URLs as they are"
-  "List markers can only appear at the beginning of a line"
Test results show that these constraints ** are unreliable **: the model will consistently generate `[1. *Hugo](https://gohugo.io)に…` on `1. *感谢 [Hugo](https://gohugo.io) 提供代码支持*` type combinations, that is, swallowing the ordered list markers and italics asterisks as a whole into the link text. Notably, the number of links, heading levels, and fence counts are all conserved, so QA gates based on counts will ** silently pass **. Earlier, this conclusion was stated as "pure prompts are sufficient," but it has now been ~~ refuted ~~ and revised[^2].

![结构分区示意](/images/grass.jpg)

## 2. Method: Placeholder Atomicization

The core idea is to divide the document into two types of regions:

| Region Type 型 | Example 例 | Processing Method 式 | Entered into the model |
|---|---|---|---|
| Machine Language 法 | URL part of `[text](url)` 分 | Atomic substitution 换 | No |
| Skeleton Tags 记 | `1. `, `## `, `\|` | Pair preservation 护 | No |
| Natural Language 言 | Body paragraphs, link text 字 | Preservation 留 | Yes |
| Code block | All content within the fence | Entire block replaced | No |

See the pseudocode below (inline `protectBody()` and `restoreBody()` form a loop):

```python
def translate(body: str, lang: str) -> str:
    """保护 → 翻译 → 完整性门 → 还原"""
    protected, tokens = protect(body)   # «0» «1» …
    raw = model(protected, lang)        # 模型只见散文
    assert all(t.count == 1 for t in tokens)  # 完整性门
    assert skeleton_at_edges(raw)             # 位置门
    return restore(raw, tokens)               # 机械拼装
```
Integrity gate checks three things: each token ** appears exactly once **, the skeleton `lead`/`tail` must be aligned to the start/end of line, and the structure count is conserved after restoration. Any failure triggers a retry, and if still failed, the article is not written to disk, and the old translation is kept in place.

## 3. Experimental Setup

Validation is done in two layers, and the second layer does not rely on external services:

- [x]  Offline self-test: Full corpus identity round trip + old bug equivalence attack interception
- [x]  Structure count fuse: Link, title, fence, list item count conservation
- [ ]  Real model long document stress test (this article is the input for this layer)
- [ ]  Cross-language rendering consistency comparison

Among them, "old bug equivalence attack" refers to manually constructed damage and verifying that the gate can block it:

1. `lead` Markers are moved into the middle of sentences
2.  Closing asterisks are moved into the middle of lines
3.  Tokens are deleted, duplicated, or have out-of-bound numbers
   -  Deletion and duplication trigger the integrity gate
   -  Out-of-bound number forging is directly rejected

## 4. Discussion

### 4.1 Why not use dual-channel mutual verification
两次独立调用能降低随机损伤，但对**系统性错误**无效：同一模型面对同一组合结构会稳定地犯同一个错，比对结果一致、照样放行。这与「**稳定性大于省 token**」的约束并不矛盾——瓶颈是架构而非预算。

### 4.2 Boundary Conditions

正文若含字面量 `«1»`（书名号、法文引号或随手输入），会被 token 正则误认成占位符，导致越界与永久失败。修法是把 `«n»` 字面量与孤立 `«`/`»` **一并原子化**，使模型输入中唯一的 `«n»` 都是真编号。这提示一个更一般的原则：占位符字符集必须与自然语言字符集**完全隔离**，或由保护 pass 保证其唯一性，而不能仅靠「选个罕见字符」的赌注。

### 4.3 Relationship with Content Management System

The input boundary (CMS rich text editor) only needs to output plain Markdown; the protection layer is located inside the pipeline, without adding new front matter fields or modifying the schema. Historically, CMS has maintained structural fidelity for `*斜体* [链接](url)`, so no adjustments are needed on the input side.

## 5. Conclusion
Move reliability from "whether the model obeys" to "the model cannot access grammar at all", which can disperse the link and swallow the mark into two types of incidents from ** probability events ** to ** architecture impossible events **. The cost is protecting pass about a hundred lines of code and a full re-translation (prompt version mismatch); the benefit is that the prompt can be extremely simple, and when it fails, the old content is retained in place, and damaged pages never appear online.

---

[^1]:  The formalization here refers to the idea of "separating lexical analysis and syntax analysis" in compiler principles: first separate the untranslatable morphemes from the stream, then transform the remaining token sequence, and finally assemble them in the original position. See the implementation in `scripts/translate.mjs` of `protectBody()`.
[^2]: "Overturn" refers to the conclusion itself, not the experimental data; the original data still supports the judgment of "counting gate failure for combined structures".

**Acknowledgments**: The failure samples in this article come from the real accident records of `first.md` and `cf-auto-translate.md`; the experimental environment is Hugo + PaperMod + Cloudflare Workers AI (model `@cf/qwen/qwen3-30b-a3b-fp8`). More details can be found in [project repository](https://github.com/piscon/myblog) and [Workers AI documentation](https://developers.cloudflare.com/workers-ai/).
