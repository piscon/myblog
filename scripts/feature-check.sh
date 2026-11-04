#!/usr/bin/env bash
# Feature health check: verify all theme-coupled custom features survive
# theme structure changes by building a test post carrying every custom
# front-matter param and asserting on the rendered HTML.
#
# Usage: bash scripts/feature-check.sh   (run from anywhere; cd's to repo root)
# Writes a pass/fail table to $GITHUB_STEP_SUMMARY when running in CI,
# and dumps the article DOM snapshot on failure for easy selector repair.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
: "${GITHUB_STEP_SUMMARY:=}"

POST="content/zh/posts/feature-check-test.md"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"; rm -f "$POST"' EXIT

mkdir -p static/audio static/video
cat > "$POST" <<'EOF'
+++
title = 'Feature health check'
date = '2026-11-04'
draft = true
audio_file = '/audio/feature-check.mp3'
video_file = '/video/feature-check.mp4'
youtube_id = 'dQw4w9WgXcQ'
bilibili_bvid = 'BV1xx411c7mD'
media_position = 'top'
lastmod = '2026-12-25'
aliases = ['/posts/alias-test/']
tags = ['博客']
+++
test body
EOF

hugo -D -d "$OUT" >/dev/null
PAGE="$OUT/zh/posts/feature-check-test/index.html"

declare -a NAMES=() RESULTS=() FAILS=()
check() {
  NAMES+=("$1")
  if eval "$2"; then
    RESULTS+=("✅")
  else
    RESULTS+=("❌")
    FAILS+=("$1")
  fi
}

check "audio 播放器渲染"        "grep -q '<audio src=\"/audio/feature-check.mp3\"' '$PAGE'"
check "video 播放器渲染"        "grep -q '<video src=\"/video/feature-check.mp4\"' '$PAGE'"
check "置顶 CSS 注入(order)"    "grep -q 'post-single>.post-media{order:1' '$PAGE'"
check "og:audio meta"          "grep -q 'property=\"og:audio\"' '$PAGE'"
check "og:video meta"          "grep -q 'property=\"og:video\"' '$PAGE'"
check "品牌 favicon 引用"       "grep -q '/branding/favicon.ico' '$PAGE'"
check "og:image 品牌图"         "grep -q 'branding/og-default.jpg' '$PAGE'"
check "自定义 404 页存在"        "test -f '$OUT/zh/404.html'"
check "404 en 文案分流"         "grep -q 'Page not found' '$OUT/en/404.html'"
check "最后更新时间显示"        "grep -q '最后更新于' '$PAGE'"
check "相关文章推荐渲染"        "grep -q 'post-related' '$PAGE' && grep -q '你好，世界' '$PAGE'"
check "站点 JS 加载"            "grep -q '/js/site\.' '$PAGE'"
check "aliases 跳转页生成"      "test -f '$OUT/zh/posts/alias-test/index.html'"
check "llms.txt 站点索引生成"    "test -f '$OUT/zh/llms.txt' && grep -q 'Feature health check' '$OUT/zh/llms.txt'"
check "归档页 zh 本地化(年/月)"  "grep -q 'archive-year-header' '$OUT/zh/archives/index.html' && grep -q '2026年' '$OUT/zh/archives/index.html' && grep -q '11月' '$OUT/zh/archives/index.html'"
check "归档页 en 本地化(月名)"   "grep -q 'archive-year-header' '$OUT/en/archives/index.html' && grep -q 'November' '$OUT/en/archives/index.html'"
check "YouTube nocookie iframe"  "grep -q 'youtube-nocookie.com/embed/dQw4w9WgXcQ' '$PAGE'"
check "B站 iframe 播放器"         "grep -q 'player.bilibili.com/player.html?bvid=BV1xx411c7mD' '$PAGE'"

FAILED=0
{
  echo "| 断言 | 结果 |"
  echo "|---|---|"
  for i in "${!NAMES[@]}"; do
    echo "| ${NAMES[$i]} | ${RESULTS[$i]} |"
    [ "${RESULTS[$i]}" = "❌" ] && FAILED=1
  done
} >> "$PAGE.summary.md"

if [ -n "$GITHUB_STEP_SUMMARY" ]; then
  cat "$PAGE.summary.md" >> "$GITHUB_STEP_SUMMARY"
else
  cat "$PAGE.summary.md"
fi

if [ "$FAILED" -eq 1 ]; then
  echo "FAILED: ${FAILS[*]}"
  if [ -n "$GITHUB_STEP_SUMMARY" ]; then
    {
      echo "### ❌ DOM 快照（article 区域，用于修复选择器）"
      echo '```html'
      sed -n '/<article class="post-single">/,/<\/article>/p' "$PAGE" | head -c 4000
      echo '```'
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 1
fi
echo "All feature assertions passed."
