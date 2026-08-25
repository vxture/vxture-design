#!/usr/bin/env node

/**
 * check-i18n-seam.mjs — 组件里的文案必须留得出覆盖出口。
 *
 * ── 补的是哪个盲区 ──
 * DS 的文案约定是「中文默认值 + 调用方可覆盖」，不是「中文」。十几处
 * `cancelLabel = "取消"` / `placeholder = "请选择"` 都守着这条。但**破这条约定
 * 不报任何错**：把 `aria-label="关闭"` 直接写进 JSX，type-check 绿、eslint 绿、
 * 类名守卫绿，只在双语门户上线时变成一句改不掉的中文。
 *
 * 2026-08-25 实测：7 个件、15 处无出口的中文，其中 `DataTable` 的「操作」是可见
 * 表头，`BulkActionBar` 的「已选择 {count} {noun}」把中文语序也焊了进去——英文得
 * 是 `{count} {noun} selected`，只开 `noun` 一个口子调用方拼不出那句话。
 *
 * 判据不是「不许写中文」，是**每一处文案都得有办法被调用方换掉**。认这四种出口：
 *   1. 形参默认值：`cancelLabel = "取消"`
 *   2. `DEFAULT_*` / `*_LABELS` 常量（配套的 labels prop 合并覆盖）
 *   3. `??` 兜底：`labels?.x ?? "中文"`
 *   4. 显式豁免清单（下方 ALLOW，逐条带理由）
 *
 * 拼接出来的句子同样要有出口，而且出口得是**模板**不是词：语序是语法不是词汇，
 * 件替调用方拼串就等于替它定了语序（见 ConfirmDestructive.titleTemplate 的由来）。
 * 本脚本查得到「有没有出口」，查不到「出口够不够」——后者靠评审。
 *
 * 用法：node scripts/guardrails/check-i18n-seam.mjs
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const ROOTS = [
  "packages/design-ui/src/components",
  "packages/design-system/src/components",
];

/** 豁免逐条带理由。判据只有一条：**它不是给人读的文案**。 */
const ALLOW = new Map([
  [
    "packages/design-ui/src/components/tone.ts",
    "语气档位的中文注释性常量不进渲染，六档值本身是英文标识符",
  ],
]);

const CJK = /[\u4e00-\u9fff]/;

/** 去注释：注释里的中文是给维护者读的，不是文案。 */
function stripComments(src) {
  let out = "";
  let state = null;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    const n = src[i + 1] ?? "";
    if (state === null) {
      if (c === "/" && n === "/") {
        state = "line";
        out += "  ";
        i += 1;
        continue;
      }
      if (c === "/" && n === "*") {
        state = "block";
        out += "  ";
        i += 1;
        continue;
      }
      out += c;
      continue;
    }
    if (state === "line") {
      if (c === "\n") {
        state = null;
        out += "\n";
      } else out += " ";
      continue;
    }
    if (c === "*" && n === "/") {
      state = null;
      out += "  ";
      i += 1;
      continue;
    }
    out += c === "\n" ? "\n" : " ";
  }
  return out;
}

/**
 * 形参/属性默认值：`cancelLabel = "取消",`、`"aria-label": ariaLabel = "板块导航",`。
 *
 * **必须以逗号收尾**——这一条不是格式洁癖，是用来把它和 JSX 属性分开的唯一线索：
 * `ariaLabel="每页条数"` 与 `ariaLabel = "每页条数"` 在正则眼里没有区别，而前者是
 * 写死的文案、后者是可覆盖的默认值。解构项与对象字面量项都带尾逗号（prettier 保证），
 * JSX 属性不带。第一版漏掉 Pagination 那两处就是因为少了这条。
 */
const PARAM_DEFAULT =
  /^\s*(?:readonly\s+)?(?:"[\w-]+"\s*:\s*)?[\w$]+\s*(?::\s*[^=;]+?)?=\s*["'`][^"'`]*["'`]\s*,\s*$/;

/** `DEFAULT_LABELS` / `TIER_LABEL` / `DEFAULT_LEGAL_LINKS` 一族。 */
const DEFAULTS_CONST = /\b(?:DEFAULT_[A-Z_]+|[A-Z_]*LABELS?)\b\s*(?::[^=]+)?=/;

/** 一行里 `{[(` 与 `}])` 的净差。字符串里的括号不参与——文案里出现括号不该改变结构。 */
function bracketBalance(line) {
  let n = 0;
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quote) {
      if (c === "\\") {
        i += 1;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") n += 1;
    else if (c === "}" || c === "]" || c === ")") n -= 1;
  }
  return n;
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

const problems = [];

for (const root of ROOTS) {
  for (const file of await walk(path.join(ROOT, root))) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (ALLOW.has(rel)) continue;

    const src = await readFile(file, "utf8");
    const raw = src.split("\n");
    const code = stripComments(src).split("\n");

    /**
     * `DEFAULT_*` 常量的作用范围，按**括号深度**算，不按「哪一行长得像收尾」。
     *
     * 第一版用 `/^\s*[}\]];/` 找收尾，被单行声明打穿：
     * `const DEFAULT_PAGE_SIZES = ["auto", 10, 20, 50, 100];` 的收尾就在声明行上，
     * 匹配不到独占一行的 `];`,于是 `inDefaults` 再没被关掉——**从那一行起整个文件
     * 都不再检查**，Pagination 的两处漏报就是这么来的。守卫自己静默停止守卫，比没有
     * 守卫更坏。深度归零即出块，单行声明当场归零。
     */
    let depth = 0;

    for (let i = 0; i < code.length; i += 1) {
      const line = code[i];
      if (depth === 0 && DEFAULTS_CONST.test(line)) {
        depth = bracketBalance(line);
        continue;
      }
      if (depth > 0) {
        depth = Math.max(0, depth + bracketBalance(line));
        continue;
      }
      if (!CJK.test(line)) continue;
      if (PARAM_DEFAULT.test(line)) continue;

      /*
       * `??` 兜底与被它兜住的文案常隔好几行,中间还可能夹着注释:
       *     labels?.themeOptions?.[option] ??
       *     // 注释（被抹成空行）
       *     { system: "系统", ... }[option],
       * 判据取「前面 12 行内有没有一行以 `??` 收尾」——兜底表达式必然这么断行,
       * 而这条规则不必解析模板串里的 `${}` 嵌套,也不会被空行截断。
       *
       * 已知弱点:12 行内若有一个无关的、以 `??` 收尾的表达式,会漏报一次。这是
       * 有意选的方向——漏报靠评审补,误报会让人开始忽略这条守卫。
       */
      let guarded = line.includes("??");
      for (let back = 1; back <= 12 && !guarded; back += 1) {
        const prev = code[i - back];
        if (prev === undefined) break;
        if (/\?\?$/.test(prev.trimEnd())) guarded = true;
      }
      if (guarded) continue;

      problems.push(`${rel}:${i + 1}\n      ${raw[i].trim().slice(0, 100)}`);
    }
  }
}

if (problems.length > 0) {
  console.error("文案出口守卫未通过——以下中文写死在组件里，调用方覆盖不掉：\n");
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    "\n改法：收成 prop（一两条）或 labels 对象（三条以上），中文留作默认值。",
  );
  console.error("拼接出来的句子收模板不收词——语序是语法，不是词汇。");
  process.exit(1);
}

console.log("文案出口守卫通过（组件内中文全部可由调用方覆盖）。");
