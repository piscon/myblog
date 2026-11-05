#!/usr/bin/env node
// AI 翻译流水线：content/zh/posts/*.md → content/{ja,en}/posts/<同名>.md
//
// 用法：node scripts/translate.mjs [--dry-run] [--force]
//   --dry-run  只打印将发生什么，不调 API、不写文件
//   --force    忽略 hash 一致性，机翻文件强制重译（人工手写文件仍然永不触碰）
//
// 认证双模式（自动选择）：
//   1) env 有 CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID → Workers AI REST 直连（CI 用；
//      设了 AI_GATEWAY 环境变量时经 AI Gateway 走，获得请求日志与 7 天响应缓存）
//   2) 否则回退本地 `cf ai run` 子进程（cf CLI OAuth 登录态，本地开发用）
//
// 可靠性设计（2026-11-05 社区实践对照后加固）：
//   - 字段调用带 response_format json_schema 强约束（qwen3 实测支持；报「JSON Mode couldn't
//     be met」时自动降级为纯解析模式，该语言本次会话内不再尝试 schema）
//   - finish_reason 守卫：length = 正文被 max_tokens 静默截断，重试时自动加预算
//   - REST 180s / cf 子进程 240s 超时，防挂死
//   - 瞬态错误（429/5xx/网络）指数退避 2s/8s；内容错误（空响应/JSON 解析失败）快速重试；
//     403/400 等致命错误直接失败
//   - 部分(文件,语言)失败不再拖垮全部：成功部分照常写入提交，失败计数写入 GITHUB_OUTPUT，
//     由 workflow 的红牌步骤决定 run 是否标红（重跑时 hash 命中的部分不再计费）
//   - 译文结构 QA 门：链接/标题/代码围栏计数与原文比对，缩水即重试，零 token 成本
//
// 增量机制（字段与正文拆分，互不连坐）：
//   - front matter `source_hash` = 正文 hash（PROMPT_VERSION_BODY + MODEL + body）
//   - front matter `source_fields_hash` = 字段 hash（PROMPT_VERSION_FIELDS + MODEL + 字段集）
//   - 改正文不动摘要 → 只重译正文；CMS 里改 description/tags → 只重译字段
//   - 旧版合并 hash 文件下次源变更时整体重译一次，自动迁移到拆分键
//
// 人工保护：目标文件存在但没有 source_hash = 人工手写，永不覆盖、永不删除。
// 人工校对后的机翻文件：hash 不变，只要中文原文不动就不会被重译。

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, mkdtempSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const ZH_POSTS = join(ROOT, 'content/zh/posts');
const LANGS = ['ja', 'en'];

const MODEL = process.env.TRANSLATE_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8';
const PROMPT_VERSION_BODY = 'v3';   // 正文提示词（两段式 + /no_think）
const PROMPT_VERSION_FIELDS = 'v4'; // 字段提示词（/no_think + json_schema）
const MAX_TOKENS_FIELDS = 2000;
const MAX_TOKENS_BODY = 6000;
const REST_TIMEOUT_MS = 180_000;
const SPAWN_TIMEOUT_MS = 240_000;
const RETRY_BACKOFF_MS = [2000, 8000];
const GATEWAY = process.env.AI_GATEWAY || ''; // AI Gateway 名称；空 = 直连

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const MACHINE_KEY = 'source_hash';
const FIELDS_HASH_KEY = 'source_fields_hash';
const DROP_KEYS = ['lang', 'lastmod', 'aliases', 'auto_translate', MACHINE_KEY, FIELDS_HASH_KEY];
const TRANSLATED_KEYS = ['title', 'description', 'categories', 'tags'];

const DISCLAIMER = {
  ja: (link) => `> 本記事はAIによる自動翻訳です。表現が不自然な場合は[中文の原文](${link})をご参照ください。\n\n`,
  en: (link) => `> This article was machine-translated by AI and may contain inaccuracies. See the [Chinese original](${link}) for the authoritative version.\n\n`,
};

// 字段调用走 json_schema 强约束（qwen3 实测支持 response_format）
const FIELDS_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    categories: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    cover_alt: { type: ['string', 'null'] },
    cover_caption: { type: ['string', 'null'] },
  },
  required: ['title', 'description', 'categories', 'tags', 'cover_alt', 'cover_caption'],
};

const LANG_FIELDS_PROMPT = {
  ja: `把 JSON 中 title/description/categories/tags/cover_alt/cover_caption 的中文翻译成自然的日语（です・ます体）。规则：title 简洁；description 1-2 句完整句（源为 null 时根据 body 概括写出）；categories/tags 用日语惯用词，专有名词（AI、Hugo 等）保留原文；cover_alt/cover_caption 源为 null 输出 null。只输出一个合法 JSON 对象，键与输入一致。/no_think`,
  en: `Translate the Chinese in the JSON fields title/description/categories/tags/cover_alt/cover_caption into natural English. Rules: title concise; description 1-2 full sentences (if null, summarize from body); categories/tags use common English equivalents, keep proper nouns (AI, Hugo) as-is; cover_alt/cover_caption output null if null. Output ONLY one valid JSON object with the same keys. /no_think`,
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

// ---------- 错误分类 ----------
// transient=true → 指数退避重试；内容错误（空响应/解析失败/截断）→ 快速重试；致命 → 立即失败
class Retry extends Error {
  constructor(msg, { transient = false } = {}) {
    super(msg);
    this.transient = transient;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shortErr = (e) => String(e.message ?? e).slice(0, 140);

async function withRetry(label, fn) {
  let backoffIdx = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (err.fatal || attempt >= 3) throw err;
      const wait = err.transient ? (RETRY_BACKOFF_MS[backoffIdx++] ?? RETRY_BACKOFF_MS.at(-1)) : 500;
      console.warn(`  ⚠ ${label} 第 ${attempt} 次失败（${shortErr(err)}），${wait}ms 后重试`);
      await sleep(wait);
    }
  }
}

// ---------- TOML front matter（子集）解析 ----------

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
    return [...s.matchAll(/'([^']*)'|"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => (m[1] !== undefined ? m[1] : JSON.parse(m[0])));
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return unquote(s);
}

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
    const host = GATEWAY
      ? `https://gateway.ai.cloudflare.com/v1/${account}/${GATEWAY}/workers-ai/${MODEL}`
      : `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`;
    // Gateway 认证（新建 gateway 强制开启）要求专用 AI Gateway token，
    // 普通 API token 会被 401；未设置时回退 API token 并给出明确提示
    const bearer = GATEWAY
      ? (process.env.AI_GATEWAY_TOKEN || process.env.CLOUDFLARE_API_TOKEN)
      : process.env.CLOUDFLARE_API_TOKEN;
    if (GATEWAY && !process.env.AI_GATEWAY_TOKEN) {
      console.warn('  ⚠ AI_GATEWAY 已设置但缺 AI_GATEWAY_TOKEN：gateway 强制认证，普通 API token 会 401；请在 dashboard 创建 gateway token 并配为 Secret');
    }
    let res;
    try {
      res = await fetch(host, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(REST_TIMEOUT_MS),
      });
    } catch (err) {
      // 超时/网络错误 = 瞬态
      throw new Retry(`网络错误：${shortErr(err)}`, { transient: true });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const transient = [429, 500, 502, 503, 504].includes(res.status);
      throw new Retry(`HTTP ${res.status}：${text.slice(0, 300)}`, { transient });
    }
    stdout = await res.text();
  } else {
    const dir = mkdtempSync(join(tmpdir(), 'cf-ai-'));
    const bodyFile = join(dir, 'body.json');
    writeFileSync(bodyFile, payload);
    const r = spawnSync('cf', ['ai', 'run', MODEL, '--body', `@${bodyFile}`, '-q'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: SPAWN_TIMEOUT_MS,
    });
    if (r.error) {
      throw new Retry(
        `无法调用 Workers AI：既没有 CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID 环境变量，` +
          `本地也没有可用的 cf CLI（${r.error.message}）。CI 请配置 Secrets，本地请先 cf login。`,
        { transient: false },
      );
    }
    stdout = r.stdout;
    if (r.status !== 0) {
      const transient = r.signal === 'SIGTERM'; // 超时被杀 = 瞬态；cf 报的其他错误当致命
      throw new Retry(`cf ai run 失败（exit ${r.status}）：${String(r.stderr ?? '').slice(0, 300)}`, { transient });
    }
  }

  let env;
  try {
    env = JSON.parse(stdout);
  } catch {
    throw new Retry(`Workers AI 返回非 JSON：${stdout.slice(0, 300)}`, { transient: true });
  }
  if (env.success === false || env.errors?.length) {
    throw new Retry(`Workers AI 错误：${String(JSON.stringify(env.errors ?? env)).slice(0, 400)}`, { transient: false });
  }
  // 响应形态有四种（REST: result 直接是 completion；cf CLI: result.response 包一层；
  // 老模型: result.response 是纯字符串；偶发: 裸 completion 无信封）——按序取第一个命中的
  const container = env.result ?? env;
  const usage = container.usage ?? env.usage;
  const resp = container.response;
  const choice =
    (typeof resp === 'object' && resp !== null ? resp.choices?.[0] : undefined)
    ?? container.choices?.[0]
    ?? env.choices?.[0];
  const rawText = typeof resp === 'string' ? resp : choice?.message?.content;
  const finishReason = typeof resp === 'string' ? 'stop' : choice?.finish_reason ?? 'stop';
  if (!rawText || !rawText.trim()) {
    throw new Retry(`响应缺 content（finish_reason=${finishReason}）：${String(JSON.stringify(container) ?? '').slice(0, 200)}`);
  }
  if (finishReason === 'length') {
    throw new Retry('输出被 max_tokens 截断（finish_reason=length）');
  }
  return { text: rawText, usage };
}

function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function extractJSON(text, label) {
  let t = stripThinking(text);
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s === -1 || e === -1 || e <= s) {
    throw new Retry(`${label}：输出中没有 JSON 对象（原文前 200 字：${text.slice(0, 200).replace(/\s+/g, ' ')}）`);
  }
  return JSON.parse(t.slice(s, e + 1));
}

const fieldsJsonModeBroken = new Set(); // JSON Mode 报错的语言，本次会话内降级为纯解析

function isJsonModeError(err) {
  return /JSON Mode|response_format/i.test(String(err.message));
}

async function translateFields(lang, slim) {
  return withRetry(`字段 ${lang}`, async () => {
    const body = {
      max_tokens: MAX_TOKENS_FIELDS,
      messages: [
        { role: 'system', content: LANG_FIELDS_PROMPT[lang] },
        { role: 'user', content: JSON.stringify(slim) },
      ],
    };
    if (!fieldsJsonModeBroken.has(lang)) {
      body.response_format = { type: 'json_schema', json_schema: FIELDS_SCHEMA };
    }
    try {
      const { text, usage } = await runModel(body);
      return { data: extractJSON(text, `字段 ${lang}`), neurons: usage?.neurons };
    } catch (err) {
      if (body.response_format && isJsonModeError(err)) {
        fieldsJsonModeBroken.add(lang); // 下一轮重试自动走纯解析
        err.transient = true;
      }
      throw err;
    }
  });
}

// 结构 QA 门：链接/标题/代码围栏计数与原文比对，缩水 = 内容级失败，在 withRetry 内重试
function structuralIssues(src, dst) {
  const issues = [];
  const count = (s, re) => (s.match(re) || []).length;
  const links = (s) => count(s, /\]\(/g);
  const heads = (s) => count(s, /^#{1,6} /gm);
  const fences = (s) => count(s, /^```/gm);
  if (links(dst) < links(src)) issues.push(`行内链接 ${links(src)}→${links(dst)}`);
  if (heads(src) !== heads(dst)) issues.push(`标题 ${heads(src)}→${heads(dst)}`);
  if (fences(src) !== fences(dst)) issues.push(`代码围栏 ${fences(src)}→${fences(dst)}`);
  return issues;
}

// 链接自愈：模型偶发把 [text](url) 打散成 text（url）——按原文链接的 URL 清单机械还原。
// 只处理代码围栏/行内代码之外的部分；自愈成功可以省掉一次重译。
function healLinks(srcBody, dstBody) {
  const srcLinks = [...srcBody.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)].map((m) => m[2]);
  if (!srcLinks.length) return dstBody;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const healSegment = (seg) => {
    let out = seg;
    for (const url of srcLinks) {
      // 已是合法链接的跳过；全角/半角括号两种打散形态都还原
      const already = new RegExp(`\\[[^[\\]]*\\]\\(${esc(url)}\\)`);
      if (already.test(out)) continue;
      const flat = new RegExp(`([^[\\n（(]{1,80})[（(]${esc(url)}[）)]`, 'g');
      out = out.replace(flat, (_, text) => `[${text.trim()}](${url})`);
    }
    return out;
  };
  // 按代码围栏切分，围栏外按行内代码切分，只动普通文本
  return dstBody
    .split(/(```[\s\S]*?```)/g)
    .map((part) =>
      part.startsWith('```')
        ? part
        : part.split(/(`[^`\n]*`)/g).map((sub) => (sub.startsWith('`') ? sub : healSegment(sub))).join(''),
    )
    .join('');
}

const LINK_REMINDER =
  '\n\n（重要：上一版输出把行内链接打散了。每处链接必须保持 Markdown 语法 [文字](URL)，链接文字可翻译，括号与方括号结构不能动，URL 原样保留。）';

async function translateBody(lang, srcBody) {
  return withRetry(`正文 ${lang}`, async (attempt) => {
    const { text, usage } = await runModel({
      max_tokens: MAX_TOKENS_BODY + (attempt - 1) * 3000, // 截断重试时自动加预算
      messages: [
        { role: 'system', content: LANG_BODY_PROMPT[lang] },
        { role: 'user', content: attempt >= 2 ? srcBody + LINK_REMINDER : srcBody },
      ],
    });
    let t = stripThinking(text);
    if (!t) throw new Retry('正文空响应');
    let issues = structuralIssues(srcBody, t);
    if (issues.length) {
      t = healLinks(srcBody, t); // 先自愈（免费），再复查
      issues = structuralIssues(srcBody, t);
    }
    if (issues.length) throw new Retry(`结构 QA 门未过（${issues.join('，')}）`);
    return { body: t, neurons: usage?.neurons };
  });
}

// ---------- 增量 hash ----------

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const bodyHashOf = (body) => sha256(`${PROMPT_VERSION_BODY}|${MODEL}|${body}`);
const fieldsHashOf = (fields) => sha256(`${PROMPT_VERSION_FIELDS}|${MODEL}|${JSON.stringify(fields)}`);

// ---------- 主逻辑辅助 ----------

function strArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
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
  const re = /^draft\s*=\s*(true|false)/m;
  if (re.test(raw)) return raw.replace(re, `draft = ${flag}`);
  return raw.replace(/^\+\+\+[ \t]*$/m, `+++\ndraft = ${flag}`);
}

function stripDisclaimer(body) {
  const lines = body.split('\n');
  if (lines[0]?.startsWith('> ') && /自動翻訳|machine-translated/.test(lines[0])) {
    let i = 1;
    while (i < lines.length && lines[i].trim() === '') i++;
    return lines.slice(i).join('\n');
  }
  return body;
}

async function main() {
  const mode = cfRestAvailable()
    ? `REST（account ${process.env.CLOUDFLARE_ACCOUNT_ID.slice(0, 6)}…${GATEWAY ? `，经 Gateway ${GATEWAY}` : '，直连'}）`
    : '本地 cf CLI';
  console.log(`模型 ${MODEL} · 认证 ${mode}${DRY_RUN ? ' · DRY-RUN' : ''}${FORCE ? ' · FORCE' : ''}`);
  let apiCalls = 0;
  let failures = 0;
  let successes = 0;
  let neuronsTotal = 0;
  const failureLog = [];

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
    const bHash = bodyHashOf(body);
    const fParts = {
      title: String(src.fm.title ?? ''),
      description: String(src.fm.description ?? ''),
      categories: strArray(src.fm.categories),
      tags: strArray(src.fm.tags),
      cover_alt: src.fm['cover.alt'] ?? '',
      cover_caption: src.fm['cover.caption'] ?? '',
    };
    const fHash = fieldsHashOf(fParts);

    for (const lang of LANGS) {
      const tPath = targetPath(lang, name);
      const existing = existsSync(tPath) ? parsePost(readFileSync(tPath, 'utf8')) : null;

      if (existing && !isMachineGenerated(existing)) {
        console.log(`- 跳过 ${lang}/${name}（人工手写译文，不触碰）`);
        continue;
      }

      if (existing && !FORCE) {
        const needBody = existing.fm[MACHINE_KEY] !== bHash;
        const needFields = existing.fm[FIELDS_HASH_KEY] !== fHash;
        if (!needBody && !needFields) {
          if (existing.fm.draft !== src.fm.draft) {
            console.log(`~ 同步 ${lang}/${name} draft ${existing.fm.draft} → ${src.fm.draft}`);
            if (!DRY_RUN) writeFileSync(tPath, setDraftFlag(tPath, readFileSync(tPath, 'utf8'), src.fm.draft));
          } else {
            console.log(`= 跳过 ${lang}/${name}（hash 一致）`);
          }
          continue;
        }
        if (DRY_RUN) {
          console.log(`? ${lang}/${name} 将重译：${[needBody && '正文', needFields && '字段'].filter(Boolean).join(' + ')}`);
          continue;
        }
      } else if (DRY_RUN) {
        console.log(`? ${lang}/${name} 将${existing ? '强制重译' : '全新翻译'}`);
        continue;
      }

      // 复用策略：只重译变化的一半，另一半取现有译文
      const reuseBody = existing && existing.fm[MACHINE_KEY] === bHash ? stripDisclaimer(existing.body) : null;
      const reuseFields =
        existing && existing.fm[FIELDS_HASH_KEY] === fHash
          ? {
              title: existing.fm.title,
              description: existing.fm.description ?? '',
              categories: strArray(existing.fm.categories),
              tags: strArray(existing.fm.tags),
              cover_alt: existing.fm['cover.alt'] ?? null,
              cover_caption: existing.fm['cover.caption'] ?? null,
            }
          : null;

      try {
        const fieldsRes = reuseFields ? { data: reuseFields, neurons: 0 } : await translateFields(lang, { ...fParts, body: body.slice(0, 2000) });
        const bodyRes = reuseBody ? { body: reuseBody, neurons: 0 } : await translateBody(lang, body);
        const fields = fieldsRes.data;
        const tBodyRaw = bodyRes.body;
        apiCalls += (reuseFields ? 0 : 1) + (reuseBody ? 0 : 1);
        const neuronsUsed = (fieldsRes.neurons ?? 0) + (bodyRes.neurons ?? 0);
        neuronsTotal += neuronsUsed;

        const tTitle = String(fields.title ?? fParts.title).trim() || fParts.title;
        const tDesc = fields.description == null ? '' : String(fields.description).trim();
        const tAlt = fields.cover_alt == null ? null : String(fields.cover_alt).trim();
        const tCap = fields.cover_caption == null ? null : String(fields.cover_caption).trim();

        const fm = {
          lang,
          title: tTitle,
          date: src.fm.date ?? '',
          draft: Boolean(src.fm.draft),
          [MACHINE_KEY]: bHash,
          [FIELDS_HASH_KEY]: fHash,
          description: tDesc,
          categories: strArray(fields.categories),
          tags: strArray(fields.tags),
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
          + tBodyRaw.trim() + '\n';

        console.log(`+ 写入 ${lang}/${name}（${[reuseBody && '正文复用', reuseFields && '字段复用'].filter(Boolean).join('，') || '全译'}${neuronsUsed ? `，${neuronsUsed.toFixed(2)} neurons` : ''}）`);
        writeFileSync(tPath, content);
        successes++;
      } catch (err) {
        failures++;
        failureLog.push(`${lang}/${name}: ${shortErr(err)}`);
        console.error(`✗ ${lang}/${name} 翻译失败：${shortErr(err)}`);
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

  console.log(`\n完成：${apiCalls} 次 API 调用，${successes} 成功，${failures} 失败${neuronsTotal ? `，${neuronsTotal.toFixed(2)} neurons` : ''}`);
  if (failureLog.length) console.error('失败清单：\n- ' + failureLog.join('\n- '));

  // 部分成功也照常退出（0）：成功部分已被写入并提交，workflow 用 failures 输出标红
  if (process.env.GITHUB_OUTPUT && failures > 0) {
    appendFileSync(process.env.GITHUB_OUTPUT, `failures=${failures}\n`);
  }
  if (failures > 0 && successes === 0) process.exit(1);
}

await main();
