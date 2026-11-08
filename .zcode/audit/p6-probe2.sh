#!/bin/bash
grep -o 'giscus-wrapper[^>]*>' /tmp/blog-p6-public/zh/posts/first/index.html | head -2
grep -o '<div class=home>' /tmp/blog-p6-public/zh/index.html | head -1
grep -o -- '--font-display:"Iowan Old Style"' /tmp/blog-p6-public/assets/css/stylesheet.*.css | head -1
grep -c 'notfound-recent' /tmp/blog-p6-public/ja/404.html
