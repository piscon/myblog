#!/bin/bash
cd /home/piscon/codespace/myblog
awk '/Article|article-head/,0' 原型/二重奏-博客界面设计-交互版.html | sed -n '/^\.article-head {/,/^}/p; /^\.article-title {/,/^}/p; /^\.article-deck {/,/^}/p; /^\.article-cover {/,/^}/p; /^\.article-cover img/,/^}/p; /^\.article-body {/,/^}/p; /^\.article-body h2 {/,/^}/p; /^\.article-meta/,/^}/p; /^\.list-foot {/,/^}/p; /^\.related {/,/^}/p; /^\.related h2/,/^}/p; /\.article-body \> p:first/,/^}/p' | head -80
echo === toc-box ===
grep -n -A10 'toc' 原型/二重奏-博客界面设计-交互版.html | grep -A10 '\.toc' | head -30
