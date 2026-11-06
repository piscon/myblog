#!/usr/bin/env node
/* 重新生成 static/branding/og-default.jpg（1200x630 Open Graph 分享图）。
 * 依赖 sharp（自带 SVG 栅格化，用系统 fontconfig 的 CJK 字体）。用法：
 *   mkdir -p /tmp/ogtool && cd /tmp/ogtool && npm init -y && npm i sharp
 *   NODE_PATH=/tmp/ogtool/node_modules node scripts/gen-og-image.cjs
 * 本仓库不进 node_modules（静态博客仓库保持零依赖）。
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const logo = fs.readFileSync(path.join(root, 'static/branding/logo.jpg')).toString('base64');
const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#171a21"/>
      <stop offset="1" stop-color="#2c3340"/>
    </linearGradient>
    <clipPath id="round"><rect x="450" y="95" width="300" height="300" rx="36"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <image href="data:image/jpeg;base64,${logo}" x="450" y="95" width="300" height="300" preserveAspectRatio="xMidYMid slice" clip-path="url(#round)"/>
  <text x="600" y="490" text-anchor="middle" font-family="WenQuanYi Micro Hei" font-size="72" fill="#e6edf3" letter-spacing="14">二重奏</text>
  <text x="600" y="552" text-anchor="middle" font-family="WenQuanYi Micro Hei" font-size="26" fill="#8b949e" letter-spacing="2">精神与思想的二重奏，自由与独立的交响曲</text>
</svg>`;
sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(path.join(root, 'static/branding/og-default.jpg'))
  .then(i => console.log('written', i.width, 'x', i.height, i.size, 'bytes'));
