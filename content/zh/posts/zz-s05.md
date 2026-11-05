+++
title = '给静态博客加一个不打扰的阅读进度条'
date = '2026-11-05'
draft = true
description = '用不到四十行 CSS 和一小段 JS 给文章页加进度条：不引第三方库、不改主题本体、JS 禁用时自动回退。记录取舍过程和两个踩过的小坑。'
categories = ['技术']
tags = ['Hugo', 'CSS', 'JavaScript']
[cover]
  image = '/images/grass.jpg'
  alt = '页面顶部的细线'
  caption = '一条几乎看不见的进度条'
+++

## 一、需求只有一句话

**读者翻到哪儿，顶上那条线就走到哪儿。** 不加数字、不加百分比、不弹提示，鼠标移上去也不变粗。就这一句。

博客是 Hugo + PaperMod，主题每周更新，所以动手前先给自己划了条线：**绝不改 submodule 本体**。能放在站点层的都放站点层。

> 主题是易变依赖，逻辑放进去，每次 weekly PR 都要人工看 diff。

## 二、放在哪一层

| 方案 | 改动位置 | 升级成本 | 结论 |
|---|---|---|---|
| 改主题 header 模板 | submodule 内 | 每周冲突 | ✗ 直接排除 |
| 覆盖 `extend_head.html` | 站点 `layouts/_partials/` | 低 | ✓ 注入 CSS/JS |
| 自建 shortcode | 每篇文章正文 | 高 | ✗ CMS 会破坏语法 |
| 纯 CSS `scroll-timeline` | 站点 CSS | 最低 | △ 兼容性不够 |

最后选了第 2 条 + 一小段原生 JS。CSS 走 `assets/css/extended/`，JS 走 `assets/js/site.js`，都由主题的 `extend_head` 钩子带指纹加载。

- [x] 用站点层扩展点
- [x] 零第三方依赖
- [ ] 没做 IE 兼容（早就不做了）
- [ ] 没加 prefers-reduced-motion 开关（记一下）

## 三、那三十几行

核心其实就一句：`scrollY / (scrollHeight - innerHeight)`。

```js
function updateProgress() {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
  document.querySelector('.reading-progress')
    ?.style.setProperty('--p', String(p));
}
```

CSS 侧用 `--p` 控制 `scaleX`，比改 `width` 少一次重排：

```css
.reading-progress {
  position: fixed; inset: 0 0 auto; height: 2px;
  transform: scaleX(var(--p, 0)); transform-origin: left;
  background: var(--primary); pointer-events: none;
}
```

**注意 `pointer-events: none`。** 第一版忘了加，进度条横在页头最上面，把主题切换按钮的点击区盖掉了一像素，排查了半小时才拍到。

## 四、JS 禁用时怎么办

进度条本身是「增强」而不是「内容」，所以 JS 不跑就不该出现一条空线。做法是**默认 `display: none`，由 JS 加一个 class 才显示**：

```css
.reading-progress { display: none; }
html.has-js .reading-progress { display: block; }
```

`site.js` 第一行加 `document.documentElement.classList.add('has-js')`。这样脚本没加载、被拦、或报错中途退出，页面都保持原样。

> 增强功能要**自己证明自己可用**，不能让读者替你兜底。

## 五、两个小坑

1. **首页没有 `.post-single`**，别在列表页也渲染。`site.js` 里先查这个选择器，查不到直接 return
2. **长目录会撑高页面**，滚动分母跟着变，进度条到中段会轻微回退。最后按 `document.body.scrollHeight` 取一次基准，没做动态重算——**够用就行**

| 坑 | 现象 | 处理 |
|---|---|---|
| 缺 pointer-events | 按钮点不到 | 加一行 CSS |
| 列表页也显示 | 首页顶部多根线 | 选择器门控 |
| 目录撑高 | 中段轻微回退 | 接受 |

## 六、收尾

整段改动只有两个文件、三十几行，没碰主题，没装包。`hugo --gc --minify` 之后那条线几乎看不见，正是想要的。

> **「几乎看不见」**是这个功能唯一的设计目标。做到之后就别再给它加东西了。

[^1]: `scroll-timeline` 在 Chrome 115+ 可用，等 Safari 跟上之后这段 JS 可以整段删掉。
