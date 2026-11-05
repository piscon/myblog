+++
lang = 'zh'
title = '用 Cloudflare Workers AI 给博客搭自动翻译流水线'
date = '2026-11-05'
draft = false
description = '写一篇中文，日文英文版全自动：本文记录如何用 GitHub Actions 和 Cloudflare Workers AI 免费额度搭一条增量翻译流水线——包括「Markdown 塞进 JSON 会被打散链接」这个坑、source_hash 增量机制、人工译文保护规则，以及这篇文章自己的日/英文版就是流水线自动生成的。'
categories = ['技术']
tags = ['AI', 'Cloudflare', 'Hugo']
+++
这个博客是三语的（简体中文 / 日本語 / English），之前每个语言版本都靠手写，文章一多必然跟不上。于是搭了一条自动翻译流水线：写完中文 push 上去，日文和英文版几分钟内自动生成、自动部署上线。

## 整体架构

```
push 中文文章
  → GitHub Actions（translate-content）
    → 调 Cloudflare Workers AI 翻译
      → 译文写回 git
        → Netlify 自动构建部署
```

几个关键决定：

- **翻译产物进 git**，而不是在 Netlify 构建时临时生成。译文可以被审阅、回滚、人工修正，Netlify 构建保持纯粹（拿到的永远是成品 Markdown）
- **用 Cloudflare Workers AI 的免费额度**（每天 10,000 neurons），个人博客的翻译量远远用不完
- **访客侧完全静态**：API key 只在 GitHub Actions 里，前端零密钥、零额外请求，不引任何第三方脚本

## 模型选择

Workers AI 免费计划有模型白名单，不是所有模型都能跑。实测了几家：

- GLM、DeepSeek 系列：免费计划不可用（403），直接出局
- `llama-3.3-70b`：能用，但纯文本翻译会**漏译整句**（一段里留几句中文原文），不敢用
- `qwen3-30b-a3b-fp8`：中→日质量最好，最终选它

## 最大的坑：Markdown 别塞进 JSON

第一版图省事，把标题、摘要、正文打包成一个 JSON 让模型翻译后原样返回。结果字段全部正常，正文里的链接语法却被打散了：

```
源文件写法：      [Hugo](https://gohugo.io)
JSON 模式产出：   Hugo（https://gohugo.io）          ← 链接死了，变成纯文字
纯文本模式产出：  [Hugo](https://gohugo.io)          ← 语法原样保留
```

实测 qwen3 和 llama 都有这个问题——不是某个模型的毛病，是「Markdown 嵌在 JSON 字符串里」这个形态本身对模型不友好，转义层级太多。

改成**两段式调用**：字段（标题/摘要/分类/标签）是短文本，走小 JSON 调用没问题；正文单独走一次纯文本调用。之后链接、列表、代码块全部原样保留。

## 增量：source_hash

不能每次 push 都把所有文章重译一遍——费额度，更严重的是会覆盖人工校对过的译文。所以每个译文文件的 front matter 里存一个 `source_hash`：

```toml
lang = 'ja'
title = '（翻译后的标题）'
date = '2025-11-26'
draft = false
source_hash = '4bae5986e7a0…'  # 中文源内容的 sha256，混入提示词版本号和模型名
```

规则：

- hash 一致 → 跳过，**0 次 API 调用**
- 中文原文变了 → hash 对不上 → 自动重译
- 换模型 → hash 里的模型名变了 → 全量重译一遍

## 人工保护规则

- 没有 `source_hash` 的译文 = 人工手写的，脚本**永远不碰**（既不覆盖也不删除）
- 机翻文件人工校对后，只要中文原文不动，就不会被重译覆盖
- 单篇文章不想被翻译：中文 front matter 加 `auto_translate = false`
- 中文源转草稿 → 译文同步下架；中文源删除 → 译文文件自动清理

机翻文件文首有一行引用块声明，附原文链接，告知读者以中文原文为准。

## 这篇文章就是流水线的第一次实战

你正在读的中文版是我写的；日文版和英文版，是这篇 push 之后由流水线自动生成、自动部署的。如果你能在页头切换器里读到这里的三语版本，说明整条链路闭环成功。
