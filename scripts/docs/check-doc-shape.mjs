#!/usr/bin/env node

/**
 * check-doc-shape.mjs — Artifact 文档必须与参照物同形。
 *
 * ── 补的是哪个盲区 ──
 * DS 的 Artifact 文档形制来自 Karda 文档集。第一版三份文档的 CSS 是**逐字节抽
 * 出来**的，所以一字不差；导轨却是**照着理解重打的**，于是组顺序整个反了
 * （参照物是「文档集 → 本页」，写成了「本页 → 文档集」），组名也擅自改成了
 * 「DS 文档集」。
 *
 * 病因不是手滑，是**把结构变成描述再从描述重建**——顺序活不过摘要。而发布前的
 * 校验查的是标签配平、锚点不悬空、主题三态，全是**页面自洽性**，一次都没有拿
 * 参照物本身对账。那次对账只有二十来行，跑一次就能在发布前抓到。
 *
 * 所以判据是：**同形的部分必须逐项相等，扩展必须排在原有之后。**
 * 扩展本身是允许的（DS 的文档集比 Karda 多一组「同族」），但不能重排原有的。
 *
 * 用法：node scripts/docs/check-doc-shape.mjs
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DIR = path.join(process.cwd(), "docs/artifacts");
const REFERENCE = "_reference-karda-audit.html";

/** 参照物固有的导轨组，顺序即判据。DS 文档可在其后追加，不可插队或改名。 */
const REQUIRED_GROUPS = ["文档集", "本页"];

function railGroups(html) {
  const nav = html.match(/<nav class="rail">([\s\S]*?)<\/nav>/);
  if (!nav) return null;
  return [...nav[1].matchAll(/<div class="rail-group">([^<]*)<\/div>/g)].map(
    (m) => m[1].trim(),
  );
}

function shape(html) {
  return {
    groups: railGroups(html),
    hasBrand: /<div class="rail-brand">/.test(html),
    hasTitle: /<div class="rail-title">/.test(html),
    hasEyebrow: /class="eyebrow"/.test(html),
    hasLede: /class="lede"/.test(html),
    h2Total: (html.match(/<h2>/g) || []).length,
    h2Numbered: (html.match(/<h2><span class="num">/g) || []).length,
    rules: (html.match(/<div class="rule"><\/div>/g) || []).length,
    hasFoot: /class="foot"/.test(html),
    hasThemeBtn: /id="themeBtn"/.test(html),
  };
}

const problems = [];
const files = (await readdir(DIR)).filter((f) => f.endsWith(".html"));
const ref = shape(await readFile(path.join(DIR, REFERENCE), "utf8"));

if (String(ref.groups) !== String(REQUIRED_GROUPS)) {
  problems.push(
    `${REFERENCE}: 参照物自身的导轨组已变为 [${ref.groups}]——REQUIRED_GROUPS 需同步更新`,
  );
}

for (const f of files) {
  if (f === REFERENCE) continue;
  const s = shape(await readFile(path.join(DIR, f), "utf8"));

  if (s.groups === null) {
    problems.push(`${f}: 找不到 <nav class="rail">`);
    continue;
  }
  // 同形：前 N 组必须与参照物逐项相等；其后可以有扩展
  const head = s.groups.slice(0, REQUIRED_GROUPS.length);
  if (String(head) !== String(REQUIRED_GROUPS)) {
    problems.push(
      `${f}: 导轨组应以 [${REQUIRED_GROUPS}] 开头，实为 [${s.groups}]`,
    );
  }
  for (const [k, label] of [
    ["hasBrand", "rail-brand"],
    ["hasTitle", "rail-title"],
    ["hasEyebrow", "page-head 的 eyebrow"],
    ["hasLede", "page-head 的 lede"],
    ["hasFoot", "页脚 foot"],
    ["hasThemeBtn", "主题按钮"],
  ]) {
    if (!s[k]) problems.push(`${f}: 缺 ${label}`);
  }
  if (s.h2Total !== s.h2Numbered) {
    problems.push(
      `${f}: 有 ${s.h2Total - s.h2Numbered} 个 h2 没有 <span class="num"> 序号`,
    );
  }
  if (s.rules !== s.h2Total) {
    problems.push(
      `${f}: h2 有 ${s.h2Total} 个，分隔线 ${s.rules} 条——每节标题下应有一条`,
    );
  }
}

if (problems.length > 0) {
  console.error("文档形制守卫未通过：");
  console.error("");
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("");
  console.error(
    "形制来自 docs/artifacts/" +
      REFERENCE +
      "。可以在原有之后**追加**，不可重排或改名。",
  );
  process.exit(1);
}

console.log(`文档形制守卫通过（${files.length - 1} 份，与参照物同形）。`);
