#!/bin/bash
cd /home/piscon/codespace/myblog
sed -n '/^@media (min-width: 1200px) {/,/^}/p' 原型/二重奏-博客界面设计-交互版.html | head -40
