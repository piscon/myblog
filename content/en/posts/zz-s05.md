+++
lang = 'en'
title = 'Adding a Non-Intrusive Reading Progress Bar to a Static Blog'
date = '2026-11-05'
draft = false
source_hash = '58bef8e9ae5f12851c5046e34b13e93df45e580dcdaa1e0974a45c4b849896a3'
source_fields_hash = '82e5966b11031f15ca03909bdc62a712c74a541fcc26ce3054e232fb7d5ec41a'
description = "Add a lightweight reading progress bar to your article pages using less than 40 lines of CSS and a tiny snippet of JS. This method avoids third-party libraries, doesn't modify the theme core, and includes a fallback for when JS is disabled."
categories = ['Tech']
tags = ['Hugo', 'CSS', 'JavaScript']

[cover]
  image = '/images/grass.jpg'
  alt = 'A thin line at the top of the page'
  caption = 'An almost invisible progress bar'
+++
> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](/zh/posts/zz-s05/) for the authoritative version.

## I. The requirement is just one sentence

**As the reader scrolls, the line at the top follows them. ** No numbers, no percentages, no pop-up prompts, and no thickening on hover. That's it.

The blog uses Hugo + PaperMod, and the theme is updated weekly, so I set a rule for myself before starting: ** Never modify the submodule itself **. Anything that can be placed at the site level should stay at the site level.

>  The theme is a volatile dependency; if logic is embedded within it, every weekly PR requires a manual diff review.

## II. Where to place it

| Method 案  | Change Location 置  | Upgrade to 本  | Conclusion |
|---|---|---|---|
| Modifying theme header template 板  | submodule 内  | Weekly rush 突  | ✗ Exclude directly |
| Overriding `extend_head.html` | Site level `layouts/_partials/` | 低  | ✓ Inject CSS/JS |
| Custom shortcodes e  | Inside every article 文  | 高  | ✗ CMS will break syntax |
| Pure CSS `scroll-timeline` | Site CSS S  | Best 低  | △ Insufficient compatibility |

In the end, I chose the second option + a small snippet of vanilla JS. CSS goes through `assets/css/extended/`, and JS goes through `assets/js/site.js`, both loaded via the theme's `extend_head` hooks with fingerprints.

- [x]  Uses site-level extension points
- [x]  Zero third-party dependencies
- [ ]  No IE compatibility (stopped doing that long ago)
- [ ]  No prefers-reduced-motion toggle (note to self)

## III. Those thirty-odd lines

The core is actually just one sentence: `scrollY / (scrollHeight - innerHeight)`.

```js
function updateProgress() {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
  document.querySelector('.reading-progress')
    ?.style.setProperty('--p', String(p));
}
```
Using CSS to control `--p` with `scaleX` requires one less reflow than modifying `width`:

```css
.reading-progress {
  position: fixed; inset: 0 0 auto; height: 2px;
  transform: scaleX(var(--p, 0)); transform-origin: left;
  background: var(--primary); pointer-events: none;
}
```

**Watch out for `pointer-events: none`. ** I forgot to add it in the first version, which caused the progress bar to sit at the very top of the header, covering the theme toggle button's click area by one pixel. It took me half an hour of troubleshooting to find it.

## IV. What to do when JS is disabled

The progress bar itself is an "enhancement" rather than "content," so if JS doesn't run, an empty line shouldn't appear. The approach is to ** default to `display: none`, and only show ** when JS adds a class:

```css
.reading-progress { display: none; }
html.has-js .reading-progress { display: block; }
```

`site.js` Add `document.documentElement.classList.add('has-js')` to the first line. This way, if the script fails to load, is blocked, or exits midway due to an error, the page remains unchanged.

>  Progressive enhancements must ** prove their own usability **; don't rely on the reader to bail you out.

##  V. Two small pitfalls
1. **There is no `.post-single`** on the homepage, so don't render it on the list page either. In `site.js`, check for this selector first; if it's not found, just return.
2. **A long directory will increase the page height **, causing the scroll denominator to change, which makes the progress bar slightly backtrack when it reaches the middle. Finally, a baseline is taken according to `document.body.scrollHeight` without dynamic recalculation—**it's good enough.**

| 坑 | Current 象 | Fix |
|---|---|---|
| Missing pointer-events | Buttons are unclickable 到 | Add a line of CSS |
| Also showing on list page 示 | Extra 线  at the top of the homepage| Selector gating |
| Directory stretches 高 | Slight backtrack in the middle 退 | Accepted |

## VI. Wrap-up

The entire change involves only two files and about thirty lines of code; no themes were touched, and no packages were installed. The line after `hugo --gc --minify` is almost invisible, which is exactly what was intended.

> **"Almost invisible"** is the sole design goal of this feature. Once achieved, do not add anything else to it.

[^1]: `scroll-timeline` Available in Chrome 115+. Once Safari catches up, this entire block of JS can be deleted.
