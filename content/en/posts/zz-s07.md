+++
lang = 'en'
title = 'How a Single Comment in a Config File Saved a Production Deployment'
date = '2026-11-05'
draft = false
source_hash = 'ffd41420ed029548da2506fb9f864cdeee2694861859d611337f54e8490e8e3f'
source_fields_hash = '4b540e61d57ad09cefca60d510421c12f369de34069209e5981f097f33ebcf4e'
description = "A typo in the Netlify branch name caused all 'Edit this post on GitHub' links to return 404 errors. This post explores why all CI builds and tests passed despite the broken links."
categories = ['Tech']
tags = ['Netlify', 'Post-mortem']

[cover]
  image = '/images/grass.jpg'
  alt = 'A snippet of a configuration file'
  caption = 'Only one line was wrong'
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/zz-s07/) for the authoritative version.

##  1. All green, but the links are dead

On the third day after launch, I happened to click on **"Improve this post on GitHub"** at the bottom of an article page, and it led to a 404. I checked two other articles out of curiosity; they were the same.

The strange thing is:

| Check 查 | Result |
|---|---|
| Local `hugo --gc --minify` | ✅ |
| CI build-check | ✅ |
| feature-check 26 项 | ✅ |
| Netlify deploy date 志 | ✅ All green |
| That lin接 | **404** |

>  All automated checks were verifying "whether the page can be generated," but none were verifying "whether the generated URL is correct."

##  2. A single line of main

The site-level `editPost` configuration looks like this (simplified):

```toml
[params.editPost]
  URL = "https://github.com/piscon/myblog/blob/master"
  appendFilePath = true
```

In the broken version, that `master` was written as **`main`**. The repository's default branch has always been `master`, so `blob/main/...` naturally does not exist on GitHub.

** The error was a string of characters, not a logic error. ** Hugo does not validate this URL; the template is only responsible for concatenating strings, so the build naturally comes up all green.

- [x]  The concatenated path format is correct
- [x]  The file exists
- [ ] **No one verified the branch name **
- [ ] And no one clicked the production link

*When writing the configuration, I probably just typed the more common term out of habit. *

## III. Why it wasn't caught during testing

During the retrospective, what concerns me most isn't the "mistake" itself, but "why it went unnoticed so quietly."

1. **It is pure data **, not code, so static analysis has no way to detect it.
2. **The feature-check asserts the DOM structure ** (whether `a.edit` exists, if the class is correct), but it doesn't check external URLs.
3. Was it clicked locally? **No **. During development, everyone was just looking at the layout.
4. Netlify only handles the build; it doesn't care where you link to.

| 层 | Can detect 吗 | Reason |
|---|---|---|
| Hugo tem板 | No 能 | It only performs string concatenation |
| Build val验 | No 能 | It doesn't parse URLs |
| feature-check | No 能 | It asserts selectors, not external links |
| Manual click o下 | **Could ** | But it wasn't clicked until three days later |
>  type bugs are roughly formally named "the ** cell that no one is responsible for**".

##  IV. The patch cell

The fix itself took a second: revert back to `master`. But building the defense line took a bit of thought.

Added an assertion to `feature-check.sh` that directly greps the edit links in the build artifacts, ** verifying that the branch segment must equal the repository's default branch **:

```bash
check "editPost 分支与默认分支一致" \
  "grep -q '/blob/$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's|origin/||')/' '$PAGE'"
```

Then added a comment next to `hugo.toml`:

```toml
# 分支必须与仓库默认分支一致（master）——曾误写 main 致全站死链
```

| Patch 法  | Defends against |
|---|---|
| Branch 段  assertion | If it's written incorrectly again, CI will turn red immediately |
| Configuration side note 释  | So people see it before they change it |
| Post-mortem written in doc 档  | So next time we don't rely on "just a quick click" |

- [x]  Revert back to master
- [x]  Add assertions (now 27 items)
- [x]  Add comments
- [ ]  While I'm at it, scan through other hardcoded domains (added a TODO)

##  V. What is more worth leaving behind than fixing a bug
After this, I changed a habit: ** just building the green pipeline isn't enough; I now always click a production link ** on the fly. It takes three seconds and perfectly covers all the pitfalls of "data is wrong but the format is valid."

There is another more general conclusion: ** automatic checks are good at verifying structure, but bad at verifying facts **. If the structure is wrong, it crashes; if the facts are wrong (branch names, domains, dates, IDs), it will fail silently for a long time. Therefore, you should try to mix in some "fact-based" assertions, even if it's just grepping a string.

>  That line of comment is still sitting in the config file. It doesn't execute anything, but every time someone wants to change that URL, they first read "Once mistakenly wrote main, causing site-wide dead links."

** Code manages behavior, comments manage memory. ** This time, I used both.
