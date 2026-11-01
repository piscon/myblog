+++
lang = 'zh'
title = '如何使用 AI 来更新博客'
date = '2026-11-01'
draft = false
cover.image = '/images/logo.jpg'
cover.caption = 'AI 协作写作'
cover.alt = 'AI 协作写作'
+++
你不需要自己打开编辑器、手动写 Markdown、再 git commit。

只要把 GitHub 连上 AI，用自然语言说明想要写什么，AI 就能直接读仓库、生成文章、提交代码。

这篇文章就是用这个流程写出来的。

## 准备工作

1. 有一个 GitHub 仓库（比如你的 `myblog`）
2. 在 AI 对话界面里连接 GitHub 账号
3. 确认 AI 有权限读写这个仓库

## 实际操作流程

### 1. 让 AI 先读取仓库
直接说：

> 你可以读取 github myblog 仓库吗

AI 会自动：
- 确认你的 GitHub 账号
- 找到仓库
- 列出文件结构
- 读取 `hugo.toml`、已有文章等关键文件

### 2. 告诉 AI 你要写什么
例如：

> 帮我写第二篇文章。主题：如何使用 AI 来更新博客，思路就按照你现在的工作流来写。简单易懂，三语版本

### 3. AI 生成并提交
AI 会按你的仓库结构，分别写出：
- `content/zh/posts/...
- `content/ja/posts/...
- `content/en/posts/...

然后一次性提交到 `master` 分支。

提交后，Netlify 或其他 CI 会自动构建并部署。

## 小提示

- 语言越自然，生成的文章越贴近你想要的风格
- 可以要求三语、带封面图、指定日期等
- 如果要改已有文章，也是同样流程：先让 AI 读，再说明改什么
- 提交前可以先让 AI 把内容发给你确认

## 总结

连上 GitHub → 用自然语言下指令 → AI 读仓库 + 写文章 + 提交。

你负责想内容，AI 负责落地。
