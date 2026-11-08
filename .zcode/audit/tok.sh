#!/bin/bash
cd /home/piscon/codespace/myblog
F="原型/二重奏-博客界面设计-交互版.html"
echo "== --sp tokens =="
grep -oE -- '--sp-[a-z0-9]+:[^;]+' "$F" | sort -u
echo "== font tokens =="
grep -oE -- '--font[a-z-]*:[^;]+' "$F" | sort -u | head -20
echo "== :root blocks =="
grep -n ':root' "$F" | head
echo "== file size =="
wc -c "$F"
