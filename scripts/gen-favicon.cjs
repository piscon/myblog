#!/usr/bin/env node
/* 从 static/branding/favicon.svg 生成位图 favicon（一次性工具，源图变了再跑）：
 *   favicon-16x16.png / favicon-32x32.png —— 透明底（圆形图标外围留空）
 *   apple-touch-icon.png 180×180 —— iOS 不支持透明（透明像素会被填成黑色），
 *     压平到品牌暗底 #1d1e20（与 dark 模式背景一致，同 og-default 的深色系），
 *     圆形缩到 88% 居中留 padding，防贴边裁切
 * 依赖 sharp（自带 SVG 栅格化）。用法与 gen-og-image.js 相同：
 *   mkdir -p /tmp/ogtool && cd /tmp/ogtool && npm init -y && npm i sharp
 *   NODE_PATH=/tmp/ogtool/node_modules node scripts/gen-favicon.cjs
 * 本仓库不进 node_modules（静态博客仓库保持零依赖）。
 */
const sharp = require('sharp');
const path = require('path');
const root = path.join(__dirname, '..');
const svg = path.join(root, 'static/branding/favicon.svg');

(async () => {
  await sharp(svg, { density: 300 }).resize(16, 16).png()
    .toFile(path.join(root, 'static/branding/favicon-16x16.png'));
  await sharp(svg, { density: 300 }).resize(32, 32).png()
    .toFile(path.join(root, 'static/branding/favicon-32x32.png'));
  const pad = Math.round(180 * 0.06);
  const icon = 180 - pad * 2;
  await sharp({ create: { width: 180, height: 180, channels: 4, background: '#1d1e20' } })
    .composite([{
      input: await sharp(svg, { density: 300 }).resize(icon, icon).png().toBuffer(),
      top: pad,
      left: pad
    }])
    .png()
    .toFile(path.join(root, 'static/branding/apple-touch-icon.png'));
  console.log('favicon PNGs generated: 16 / 32 / apple-touch 180');
})();
