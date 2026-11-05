// AST 保护层（--ast 实验开关，2026-11-05）：用 remark 解析器替换 translate.mjs
// 的正则 protectBody。模型看到的不再只是语法被替换后的散文 + «n» 编号混合体，
// 而是「纯文本段 + 编号」——行内结构（粗体/斜体/链接/行内代码）的标记符也不进模型，
// 编号 token 密度大幅下降。
//
// 设计与正则层严格同构（返回 { text, tokens }，tokens 带 kind 供位置门使用）：
//   - 经 mdast 的 position 偏移量在【原文】上切片替换，绝不经过 remark-stringify
//     （其重新序列化会改列表标记/表格列宽/缩进，产生脏 diff）——逐字节保真
//   - 受保护区间：code（围栏整块）、inlineCode、link/image 的 URL 与括号部分、
//     emphasis/strong/strike 的标记符、标题前缀 #、列表标记、引用 >、
//     表格管道符与分隔行、脚注标记、任务列表复选框、html 节点
//   - 文本节点保持可译；相邻文本段之间由还原时的 token 顺序保证拼接正确
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['toml', 'yaml']);

const TOK = (id) => `«${id}»`;

// 收集一段文本的受保护区间 [start, end)。解析失败或区间越界时返回 null（调用方回退正则层）。
function protectedRanges(src) {
  let tree;
  try {
    tree = processor.parse(src);
  } catch {
    return null;
  }
  const ranges = [];
  const add = (start, end, kind) => {
    if (start == null || end == null || end <= start) return;
    if (start < 0 || end > src.length) return;
    ranges.push({ start, end, kind });
  };

  const visit = (node, depth = 0) => {
    if (!node || depth > 64) return;
    switch (node.type) {
      case 'code': {
        // 围栏整块含 ``` 行；position 覆盖整段，直接保护
        add(node.position?.start?.offset, node.position?.end?.offset, 'fence');
        return; // 内部不再遍历
      }
      case 'inlineCode':
        add(node.position?.start?.offset, node.position?.end?.offset, 'inline');
        return;
      case 'link':
      case 'image': {
        // 保护开括号段（[ 或 ![）与闭括号段（](url) 或 (url)）；中间为可译文字。
        // image 的 alt 为空时 children 为空数组——此时整个元素就是一个不可译原子。
        const s = node.position?.start?.offset, e = node.position?.end?.offset;
        if (s == null || e == null) break;
        const kids = node.children ?? [];
        const first = kids[0]?.position?.start?.offset;
        const last = kids.at(-1)?.position?.end?.offset;
        if (first == null || last == null) {
          add(s, e, 'inline'); // 空 alt / 空文字：整元素原子化
        } else {
          add(s, first, 'inline');
          add(last, e, 'inline');
        }
        break; // 继续遍历子节点（链接文字可译）
      }
      case 'emphasis':
      case 'strong':
      case 'delete': {
        // 标记符：元素边界处的 * _ ~~ 等。mdast 不给标记符精确位置，
        // 用「元素 range 减子节点 range」推：开标记 = 元素起点→首子起点，闭标记 = 末子终点→元素终点。
        const s = node.position?.start?.offset, e = node.position?.end?.offset;
        if (s == null || e == null) break;
        const kids = node.children ?? [];
        const first = kids[0]?.position?.start?.offset;
        const last = kids.at(-1)?.position?.end?.offset;
        if (first == null || last == null) {
          add(s, e, 'inline'); // 空内容：整元素原子化
        } else {
          add(s, first, 'inline');
          add(last, e, 'inline');
        }
        break;
      }
      case 'footnoteReference':
        add(node.position?.start?.offset, node.position?.end?.offset, 'inline');
        return;
      case 'footnoteDefinition': {
        // [^1]: 前缀保护；内容可译
        const s = node.position?.start?.offset;
        const first = node.children?.[0]?.position?.start?.offset;
        if (s != null && first != null) add(s, first, 'lead');
        break;
      }
      case 'heading': {
        // 前缀 # + 空格
        const s = node.position?.start?.offset;
        const first = node.children?.[0]?.position?.start?.offset;
        if (s != null && first != null) add(s, first, 'lead');
        break;
      }
      case 'listItem': {
        // 标记 "1. " / "- " / "- [x] "：起点到第一个块子节点（paragraph）起点。
        // 嵌套列表的前导缩进必须并入 lead（mdast 的 listItem.position.start
        // 是否含缩进随层级而异；统一从行首保护到首子节点），否则还原位置门会报「脱离行首」。
        const s0 = node.position?.start?.offset;
        const first = node.children?.[0]?.position?.start?.offset;
        if (s0 != null && first != null && first > s0) {
          const lineStart = src.lastIndexOf('\n', s0 - 1) + 1;
          add(lineStart, first, 'lead');
        }
        break;
      }
      case 'blockquote': {
        // 每行的 "> " 前缀无法从 AST 拿（多行引用），退化为保护首行 "> "：起点到首子起点
        const s = node.position?.start?.offset;
        const first = node.children?.[0]?.position?.start?.offset;
        if (s != null && first != null) add(s, first, 'lead');
        break;
      }
      case 'table': {
        // 整表所有管道符与分隔行保护：对每行按 position 保护「行首 |」「行尾 |」，
        // 中间的分隔管道符由 cell 边界推出（cell 起点前 1-2 字符是管道+空格）。
        // 简化：直接保护每个 tableRow position 的首尾字符与分隔行整行。
        for (const row of node.children ?? []) {
          const rs = row.position?.start?.offset, re = row.position?.end?.offset;
          if (rs == null || re == null) continue;
          const rowText = src.slice(rs, re);
          if (/^\s*\|?[\s:|-]+\|?\s*$/.test(rowText)) {
            // 分隔行 |---|---| 整行保护
            add(rs, re, 'inline');
            continue;
          }
          const cells = row.children ?? [];
          const c0 = cells[0]?.position?.start?.offset;
          const cn = cells.at(-1)?.position?.end?.offset;
          if (c0 != null) add(rs, Math.min(c0, re), 'lead');      // 行首 "| "
          if (cn != null) add(Math.max(cn, rs), re, 'tail');      // 行尾 " |"
          // 中间分隔：每个 cell（除首）之前的 " | "
          for (const cell of cells.slice(1)) {
            const cs = cell.position?.start?.offset;
            if (cs != null && cs > rs) add(Math.max(rs, cs - 2), cs, 'inline');
          }
        }
        // 继续遍历进单元格：inlineCode / link / emphasis 等行内结构在 cell 内照常保护
        break;
      }
      case 'yaml':
      case 'toml':
        add(node.position?.start?.offset, node.position?.end?.offset, 'fence');
        return;
      case 'html':
        add(node.position?.start?.offset, node.position?.end?.offset, 'fence');
        return;
      default:
        break;
    }
    for (const child of node.children ?? []) visit(child, depth + 1);
  };
  visit(tree);

  // 区间排序 + 去重叠（嵌套时内层优先：保留更细粒度；简化为按起点排序后丢弃已覆盖者）
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (const r of ranges) {
    const prev = merged.at(-1);
    if (prev && r.start < prev.end) continue; // 与前一区间重叠，跳过（外层已覆盖）
    merged.push(r);
  }
  // 文本区 «n» 字面量与孤立 «/» 也必须保护（正则层同款边界）：它们不是 Markdown
  // 语法，mdast 把它们留在 text 节点里；不保护会被还原时的 TOK_RE 误认成真 token。
  const textRanges = [];
  let cur = 0;
  for (const r of merged) {
    const gap = src.slice(cur, r.start);
    for (const m of gap.matchAll(/«\d*»|«|»/g)) textRanges.push({ start: cur + m.index, end: cur + m.index + m[0].length, kind: 'inline' });
    cur = r.end;
  }
  for (const m of src.slice(cur).matchAll(/«\d*»|«|»/g)) textRanges.push({ start: cur + m.index, end: cur + m.index + m[0].length, kind: 'inline' });
  return [...merged, ...textRanges].sort((a, b) => a.start - b.start);
}

// 与正则层同构：返回 { text, tokens: [{v, kind}] }。解析失败时返回 null。
export function astProtectBody(src) {
  const ranges = protectedRanges(src);
  if (ranges === null) return null;
  const tokens = [];
  let out = '';
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue; // 重叠防御
    out += src.slice(cursor, r.start);
    tokens.push({ v: src.slice(r.start, r.end), kind: r.kind });
    out += TOK(tokens.length - 1);
    cursor = r.end;
  }
  out += src.slice(cursor);
  return { text: out, tokens };
}

// 与 restoreBody 同构的还原（完整拷贝 translate.mjs 的门逻辑；保持两实现可互换）。
// 独立实现是为了让本模块可单独测试；语义必须与主文件保持一致（self-test 双跑保证）。
const TOK_RE = /«(\d+)»/g;

export function astRestoreBody(protectedText, translated, tokens) {
  const seen = new Map();
  for (const m of translated.matchAll(TOK_RE)) {
    const id = Number(m[1]);
    if (id >= tokens.length) throw new Error(`占位符越界 «${id}»`);
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  const missing = tokens.map((_, i) => i).filter((i) => !seen.has(i));
  const dup = [...seen].filter(([, n]) => n > 1).map(([i]) => i);
  if (missing.length || dup.length) {
    throw new Error(`占位符不完整（缺失 ${missing.length}${missing.length ? ':' + missing.slice(0, 5).join(',') : ''}，重复 ${dup.length}${dup.length ? ':' + dup.slice(0, 5).join(',') : ''}）`);
  }
  const lines = translated.split('\n');
  for (const line of lines) {
    for (const m of line.matchAll(TOK_RE)) {
      const id = Number(m[1]);
      const { v, kind } = tokens[id];
      const at = line.indexOf(TOK(id));
      if (kind === 'lead' && at !== 0) throw new Error(`骨架标记 «${id}»(${JSON.stringify(v)}) 脱离行首`);
      if (kind === 'tail' && at + TOK(id).length !== line.length) throw new Error(`收尾标记 «${id}»(${JSON.stringify(v)}) 脱离行尾`);
    }
  }
  return translated.replace(TOK_RE, (_, id) => tokens[Number(id)].v);
}
