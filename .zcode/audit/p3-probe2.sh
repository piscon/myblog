#!/bin/bash
cd /home/piscon/codespace/myblog
grep -n 'pagination\|page-num\|pagenum\|num-btn\|ellipsis' 原型/二重奏-博客界面设计-交互版.html | head -20
grep -n -A12 '\.pagination' 原型/二重奏-博客界面设计-交互版.html | head -40
grep -n 'renderPagination\|buildPager\|pageNum' 原型/二重奏-博客界面设计-交互版.html | head
