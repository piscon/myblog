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
//   - Markdown 占位符保护：围栏/链接 URL/行内代码/骨架标记替换为 «n» 后模型只译散文，
//     译后校验每个占位符恰好一次且位置合法（缺/重/越位即重试），再做结构计数保险丝；
//     模型接触不到语法，链接打散/标记吞入在架构上不可能发生
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
const PROMPT_VERSION_BODY = 'v4';   // 正文提示词（占位符保护 + 简化规则；改动使旧译文 hash 失配，全量重译一次）
const PROMPT_VERSION_FIELDS = 'v4'; // 字段提示词（/no_think + json_schema）
const MAX_TOKENS_FIELDS = 2000;
const MAX_TOKENS_BODY = 6000;
const REST_TIMEOUT_MS = 180_000;
const SPAWN_TIMEOUT_MS = 240_000;
const RETRY_BACKOFF_MS = [2000, 8000];
const GATEWAY = process.env.AI_GATEWAY || ''; // AI Gateway 名称；空 = 直连

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const SELF_TEST = process.argv.includes('--self-test');

const MACHINE_KEY = 'source_hash';
const FIELDS_HASH_KEY = 'source_fields_hash';
const DROP_KEYS = ['lang', 'lastmod', 'aliases', 'auto_translate', MACHINE_KEY, FIELDS_HASH_KEY];
const TRANSLATED_KEYS = ['title', 'description', 'categories', 'tags'];

const DISCLAIMER = {
  ja: (link) => `> 本記事はAIによる自動翻訳です。表現が不自然な場合は[中国語の原文](${link})をご参照ください。\n\n`,
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
// zh 摘要缺失时自动补写（写回 zh front matter；用户可在 CMS 改写，改后 fHash 失配自动重译三语字段）
const DESC_PROMPT = `用 70-160 个汉字为这篇中文博客文章写一段 SEO 摘要。要求：单行纯文本；不要引号、Markdown、换行或任何解释；第一句概括文章核心（搜索结果只展示前约 80 字）；客观自然，不夸张推销。/no_think`;

async function genDescription(body) {
  return withRetry('摘要 zh', async () => {
    const { text, usage } = await runModel({
      max_tokens: 300,
      messages: [
        { role: 'system', content: DESC_PROMPT },
        { role: 'user', content: body.slice(0, 4000) },
      ],
    });
    let t = stripThinking(text).split('\n').filter((x) => x.trim())[0]?.trim() ?? '';
    t = t.replace(/^["'「『]+|["'」』]+$/g, '').trim();
    if (!t) throw new Retry('摘要空响应');
    if (t.length < 40 || t.length > 200) throw new Retry(`摘要长度 ${t.length} 超出 40-200 容差`);
    return { desc: t, neurons: usage?.neurons };
  });
}

// 在 front matter 范围内补写/替换 description 行（空行替换、date 后插入，均不越界进正文）
function upsertDescriptionLine(raw, desc) {
  const lines = raw.split('\n');
  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (/^\+\+\+[ \t]*\r?$/.test(lines[i])) { fmEnd = i; break; }
  }
  if (fmEnd === -1) return raw;
  const newLine = `description = ${tomlString(desc)}`;
  let dateIdx = -1;
  for (let i = 0; i < fmEnd; i++) {
    if (/^description[ \t]*=/.test(lines[i])) { lines[i] = newLine; return lines.join('\n'); }
    if (dateIdx === -1 && /^date[ \t]*=/.test(lines[i])) dateIdx = i;
  }
  if (dateIdx !== -1) lines.splice(dateIdx + 1, 0, newLine);
  else lines.splice(1, 0, newLine);
  return lines.join('\n');
}

// 正文调用：Markdown 语法在 protectBody 里已被替换为占位符，模型只看到自然语言 + 编号 token。
// 规则因此极简——可靠性不依赖模型「听话」，而依赖「模型根本接触不到语法」。
const LANG_BODY_PROMPT = {
  ja: `你是个人技术博客的专业翻译。把用户文本中的中文译成自然的日语（です・ます体）。/no_think
- 保持 «0» 这类编号标记原样、位置不变、每个恰好出现一次
- 只输出译文，不要解释、不要代码围栏、不要新增或删除标记
- 中文必须全部译出；「中文」译作「中国語」`,
  en: `You are a professional translator for a personal tech blog. Translate the Chinese in the user text into natural English. /no_think
- Keep tokens like «0» verbatim, in place, each appearing exactly once
- Output ONLY the translation — no explanations, no code fences, no added or removed tokens
- All Chinese must be translated`,
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
    // Gateway 认证（新建 gateway 强制开启）：官方约定 provider-native 端点上
    // gateway token 放 cf-aig-authorization 头，Authorization 保留上游供应商凭据
    // （转发给 Workers AI 计费到本账户）。缺 AI_GATEWAY_TOKEN 时 gateway 会 401。
    const headers = {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
    if (GATEWAY && process.env.AI_GATEWAY_TOKEN) {
      headers['cf-aig-authorization'] = `Bearer ${process.env.AI_GATEWAY_TOKEN}`;
    } else if (GATEWAY) {
      console.warn('  ⚠ AI_GATEWAY 已设置但缺 AI_GATEWAY_TOKEN（gateway 强制认证），请求将被 401 拒绝');
    }
    let res;
    try {
      res = await fetch(host, {
        method: 'POST',
        headers,
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

// ---------- Markdown 占位符保护（可靠性核心，2026-11-05 落地）----------
//
// 做法：按块解析 Markdown，把所有「机器语法」替换为 «n» 占位符，模型只看到
// 自然语言 + 编号；译后机械还原并验证。模型接触不到 [](), 列表标记、URL、
// 代码围栏，因此「链接打散 / 标记吞入链接文字」这类事故物理上不可能发生
// （社区共识：引擎永远看不到不该动的东西，就不需要恳求它别动）。
//
// 保护粒度（对照本仓库实际语料定）：
//   - 围栏代码块：整块一个 token，不进模型
//   - 骨架行（标题/列表/引用/表格分隔行）：整行分块，行首标记、行尾标记
//     （斜体/粗体收尾、表格尾 |）各一个 token，可译文字居中
//   - 行内：链接与图片（仅 URL 部分保护，文字可译）、行内代码、裸粗体/斜体标记
//   每类语法用一对 token 表达，还原时校验配对与位置（吞入/移动/改写都会被门拦下）。
const TOK = (id) => `«${id}»`;
const TOK_RE = /«(\d+)»/g;

// 把一行文本按「行内原子」切分：URL/图片目标、行内代码、链接文字边界、粗斜体开关。
// 返回 [{ t: 'text'|'tok', v }]，tok 的 v 是要保护的字面串。
function inlineAtoms(line) {
  const atoms = [];
  // 管道符一律保护（表格列分隔 / 分隔行）；围栏内字符不会走到这里
  const re = /(!?\[[^\]]*\]\()([^)\s]+)(\))|(`[^`\n]+`)|(\*\*|~~)|(\*|_|\||-+)/g;
  let last = 0;
  for (const m of line.matchAll(re)) {
    if (m.index > last) atoms.push({ t: 'text', v: line.slice(last, m.index) });
    if (m[1] !== undefined) {
      // 链接/图片：仅保护 [文字]( 与 )(URL 部分)；文字留在可译区
      atoms.push({ t: 'tok', v: m[1] });
      atoms.push({ t: 'tok', v: m[2] });
      atoms.push({ t: 'tok', v: m[3] });
    } else {
      atoms.push({ t: 'tok', v: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) atoms.push({ t: 'text', v: line.slice(last) });
  return atoms;
}

// 骨架行解析：返回 { lead, core, tail }，首尾为受保护的标记，core 可译。
function skeletonLine(line) {
  const lead = line.match(/^(\s*(?:#{1,6}\s+|\d+\.\s+|[-*+]\s+|>\s*|\|?))?/)[1] ?? '';
  let rest = line.slice(lead.length);
  let tail = '';
  // 行尾收尾标记（成对强调的闭符号、表格尾竖线）；逐层剥离
  const tailRe = /(\s*(?:\*\*|~~|\*|_|\|))$/;
  let tm;
  while ((tm = rest.match(tailRe))) { tail = tm[1] + tail; rest = rest.slice(0, -tm[1].length); }
  return { lead, core: rest, tail };
}

function protectBody(src) {
  const tokens = [];
  // kind 决定还原时的位置约束：lead/tail 是骨架标记（必须贴行首/行尾），
  // inline/fence 是行内原子（只要求存在且不跨行，不要求贴边）。
  const push = (v, kind) => { tokens.push({ v, kind }); return TOK(tokens.length - 1); };
  const lines = src.split('\n');
  let out = '';
  let fence = null; // 当前围栏块累积内容
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const eol = li < lines.length - 1 ? '\n' : '';
    if (fence !== null) {
      fence.push(line);
      if (/^```[ \t]*$/.test(line.trim())) {
        out += push(fence.join('\n'), 'fence') + eol;
        fence = null;
      }
      continue;
    }
    if (/^\s*```/.test(line)) { fence = [line]; continue; } // 开围栏（含 info string）
    if (/^\s*$/.test(line)) { out += eol; continue; }

    const sk = skeletonLine(line);
    if (sk.lead) out += push(sk.lead, 'lead');
    for (const a of inlineAtoms(sk.core)) out += a.t === 'tok' ? push(a.v, 'inline') : a.v;
    if (sk.tail) out += push(sk.tail, 'tail');
    out += eol;
  }
  if (fence !== null) out += push(fence.join('\n'), 'fence'); // 未闭合围栏：整块保护，不静默丢弃
  return { text: out, tokens };
}

// 还原：每个 token 恰好出现一次（Translatorio 式「占位符完整性」），且位置合法。
// 任何异常抛 Retry → 重试 → 仍失败则该篇不落盘（旧译文原地保留）。
function restoreBody(protectedText, translated, tokens) {
  const seen = new Map();
  for (const m of translated.matchAll(TOK_RE)) {
    const id = Number(m[1]);
    if (id >= tokens.length) throw new Retry(`占位符越界 «${id}»`);
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  const missing = tokens.map((_, i) => i).filter((i) => !seen.has(i));
  const dup = [...seen].filter(([, n]) => n > 1).map(([i]) => i);
  if (missing.length || dup.length) {
    throw new Retry(`占位符不完整（缺失 ${missing.length}${missing.length ? ':' + missing.slice(0, 5).join(',') : ''}，重复 ${dup.length}${dup.length ? ':' + dup.slice(0, 5).join(',') : ''}）`);
  }
  // 位置约束：骨架 lead 必须贴行首、tail 必须贴行尾（吞入/位移/合并到别的行都会被抓）。
  const lines = translated.split('\n');
  for (const line of lines) {
    for (const m of line.matchAll(TOK_RE)) {
      const id = Number(m[1]);
      const { v, kind } = tokens[id];
      const at = line.indexOf(TOK(id));
      if (kind === 'lead' && at !== 0) throw new Retry(`骨架标记 «${id}»(${JSON.stringify(v)}) 脱离行首`);
      if (kind === 'tail' && at + TOK(id).length !== line.length) throw new Retry(`收尾标记 «${id}»(${JSON.stringify(v)}) 脱离行尾`);
    }
  }
  return translated.replace(TOK_RE, (_, id) => tokens[Number(id)].v);
}

// 结构 QA 门：占位符还原后对最终 Markdown 做计数比对（保险丝，零 token 成本）。
// 链接/列表/标题/围栏计数守恒 + 链接文字卫生检查
function structuralIssues(src, dst) {
  const issues = [];
  const count = (s, re) => (s.match(re) || []).length;
  const links = (s) => count(s, /\]\(/g);
  const heads = (s) => count(s, /^#{1,6} /gm);
  const fences = (s) => count(s, /^```/gm);
  const lists = (s) => count(s, /^ {0,3}(?:\d+\. |[-*+] )/gm);
  const badLinks = (s) => [...s.matchAll(/\[([^\]]*)\]\([^)]+\)/g)]
    .filter((m) => /^\d+\. |[*]/.test(m[1])).length;
  if (links(dst) < links(src)) issues.push(`行内链接 ${links(src)}→${links(dst)}`);
  if (heads(src) !== heads(dst)) issues.push(`标题 ${heads(src)}→${heads(dst)}`);
  if (fences(src) !== fences(dst)) issues.push(`代码围栏 ${fences(src)}→${fences(dst)}`);
  if (lists(src) !== lists(dst)) issues.push(`列表项 ${lists(src)}→${lists(dst)}`);
  if (badLinks(dst) > badLinks(src)) issues.push(`链接文字吞入列表/斜体标记 ${badLinks(src)}→${badLinks(dst)}`);
  return issues;
}

const TOKEN_REMINDER =
  '\n\n（重要：上一版输出弄丢了编号标记。«0» 这类标记必须原样保留、位置不变、每个恰好出现一次；不要翻译、改写、增删或合并它们。）';

async function translateBody(lang, srcBody) {
  const { text: protectedText, tokens } = protectBody(srcBody);
  return withRetry(`正文 ${lang}`, async (attempt) => {
    const { text, usage } = await runModel({
      max_tokens: MAX_TOKENS_BODY + (attempt - 1) * 3000, // 截断重试时自动加预算
      messages: [
        { role: 'system', content: LANG_BODY_PROMPT[lang] },
        { role: 'user', content: attempt >= 2 ? protectedText + TOKEN_REMINDER : protectedText },
      ],
    });
    let t = stripThinking(text);
    if (!t) throw new Retry('正文空响应');
    t = restoreBody(protectedText, t, tokens); // 完整性门：缺/重复/越位即重试，绝不落盘
    // 保险丝：还原后的最终 Markdown 与原文做结构计数比对（正常路径下恒过）
    const issues = structuralIssues(srcBody, t);
    if (issues.length) throw new Retry(`结构 QA 门未过（${issues.join('，')}）`);
    return { body: t, neurons: usage?.neurons };
  });
}

// ---------- 离线自测（--self-test，零 API 调用）----------
// 1) 全语料往返：protect → 模拟「只翻译文字、token 原样保留」→ restore 必须与原文逐字一致
// 2) 合成损伤：删除/重复/移动占位符必须被完整性门拦下
function selfTest() {
  let fails = 0;
  const check = (ok, label) => { if (!ok) { fails++; console.error(`✗ ${label}`); } };

  const files = listZhPosts();
  for (const name of files) {
    const parsed = parsePost(readFileSync(join(ZH_POSTS, name), 'utf8'));
    if (!parsed) continue;
    const src = parsed.body.trim();
    const { text, tokens } = protectBody(src);
    // ① 恒等往返：token 原样保留 → restore 后必须逐字等于原文
    const identical = restoreBody(text, text, tokens);
    check(identical === src, `${name}：恒等往返不一致`);
    // ② 模拟译文：把非 token 文字换成等长假译文，token 全部原样保留 →
    //    还原后结构计数必须与原文守恒（保险丝在正常路径下恒过）
    const fake = text.replace(/[^\n«»0-9]+/g, (s) => '訳'.repeat(Math.max(1, Math.ceil(s.length / 2))).slice(0, s.length));
    const rebuilt = restoreBody(text, fake, tokens);
    check(!rebuilt.match(TOK_RE), `${name}：还原后残留占位符`);
    const issues = structuralIssues(src, rebuilt);
    check(issues.length === 0, `${name}：模拟译文触发结构门 ${issues.join('，')}`);
    console.log(`✓ ${name}：${tokens.length} 个占位符，恒等往返/模拟译文/结构门全通`);
  }

  // 合成损伤样本：逐一验证完整性门
  const sample = '1. *感谢 [Hugo](https://gohugo.io) 提供代码支持*';
  const p = protectBody(sample);
  const good = p.text.replace(/[^«»\d\n]+/g, 'x');
  const firstTok = p.text.match(TOK_RE)[0];
  const drop = good.replace(firstTok, '');
  const dup = good.replace(firstTok, (t) => t + t);
  const moved = good.replace(firstTok, '') + firstTok; // lead 标记被挪到行尾 → 应被位置门拦下
  check(restoreBody(p.text, good, p.tokens) !== '', '合成样本：正常路径应可还原');
  for (const [label, bad] of [['缺失', drop], ['重复', dup], ['位移', moved]]) {
    let threw = false;
    try { restoreBody(p.text, bad, p.tokens); } catch { threw = true; }
    check(threw, `合成样本：${label} 占位符应被拦下`);
  }

  // 旧事故等价形态（2026-11-05）：lead 标记被吞进链接文字 / 收尾标记挪进句中 /
  // token 越界——在新架构下必须是「位移/完整性门」拦截，正常路径必须放行
  const accidentSrc = '1. *感谢 [Hugo](https://gohugo.io) 提供代码支持*';
  const ap = protectBody(accidentSrc);
  const leadMoved = ap.text.replace(/(«\d+»)(«\d+»)(感谢)/, '$2$3$1'); // lead 从行首挪进文字
  const tailTok = ap.text.match(/(«\d+»)$/)[1];
  const tailMoved = ap.text.replace(tailTok, '').replace(/代码支持/, tailTok + '代码支持');
  const outOfRange = ap.text + TOK(999);
  for (const [label, bad] of [['lead 位移', leadMoved], ['收尾标记位移', tailMoved], ['越界 token', outOfRange]]) {
    let threw = false;
    try { restoreBody(ap.text, bad, ap.tokens); } catch { threw = true; }
    check(threw, `旧事故等价：${label} 应被拦下`);
  }
  const normal = ap.text.replace(/[^\n«»\d]+/g, 'x');
  let normalOk = true;
  try { restoreBody(ap.text, normal, ap.tokens); } catch { normalOk = false; }
  check(normalOk, '旧事故等价：正常译文路径应放行');

  console.log(fails ? `\n自测失败 ${fails} 项` : '\n自测全部通过');
  if (fails) process.exit(1);
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

// CMS 里 boolean 可能被序列化成字符串，true/'true' 都认
const isTrue = (v) => v === true || v === 'true';
// 译文锁定 = 视同人工稿件（CMS 的 translation_lock 开关），永不覆盖/删除/同步
const isLocked = (parsed) => parsed && isTrue(parsed.fm.translation_lock);

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
    if (src.fm.auto_translate === false || src.fm.auto_translate === 'false'
      || isTrue(src.fm.no_translate)) {
      console.log(`- 跳过 ${name}（已退出自动翻译）`);
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

    // zh SEO 摘要缺失 → AI 补写并写回 zh front matter（失败回退为缺失，由各语言自行生成）
    let zhDescription = String(src.fm.description ?? '').trim();
    if (!zhDescription) {
      if (DRY_RUN) {
        console.log(`? zh/${name} 将补写 SEO 摘要`);
      } else {
        try {
          const r = await genDescription(body);
          zhDescription = r.desc;
          neuronsTotal += r.neurons ?? 0;
          apiCalls += 1;
          writeFileSync(join(ZH_POSTS, name), upsertDescriptionLine(raw, zhDescription));
          console.log(`+ zh 摘要已补写（${zhDescription.length} 字）→ ${name}`);
        } catch (err) {
          console.error(`⚠ ${name} zh 摘要补写失败（不影响译文生成）：${shortErr(err)}`);
        }
      }
    }

    const base = basename(name, '.md');
    const zhLink = `/zh/posts/${base}/`;
    const bHash = bodyHashOf(body);
    const fParts = {
      title: String(src.fm.title ?? ''),
      description: zhDescription,
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
      if (existing && isLocked(existing)) {
        console.log(`- 跳过 ${lang}/${name}（译文已锁定，视同人工稿件）`);
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
      if (!isMachineGenerated(parsed) || isLocked(parsed)) continue; // 人工手写/已锁定文件永不删除
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

if (SELF_TEST) selfTest();
else await main();
