#!/usr/bin/env node

/**
 * check-control-chars.mjs — 源码里不许出现游离的 C0 控制字符。
 *
 * ── 补的是哪个盲区 ──
 * 2026-08-25 在 check-design-system.mjs 里查到 6 处字面量 0x08（退格符），位置
 * 全都是本该写词边界的地方。含它的正则永远匹配不上，于是**四条检查从写下那天起
 * 就在打勾，什么都没查**——修回词边界后第一次跑就立刻报出真违规。
 *
 * 病因是转义层被吃掉一层：经某些工具写文件时 "\\b" 会退化成 "\b"，而
 * "\b" 在 JS 字符串里就是退格符。同一个坑在同一天里重现过三次，所以它不是
 * 一次手滑，是一类系统性故障。
 *
 * 判据是二值的：除 tab / LF / CR 外，源码里不允许出现 U+0000–U+001F 与 U+007F。
 * 这类字符**在编辑器里不可见、在 diff 里不可见、在评审里不可见**，唯一能看见它的
 * 是机器。
 *
 * 用法：node scripts/guardrails/check-control-chars.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { collectFiles } from "./lib/collect-files.mjs";

const ROOT = process.cwd();
const ROOTS = ["packages", "scripts"];
const SKIP = new Set(["node_modules", "dist", ".next", "coverage"]);

/** 允许的三个：制表、换行、回车。其余 C0 与 DEL 一律报。 */
const ALLOWED = new Set([9, 10, 13]);
const SOURCE = /.(mjs|js|ts|tsx|css|json|md)$/;

function scan(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (let c = 0; c < lines[i].length; c += 1) {
      const code = lines[i].charCodeAt(c);
      if ((code <= 31 && !ALLOWED.has(code)) || code === 127) {
        hits.push({ line: i + 1, col: c + 1, code });
      }
    }
  }
  return hits;
}

const problems = [];
let scanned = 0;

for (const root of ROOTS) {
  const files = await collectFiles(path.join(ROOT, root), (name) =>
    SOURCE.test(name),
  );
  for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (rel.split("/").some((seg) => SKIP.has(seg))) continue;
    scanned += 1;
    for (const h of scan(await readFile(file, "utf8"))) {
      const hex = h.code.toString(16).padStart(4, "0").toUpperCase();
      problems.push(`${rel}:${h.line}:${h.col} — U+${hex}`);
    }
  }
}

if (problems.length > 0) {
  console.error("控制字符守卫未通过——以下位置有不可见的控制字符：");
  console.error("");
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("");
  console.error(
    "多半是转义层被吃掉一层：源码里写的 " +
      JSON.stringify("\\b") +
      " 退化成了 " +
      JSON.stringify("\b") +
      "（退格符）。",
  );
  console.error("正则里的词边界、字符串里的换行都要检查一遍。");
  process.exit(1);
}

console.log(`控制字符守卫通过（${scanned} 个文件，无游离控制字符）。`);
