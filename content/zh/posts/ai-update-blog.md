+++
lang = 'zh'
title = '如何使用 AI 来更新博客'
date = '2026-11-01'
draft = false
description = '不用手动写 Markdown 和提交，只要把 GitHub 连上 AI，用自然语言说明想写什么，AI 就会读仓库、生成文章并提交。'
categories = ['技术']
tags = ['AI', 'Hugo', '博客']

[cover]
  image = '/images/ai-writing.jpg?v=1'
  alt = 'AI 协作写作'
  caption = 'AI 协作写作'
+++
不用打开编辑器手动写 Markdown，再自己 git commit。

只要把 GitHub 连上 AI，用自然语言说明想写的内容，AI 就会自动读仓库、生成文章、并提交。

这篇文章就是用这个流程写的。

## 准备

1. 有一个 GitHub 仓库（例如 `myblog`）
2. 在 AI 对话界面里连上 GitHub 账号
3. 确认 AI 有读写仓库的权限

## 实际流程

### 1. 先让 AI 读仓库
直接说：

> 你能读取 github 的 myblog 仓库吗？

AI 会自动：
- 确认你的 GitHub 账号
- 找到仓库
- 列出文件结构
- 读取 `hugo.toml` 和现有文章

### 2. 告诉 AI 想写什么
例如：

> 帮我写第二篇文章。主题：如何使用 AI 来更新博客，思路就按照你现在的工作流来写就行了。简单易懂，三语版本

### 3. AI 生成并提交
AI 会按仓库结构创建：
- `content/zh/posts/...`
- `content/ja/posts/...`
- `content/en/posts/...`

然后一次性提交到 `master` 分支。

提交后，Netlify 等 CI 会自动构建并部署。

## 提示

- 用自然语言说明，结果越接近你的风格
- 可以指定三语、封面图、日期等
- 修改现有文章也是同样：先让 AI 读，再说明改法
- 想先看内容再提交，直接说就行

## 总结

连上 GitHub → 用自然语言指令 → AI 读仓库 + 写文章 + 提交。

你负责想内容，AI 负责落地。
