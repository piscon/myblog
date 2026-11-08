// 独立博客「列表形态 / 评论 / 404」实测脚本（真实 Chromium，Playwright 驱动）
// 用法: node survey-list.mjs  → 结果写 survey-list.json / survey-list.md
import fs from 'node:fs';

const SITES = [
  ['jvns.ca', 'https://jvns.ca/'],
  ['danluu.com', 'https://danluu.com/'],
  ['leerob.com', 'https://leerob.com/'],
  ['overreacted.io', 'https://overreacted.io/'],
  ['maggieappleton.com', 'https://maggieappleton.com/essays'],
  ['craigmod.com', 'https://craigmod.com/essays/'],
  ['tonsky.me', 'https://tonsky.me/'],
  ['sive.rs', 'https://sive.rs/'],
  ['blog.jim-nielsen.com', 'https://blog.jim-nielsen.com/'],
  ['ruanyifeng.com/blog', 'https://www.ruanyifeng.com/blog/'],
  ['diygod.cc', 'https://diygod.cc/'],
  ['joshwcomeau.com', 'https://www.joshwcomeau.com/blog/'],
];

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/overflow-test/node_modules/playwright-core');
const browser = await chromium.launch({
  executablePath: '/home/piscon/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(25000);

const results = [];

for (const [name, url] of SITES) {
  const r = { site: name, url, list: null, comments: null, notFound: null, err: null };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    r.list = await page.evaluate(() => {
      // 找「重复出现 ≥3 次的容器类」作为列表项簇
      const cand = [];
      const seen = new Set();
      for (const a of document.querySelectorAll('main a[href], article a[href], body a[href]')) {
        const host = a.closest('li,article,.post,.entry,.item') || a.parentElement;
        if (!host) continue;
        const sig = host.tagName + '|' + (typeof host.className === 'string' ? host.className : '');
        if (seen.has(sig + a.href)) continue;
        seen.add(sig + a.href);
        const rect = host.getBoundingClientRect();
        const img = host.querySelector('img');
        const imgRect = img ? img.getBoundingClientRect() : null;
        cand.push({
          sig,
          title: (a.textContent || '').trim().slice(0, 60),
          href: a.getAttribute('href'),
          hostH: Math.round(rect.height),
          hostW: Math.round(rect.width),
          fs: Math.round(parseFloat(getComputedStyle(a).fontSize)),
          hasImg: !!img,
          imgW: imgRect ? Math.round(imgRect.width) : 0,
          imgH: imgRect ? Math.round(imgRect.height) : 0,
          top: Math.round(rect.top),
          excerpt: (host.textContent || '').trim().length,
        });
      }
      // 聚类：按 sig
      const bySig = {};
      cand.forEach(c => { (bySig[c.sig] = bySig[c.sig] || []).push(c); });
      const clusters = Object.entries(bySig)
        .filter(([sig, arr]) => arr.length >= 3 && arr.every(c => c.title.length > 0))
        .sort((a, b) => b[1].length - a[1].length);
      if (!clusters.length) return { clusters: 0 };
      const [sig, arr] = clusters[0];
      const withImg = arr.filter(c => c.hasImg && c.imgW > 80).length;
      const gaps = [];
      for (let i = 1; i < Math.min(arr.length, 4) && i < arr.length; i++) {
        const prev = arr.slice(0, i).reduce((m, c) => Math.max(m, c.top + c.hostH), 0);
      }
      return {
        clusters: clusters.length,
        clusterSig: sig.slice(0, 80),
        n: arr.length,
        withCoverImg: withImg,
        titleFs: arr[0].fs,
        itemH: arr[0].hostH,
        itemW: arr[0].hostW,
        imgRatio: arr[0].imgW && arr[0].imgH ? (arr[0].imgW / arr[0].imgH).toFixed(2) : null,
        excerptChars: arr[0].excerpt,
        sample: arr.slice(0, 3).map(c => c.title),
      };
    });

    // 评论：打开列表第一个文章链接
    const firstHref = await page.evaluate(() => {
      const a = document.querySelector('main article a[href], article a[href]');
      return a ? a.href : null;
    });
    if (firstHref) {
      try {
        await page.goto(firstHref, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        const html = (await page.content()).toLowerCase();
        r.comments = {
          article: firstHref,
          giscus: html.includes('giscus'),
          utterances: html.includes('utterances'),
          disqus: html.includes('disqus'),
          other: html.includes('class="comments"') || html.includes('id="comments"') || html.includes('webmentions'),
          guestbookHint: html.includes('guestbook'),
        };
      } catch (e) { r.comments = { err: String(e).slice(0, 80) }; }
    }
  } catch (e) { r.err = String(e).slice(0, 140); }

  // 404
  try {
    const origin = new URL(url).origin;
    const resp = await page.goto(origin + '/definitely-not-a-real-page-xyz-12345', { waitUntil: 'domcontentloaded' }).catch(e => null);
    await page.waitForTimeout(800);
    r.notFound = await page.evaluate(() => ({
      title: document.title.slice(0, 80),
      bodyLen: document.body.textContent.trim().length,
      hasHomeLink: !!document.querySelector('a[href="/"], a[href*="index"]'),
      h1: (document.querySelector('h1') || {}).textContent || '',
    })).then(v => ({ status: resp ? resp.status() : null, ...v }));
  } catch (e) { r.notFound = { err: String(e).slice(0, 80) }; }

  results.push(r);
  console.error('done', name);
}

await browser.close();
fs.writeFileSync('/home/piscon/codespace/myblog/.zcode/audit/survey-list.json', JSON.stringify(results, null, 1));

const md = ['# 独立博客列表形态 / 评论 / 404 实测（Playwright 真实 Chromium 1280×900）', '',
  '| 站点 | 列表项形态 | 项数 | 带封面 | 标题字号 | 项高 | 摘要字符 | 评论实现 | 404 |',
  '|---|---|---|---|---|---|---|---|---|'];
for (const r of results) {
  const l = r.list || {};
  md.push(`| ${r.site} | ${l.clusterSig ? String(l.clusterSig).slice(0, 40) : (r.err || '无簇')} | ${l.n || '-'} | ${l.withCoverImg ?? '-'} | ${l.titleFs ?? '-'}px | ${l.itemH ?? '-'}px | ${l.excerptChars ?? '-'} | ${r.comments ? (r.comments.giscus ? 'giscus' : r.comments.disqus ? 'disqus' : r.comments.utterances ? 'utterances' : r.comments.other ? '自建/其他' : r.comments.err ? 'err' : '无') : '-'} | ${r.notFound && r.notFound.status ? r.notFound.status + ' ' + String(r.notFound.h1 || r.notFound.title || '').slice(0, 24) : 'err'} |`);
}
fs.writeFileSync('/home/piscon/codespace/myblog/.zcode/audit/survey-list.md', md.join('\n'));
console.log('OK');
