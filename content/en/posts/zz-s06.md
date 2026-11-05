+++
lang = 'en'
title = 'Reducing Build Time from 8s to 2s: A Low-Tech Optimization'
date = '2026-11-05'
draft = false
source_hash = 'fadb5bf6bcc7130bbb2eb71d6bd51d0034338b2ce901ddf0ff2baad79ae37ae9'
source_fields_hash = '2f0159d4629811c891fb943cc3eefd64d47d13753d37a95c6fa07b91726b241f'
description = 'I investigated why my Hugo build time jumped from 2 to 8 seconds. It turned out to be a single inefficient category query inside a loop, which I fixed by moving the logic outside the loop.'
categories = ['Tech']
tags = ['Hugo', 'Performance']

[cover]
  image = '/images/grass.jpg'
  alt = 'Build output in the terminal'
  caption = 'Total in 2.1s'
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/zz-s06/) for the authoritative version.

##  1. Eight seconds isn't slow, but it's not right

With fewer than thirty articles on the site, `hugo --gc --minify` running locally takes just over eight seconds. The absolute number isn't terrifying, but ** the same repository was still at two seconds ** last week, and only two or three features have been added since then.

>  The slowdown itself isn't scary; what's scary is not knowing which version it started from.

First, I'll use the most brute-force method: `git log` check the last ten commits and perform a checkout and build timing for each one.

| Commit 交 | Build 建 | Suspect |
|---|---|---|
| Added progress 条 | 2.1s | Irrelevant |
| Added search auth 重 | 2.2s | Irrelevant |
| Archive page local 化 | **7.9s** | ✓ This is it |
| Following two 个 | 8.0s | Consistent |

*The culprit was identified in a minute.* The real time-sink was what came after—why an archive page would cost an extra six seconds.

##  2. A few useless attempts

Following intuition, I tried the following in order:

1. ** Thought it was images **: Cleared `resources` and re-ran, no change.
2. ** Thought it was `--gc`**: Removed parameters, 8.0 → 7.9, not it.
3. ** thought it was template nesting **: simplifying the archive template to just one `<ul>`, it's still 7.8

- [x]  Clear cache
- [x]  Run --gc
- [x]  Simplify template
-  [ ] ~~ Preparing to switch generators ~~ (thankfully didn't pull the trigger)

After finishing the third attempt, it occurred to me: ** is that category query line in the template running every single time in the loop **.

##  III. That line of code

The archive page needs to be grouped by year and month; the original implementation was roughly like this:

```go
{{ range .Site.RegularPages }}
  {{ $y := .Date.Format "2006" }}
  {{ $posts := where (where .Site.RegularPages "Section" "posts") "Date" ">" ... }}
  {{ range $posts }}…{{ end }}
{{ end }}
```

The outer `range` has N posts, so the inner `where` ends up ** filtering all site pages N times **. It wasn't noticeable when there were few articles, but once you add multi-language support which triples the page count, the complexity becomes immediately apparent.
This fix isn't clever at all: moving the ** filter outside the loop to perform ** only once.

```go
{{ $all := where .Site.RegularPages "Section" "posts" }}
{{ $groups := $all.GroupByDate "2006-01" }}
{{ range $groups }}…{{ end }}
```

`GroupByDate` is built into Hugo; I can't believe I didn't think to use it before.

##  IV. Numbers

| Metric 标 | Before 前 | After |
|---|---|---|
| Local build 建 | 8.0s | **2.1s** |
| Template exec 行 | 6.7s | 0.8s |
| Total CI time 长 | 41s | 33s |
| Lines of code 数 | 22 | 9 |

>  Deleted thirteen lines, saved six seconds. ** This is probably the most cost-effective commit of the week. **

##  V. Why it's worth noting

Because the first three attempts were all wrong, even though they all "felt" right. Clearing the cache, removing parameters, simplifying templates—each step made sense, each step was tested, and each step was useless.

What actually worked was ** measuring before guessing **: by listing the build time for each commit in a table, the slow version revealed itself. If I had just relied on intuition to optimize images, I'd probably still be converting images that haven't even changed into WebP.

- ** Locate first, then act **
-  Don't optimize what you haven't measured
-  Check built-in framework functions first before writing your own loops
- ~~Eight seconds is bearable ~~ It is not bearable

## VI. Wrapping Up

Now `Total in 2.1s`, it is just like it was before adding the features. The archive page is still the same archive page—year/month grouping, trilingual support, and RSS entry are all there; it just no longer counts the same page list thirty times.

**Less code, a faster site, and no new dependencies added. ** Days like this are worth writing down.

[^1]: `hugo --templateMetrics` You can see the cumulative time spent on each template directly; I only found out about this after the fact this time, so I'll turn it on first next time.
