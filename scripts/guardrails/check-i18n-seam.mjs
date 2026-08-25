#!/usr/bin/env node

/**
 * check-i18n-seam.mjs — 组件渲染的文案一律英文，且必须留得出覆盖出口。
 *
 * ── 判据 ──
 * 英文是基准语（owner 2026-08-25 定，design-ui 5.0）：DS 不知道消费方说什么语言，
 * 所以它给的默认值必须是**中立的那一个**，翻译由产品在调用点完成。件内出现中文
 * 就意味着 DS 替某一个产品做了语言选择，而那个选择对别的产品是错的。
 *
 * ── 为什么这条规则比上一版好 ──
 * 4.2 版查的是「中文有没有覆盖出口」，得靠一堆启发式去分辨形参默认值、
 * `DEFAULT_*` 常量、跨行的 `??` 兜底——每一条都可能误判，实测里踩过两次：
 *   · 用「独占一行的 `];`」找常量块收尾，被单行声明打穿，从那行起整个文件不再
 *     检查（守卫自己静默停止守卫，比没有守卫更坏）；
 *   · `ariaLabel="中文"`（JSX 属性，写死）与 `ariaLabel = "中文"`（形参默认值，
 *     可覆盖）在正则眼里没有区别。
 * 英文做基准之后判据变成二值的：**剥掉注释后不允许出现中日韩字符**。没有启发式，
 * 就没有误判，也不存在「看起来在查其实没查」的中间态。
 *
 * 注释不管——注释是写给维护者的，本仓的维护语言是中文。
 *
 * 覆盖出口本身仍是硬要求，但那一条现在靠评审与 05 §3.1 的三档收法保证：
 * 一两条走独立 prop、三条以上走 `labels` 对象、拼接出来的句子收模板不收词。
 * 机器查得到「有没有中文」，查不到「出口够不够」。
 *
 * 用法：node scripts/guardrails/check-i18n-seam.mjs
 */

import { readFile } from "node:fs/promises";
import { collectFiles, isTsOrTsx } from "./lib/collect-files.mjs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const ROOTS = ["packages/design-ui/src", "packages/design-system/src"];

/**
 * 汉字、CJK 标点（。、「」）、全角形式（？！：，（））。
 *
 * 全角标点必须一起查：`titleTemplate = "{verb}{target}？"` 里没有一个汉字，
 * 只有一个全角问号，而它正是 4.1 那次「件替调用方决定语序」的残留——只扫汉字
 * 的那一版从头到尾没报过它。
 */
const WIDE = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

/**
 * `confirmExempt` 的值同样豁免：它**从不进 DOM**——`Button` 把它解构丢掉后才
 * 展开 props（落到元素上会变成 React 不认识的属性并报警告），`ActionMenu` /
 * `BulkActionBar` 从头到尾不读它。它的全部作用在类型层与 `grep`：强迫写下
 * 「这个红按钮为什么不设防」，并让这句话可清点。
 *
 * 也就是说它和注释是同一类东西——**写给维护者的散文**，而本仓的维护语言是中文。
 * 判据仍是二值的：整行含 `confirmExempt` 即跳过，不做任何语义推断。
 */
const MAINTAINER_PROSE = /confirmExempt/;

/** 去注释。注释里的中文是给维护者读的，不是文案。 */
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

const problems = [];
let scanned = 0;

for (const root of ROOTS) {
  for (const file of await collectFiles(path.join(ROOT, root), isTsOrTsx)) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    scanned += 1;

    const src = await readFile(file, "utf8");
    const raw = src.split("\n");
    const code = stripComments(src).split("\n");

    for (let i = 0; i < code.length; i += 1) {
      if (!WIDE.test(code[i])) continue;
      if (MAINTAINER_PROSE.test(code[i])) continue;
      problems.push(`${rel}:${i + 1}\n      ${raw[i].trim().slice(0, 100)}`);
    }
  }
}

if (problems.length > 0) {
  console.error("文案守卫未通过——以下中文进了组件渲染，英文才是基准语：\n");
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    "\n改法：默认值改英文，中文由消费方在调用点传入（05 §3.1 的三档收法）。",
  );
  console.error("注释不受此限——本仓的维护语言仍是中文。");
  process.exit(1);
}

console.log(`文案守卫通过（${scanned} 个文件，渲染文案全为英文）。`);
