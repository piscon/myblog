#!/usr/bin/env node
// AI 翻译流水线：content/zh/posts/*.md → content/{ja,en}/posts/<同名>.md
//
// 用法：node scripts/translate.mjs [--dry-run] [--force]
//   --dry-run  只打印将发生什么，不调 API、不写文件
//   --force    忽略 source_hash 一致性，机翻文件强制重译（人工手写文件仍然永不触碰）
//
// 认证双模式（自动选择）：
//   1) env 有 CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID → Workers AI REST 直连（CI 用）
//   2) 否则回退本地 `cf ai run` 子进程（cf CLI OAuth 登录态，本地开发用）
//
// 增量机制：译文相关内容（body + title/description/categories/tags/cover.alt/cover.caption）
// 的 sha256 存进目标文件 front matter 的 source_hash，一致即跳过——费用只在内容变更时发生。
// 换模型或改提示词时递增 PROMPT_VERSION 即可让全部文章重译一遍。
//
// 人工保护：目标文件存在但没有 source_hash = 人工手写，永不覆盖、永不删除。
// 人工校对后的机翻文件：source_hash 不变，只要中文原文不动就不会被重译覆盖。

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const ZH_POSTS = join(ROOT, 'content/zh/posts');
const LANGS = ['ja', 'en'];

const MODEL = process.env.TRANSLATE_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8';
const PROMPT_VERSION = 'v3'; // v3：两段式调用 + /no_think 关思考（v2 曾因 reasoning 烧尽 max_tokens 空响应）
const MAX_TOKENS_FIELDS = 2000; // qwen3 思考 token 也计入 max_tokens，预算要给思考留余地
const MAX_TOKENS_BODY = 6000;

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// 人工手写文件的字段标记：机翻文件才带 source_hash
const MACHINE_KEY = 'source_hash';
// 不复制进译文的源字段：lang 重写、lastmod 由 CI 回写、aliases 是中文 URL 空间的旧路径跳转、
// auto_translate 是 zh 源上的开关、source_hash 由本脚本重算
const DROP_KEYS = ['lang', 'lastmod', 'aliases', 'auto_translate', MACHINE_KEY];
// 会被翻译覆盖的字段（其余源字段原样复制：weight/youtube_id/bilibili_bvid/audio_file/…）
const TRANSLATED_KEYS = ['title', 'description', 'categories', 'tags'];

const DISCLAIMER = {
  ja: (link) => `> 本記事はAIによる自動翻訳です。表現が不自然な場合は[中文の原文](${link})をご参照ください。\n\n`,
  en: (link) => `> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](${link}) for the authoritative version.\n\n`,
};

// 字段走小 JSON 调用（title/description 等短文本，模型处理 JSON 可靠）。
// /no_think：qwen3 的官方软开关，关掉思考模式——reasoning 也烧 max_tokens，
// 曾把字段调用的预算耗尽导致 content 空响应，翻译任务也不需要推理
const LANG_FIELDS_PROMPT = {
  ja: `把 JSON 中 title/description/categories/tags/cover_alt/cover_caption 的中文翻译成自然的日语（です・ます体）。规则：title 简洁；description 1-2 句完整句（源为 null 时根据 body 概括写出）；categories/tags 用日语惯用词，专有名词（AI、Hugo 等）保留原文；cover_alt/cover_caption 源为 null 输出 null。只输出一个合法 JSON 对象，键与输入一致，不要代码围栏、不要解释。/no_think`,
  en: `Translate the Chinese in the JSON fields title/description/categories/tags/cover_alt/cover_caption into natural English. Rules: title concise; description 1-2 full sentences (if null, summarize from body); categories/tags use common English equivalents, keep proper nouns (AI, Hugo) as-is; cover_alt/cover_caption output null if null. Output ONLY one valid JSON object with the same keys — no fences, no explanations. /no_think`,
};
// 正文走纯文本调用（Markdown 链接/结构在 JSON 里会被模型打散，纯文本则保真）
const LANG_BODY_PROMPT = {
  ja: `你是个人技术博客的专业翻译。把用户的 Markdown 正文翻译成自然的日语（です・ます体）。/no_think
- 只输出翻译后的 Markdown，不要任何解释、不要代码围栏
- 所有中文文字必须翻译，绝不能原样复制中文
- 保持 Markdown 结构不变：标题层级、列表（有序/无序）、引用块、斜体/粗体标记原样保留
- 行内链接必须保持 [文字](URL) 语法，只译链接文字，URL 原样
- 图片语法、行内代码、代码块、URL 原样保留；代码块内容除注释外不翻译`,
  en: `You are a professional translator for a personal tech blog. Translate the user's Markdown body into natural English. /no_think
- Output ONLY the translated Markdown — no explanations, no code fences
- ALL Chinese text must be translated — never copy the Chinese verbatim
- Keep the Markdown structure intact: heading levels, ordered/unordered lists, blockquotes, italic/bold markers preserved
- Inline links must keep [text](URL) syntax — translate only the link text, keep URLs verbatim
- Image syntax, inline code, code blocks and URLs verbatim; do not translate code block contents except comments`,
};

// ---------- TOML front matter（子集）解析 ----------

// 值内方括号是否配平（不处理字符串内 ] 的极端情况）
function bracketsBalanced(s) {
  let n = 0;
  for (const c of s) {
    if (c === '[') n++;
    else if (c === ']') n--;
  }
  return n <= 0;
}

function unquote(s) {
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  if (s.startsWith('"') && s.endsWith('"')) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  return s;
}

function parseValue(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s.startsWith('[')) {
    // 单行或多行数组：抽出所有带引号元素
    return [...s.matchAll(/'([^']*)'|"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => (m[1] !== undefined ? m[1] : JSON.parse(m[0])));
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return unquote(s);
}

// 返回 { fm: { 'cover.image': ..., title: ..., draft: false }, body, hasCoverTable }
function parsePost(raw) {
  const m = raw.match(/^\+\+\+[ \t]*\r?\n([\s\S]*?)\r?\n\+\+\+[ \t]*\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  let currentTable = '';
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      currentTable = line.slice(1, -1).trim() + '.';
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let valText = line.slice(eq + 1).trim();
    while (!bracketsBalanced(valText) && i + 1 < lines.length) {
      valText += ' ' + lines[++i].trim();
    }
    fm[currentTable + key] = parseValue(valText);
  }
  const body = m[2].replace(/^\r?\n/, '');
  return { fm, body };
}

// ---------- TOML 序列化 ----------

// 字面串优先（无 ' 无控制字符），否则基本串（JSON 转义是合法 TOML 子集）
function tomlString(v) {
  if (!v.includes("'") && !/[\x00-\x1f\x7f]/.test(v)) return `'${v}'`;
  return JSON.stringify(v);
}

function serializeFM(fm, coverEntries) {
  const out = ['+++'];
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) out.push(`${k} = [${v.map(tomlString).join(', ')}]`);
    else if (typeof v === 'boolean') out.push(`${k} = ${v}`);
    else if (typeof v === 'number') out.push(`${k} = ${v}`);
    else out.push(`${k} = ${tomlString(String(v))}`);
  }
  if (coverEntries) {
    out.push('', '[cover]');
    for (const [k, v] of Object.entries(coverEntries)) out.push(`  ${k} = ${tomlString(String(v))}`);
  }
  out.push('+++', '');
  return out.join('\n');
}

// ---------- Workers AI 调用 ----------

function cfRestAvailable() {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
}

async function runModel(bodyObj) {
  const payload = JSON.stringify({ temperature: 0.2, ...bodyObj });
  let stdout;
  if (cfRestAvailable()) {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      },
    );
    stdout = await res.text();
  } else {
    // 本地回退：借 cf CLI 的 OAuth 登录态
    const dir = mkdtempSync(join(tmpdir(), 'cf-ai-'));
    const bodyFile = join(dir, 'body.json');
    writeFileSync(bodyFile, payload);
    const r = spawnSync('cf', ['ai', 'run', MODEL, '--body', `@${bodyFile}`, '-q'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (r.error) {
      throw new Error(
        `无法调用 Workers AI：既没有 CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID 环境变量，` +
          `本地也没有可用的 cf CLI（${r.error.message}）。\n` +
          `CI 请配置仓库 Secrets，本地请先 cf login。`,
      );
    }
    stdout = r.stdout;
    if (r.status !== 0) throw new Error(`cf ai run 失败（exit ${r.status}）：${r.stderr.slice(0, 500)}`);
  }

  let env;
  try {
    env = JSON.parse(stdout);
  } catch {
    throw new Error(`Workers AI 返回非 JSON：${stdout.slice(0, 300)}`);
  }
  if (env.success === false || env.errors?.length) {
    throw new Error(`Workers AI 错误：${String(JSON.stringify(env.errors ?? env)).slice(0, 500)}`);
  }
  // 响应形态实测有四种（REST: result 直接是 completion；cf CLI: result.response 包一层；
  // 老模型: result.response 是纯字符串；偶发: 裸 completion 无信封）——按序取第一个命中的
  const container = env.result ?? env;
  const usage = container.usage ?? env.usage;
  const resp = container.response;
  const text =
    (typeof resp === 'string' ? resp.trim() : undefined)
    ?? resp?.choices?.[0]?.message?.content
    ?? container.choices?.[0]?.message?.content
    ?? env.choices?.[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error(`Workers AI 响应缺 content：${String(JSON.stringify(container) ?? '').slice(0, 300)}`);
  }
  return { text, usage };
}

function extractJSON(text) {
  let t = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s === -1 || e === -1 || e <= s) {
    throw new Error(`输出中没有 JSON 对象（原文前 200 字：${text.slice(0, 200).replace(/\s+/g, ' ')}）`);
  }
  return JSON.parse(t.slice(s, e + 1));
}

function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

async function translateFieldsOnce(lang, payload, zhBody) {
  const slim = {
    title: payload.title,
    description: payload.description,
    categories: payload.categories,
    tags: payload.tags,
    cover_alt: payload.cover_alt,
    cover_caption: payload.cover_caption,
    body: zhBody.slice(0, 2000), // 供 description 为 null 时概括用
  };
  const { text, usage } = await runModel({
    max_tokens: MAX_TOKENS_FIELDS,
    messages: [
      { role: 'system', content: LANG_FIELDS_PROMPT[lang] },
      { role: 'user', content: JSON.stringify(slim) },
    ],
  });
  return { data: extractJSON(stripThinking(text)), usage };
}

async function translateBodyOnce(lang, body) {
  const { text, usage } = await runModel({
    max_tokens: MAX_TOKENS_BODY,
    messages: [
      { role: 'system', content: LANG_BODY_PROMPT[lang] },
      { role: 'user', content: body },
    ],
  });
  return { text: stripThinking(text), usage };
}

// 失败各重试一次
async function translateWithRetry(lang, payload, zhBody) {
  let fields, body, usage = {};
  try {
    ({ data: fields, usage: usage.f } = await translateFieldsOnce(lang, payload, zhBody));
  } catch (err) {
    console.warn(`  ⚠ ${lang} 字段翻译失败（${String(err.message).slice(0, 120)}），重试…`);
    ({ data: fields, usage: usage.f } = await translateFieldsOnce(lang, payload, zhBody));
  }
  try {
    ({ text: body, usage: usage.b } = await translateBodyOnce(lang, payload.body));
  } catch (err) {
    console.warn(`  ⚠ ${lang} 正文翻译失败（${String(err.message).slice(0, 120)}），重试…`);
    ({ text: body, usage: usage.b } = await translateBodyOnce(lang, payload.body));
  }
  const total = (usage.f?.prompt_tokens ?? 0) + (usage.f?.completion_tokens ?? 0)
    + (usage.b?.prompt_tokens ?? 0) + (usage.b?.completion_tokens ?? 0);
  return { fields, body, totalTokens: total };
}

// ---------- 主逻辑 ----------

function strArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

function sourceHash(model, parts) {
  return createHash('sha256').update(`${PROMPT_VERSION}|${model}|${JSON.stringify(parts)}`).digest('hex');
}

function listZhPosts() {
  if (!existsSync(ZH_POSTS)) return [];
  return readdirSync(ZH_POSTS)
    .filter((f) => f.endsWith('.md') && f !== '_index.md')
    .sort();
}

function targetPath(lang, name) {
  return join(ROOT, 'content', lang, 'posts', name);
}

function isMachineGenerated(parsed) {
  return parsed && typeof parsed.fm[MACHINE_KEY] === 'string' && parsed.fm[MACHINE_KEY].length > 0;
}

function setDraftFlag(file, raw, flag) {
  // 只翻 draft 行的布尔值，其余内容不动
  const re = /^draft\s*=\s*(true|false)/m;
  if (re.test(raw)) return raw.replace(re, `draft = ${flag}`);
  return raw.replace(/^\+\+\+[ \t]*$/m, `+++\ndraft = ${flag}`);
}

async function main() {
  const mode = cfRestAvailable() ? `REST（account ${process.env.CLOUDFLARE_ACCOUNT_ID.slice(0, 6)}…）` : '本地 cf CLI';
  console.log(`模型 ${MODEL} · 认证 ${mode}${DRY_RUN ? ' · DRY-RUN' : ''}${FORCE ? ' · FORCE' : ''}`);
  let apiCalls = 0;
  let failures = 0;

  // ---------- Pass A：为每篇 zh 文章创建/更新 ja/en 译文 ----------
  for (const name of listZhPosts()) {
    const raw = readFileSync(join(ZH_POSTS, name), 'utf8');
    const src = parsePost(raw);
    if (!src) {
      console.log(`- 跳过 ${name}（无法解析 front matter）`);
      continue;
    }
    if (src.fm.auto_translate === false) {
      console.log(`- 跳过 ${name}（auto_translate = false）`);
      continue;
    }
    if (src.fm.draft === true) {
      console.log(`- 跳过 ${name}（zh 源为 draft，不翻译）`);
      continue;
    }
    const body = src.body.trim();
    if (!body) {
      console.log(`- 跳过 ${name}（正文为空）`);
      continue;
    }

    const base = basename(name, '.md');
    const zhLink = `/zh/posts/${base}/`;
    const hash = sourceHash(MODEL, [
      body, src.fm.title ?? '', src.fm.description ?? '',
      strArray(src.fm.categories), strArray(src.fm.tags),
      src.fm['cover.alt'] ?? '', src.fm['cover.caption'] ?? '',
    ]);

    for (const lang of LANGS) {
      const tPath = targetPath(lang, name);
      const existing = existsSync(tPath) ? parsePost(readFileSync(tPath, 'utf8')) : null;

      if (existing && !isMachineGenerated(existing)) {
        console.log(`- 跳过 ${lang}/${name}（人工手写译文，不触碰）`);
        continue;
      }
      if (existing && !FORCE && existing.fm[MACHINE_KEY] === hash) {
        if (existing.fm.draft !== src.fm.draft) {
          // 只有可见性不同步：翻 draft 行即可，不花 API
          console.log(`~ 同步 ${lang}/${name} draft ${existing.fm.draft} → ${src.fm.draft}`);
          if (!DRY_RUN) writeFileSync(tPath, setDraftFlag(tPath, readFileSync(tPath, 'utf8'), src.fm.draft));
        } else {
          console.log(`= 跳过 ${lang}/${name}（source_hash 一致）`);
        }
        continue;
      }
      if (DRY_RUN) {
        console.log(`? ${lang}/${name} 将调用 API 重译`);
        continue;
      }
      if (existing && FORCE && existing.fm[MACHINE_KEY] === hash) {
        console.log(`! 强制重译 ${lang}/${name}`);
      }

      const payload = {
        title: String(src.fm.title ?? ''),
        description: src.fm.description != null && String(src.fm.description).trim() !== ''
          ? String(src.fm.description) : null,
        categories: strArray(src.fm.categories),
        tags: strArray(src.fm.tags),
        cover_alt: src.fm['cover.alt'] != null ? String(src.fm['cover.alt']) : null,
        cover_caption: src.fm['cover.caption'] != null ? String(src.fm['cover.caption']) : null,
        body,
      };

      try {
        const { fields, body: tBodyRaw, totalTokens } = await translateWithRetry(lang, payload, body);
        apiCalls += 2; // 字段 + 正文各一次
        const tTitle = String(fields.title ?? payload.title).trim() || payload.title;
        const tDesc = fields.description == null ? '' : String(fields.description).trim();
        const tCats = strArray(fields.categories);
        const tTags = strArray(fields.tags);
        const tAlt = fields.cover_alt == null ? null : String(fields.cover_alt).trim();
        const tCap = fields.cover_caption == null ? null : String(fields.cover_caption).trim();
        const tBody = tBodyRaw.trim();
        if (!tBody) throw new Error('译文 body 为空');

        // 重建 front matter：翻译字段取译文，其余源字段原样复制
        const fm = {
          lang,
          title: tTitle,
          date: src.fm.date ?? '',
          draft: Boolean(src.fm.draft),
          [MACHINE_KEY]: hash,
          description: tDesc,
          categories: tCats,
          tags: tTags,
        };
        for (const [k, v] of Object.entries(src.fm)) {
          const topKey = k.split('.')[0];
          if (DROP_KEYS.includes(topKey) || TRANSLATED_KEYS.includes(k) || topKey === 'cover') continue;
          if (v === undefined || v === null) continue;
          fm[k] = v;
        }
        const coverEntries = {};
        if (src.fm['cover.image'] !== undefined) coverEntries.image = src.fm['cover.image'];
        if (tAlt) coverEntries.alt = tAlt;
        if (tCap) coverEntries.caption = tCap;

        const content = serializeFM(fm, Object.keys(coverEntries).length ? coverEntries : null)
          + DISCLAIMER[lang](zhLink)
          + tBody + '\n';

        const tok = totalTokens ? `（${totalTokens} tok）` : '';
        console.log(`+ ${DRY_RUN ? '将写入' : '写入'} ${lang}/${name} ${tok}`);
        if (!DRY_RUN) writeFileSync(tPath, content);
      } catch (err) {
        failures++;
        console.error(`✗ ${lang}/${name} 翻译失败：${err.message}`);
      }
    }
  }

  // ---------- Pass B：孤儿/下架处理（只针对机翻文件） ----------
  for (const lang of LANGS) {
    const dir = join(ROOT, 'content', lang, 'posts');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.md') && x !== '_index.md')) {
      const tPath = join(dir, f);
      const parsed = parsePost(readFileSync(tPath, 'utf8'));
      if (!isMachineGenerated(parsed)) continue; // 人工手写文件永不删除
      const zhRaw = join(ZH_POSTS, f);
      if (!existsSync(zhRaw)) {
        console.log(`- 删除孤儿机翻 ${lang}/${f}（zh 源已不存在）`);
        if (!DRY_RUN) unlinkSync(tPath);
      } else {
        const zhSrc = parsePost(readFileSync(zhRaw, 'utf8'));
        if (zhSrc?.fm.draft === true && parsed.fm.draft !== true) {
          console.log(`~ 下架 ${lang}/${f}（zh 源已转 draft）`);
          if (!DRY_RUN) writeFileSync(tPath, setDraftFlag(tPath, readFileSync(tPath, 'utf8'), true));
        }
      }
    }
  }

  console.log(`\n完成：${apiCalls} 次 API 调用，${failures} 个失败`);
  if (failures > 0) process.exit(1);
}

await main();
