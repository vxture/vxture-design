#!/usr/bin/env node

/**
 * snapshot.mjs — 审计基线快照。
 *
 * ── 补的是哪个盲区 ──
 * 第一轮审计的每个数字都是**当场临时测出来的**：组件数用 find，导出数读快照 JSON，
 * Sonar 指标查 API。写进报告之后，测法就没了——下一轮要么重新发明一套测法，要么
 * 照抄报告里的数字当基线。前者让两轮的数字**不可比**，后者让上一轮的错误原样继承。
 *
 * 所以基线必须是**可执行的**，不是一段文字：测法与数字一起入仓，下一轮跑同一个
 * 脚本，diff 才有意义。
 *
 * ── 不做成守卫 ──
 * 这些数字每次加件、加导出都会变，做成 `--check` 会天天报红，然后被人加进忽略
 * 列表——那正是本仓最想避免的结局。它是**审计的起手式**，不是门禁。
 *
 * 用法：
 *   node scripts/audit/snapshot.mjs           # 打印快照 + 与上一份的差异
 *   node scripts/audit/snapshot.mjs --write    # 另存一份到 docs/audit/
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { collectFiles, isTsx } from "../guardrails/lib/collect-files.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs/audit");
const WRITE = process.argv.includes("--write");

const json = async (p) =>
  JSON.parse(await readFile(path.join(ROOT, p), "utf8"));

/** 每一项都带 how：**测法与数字同等重要**，下一轮照 how 复测才可比。 */
const metrics = [];
const add = (key, value, how) => metrics.push({ key, value, how });

// ── 包与版本 ────────────────────────────────────────────────────────────
for (const p of ["design-tokens", "design-ui", "design-system"]) {
  const pkg = await json(`packages/${p}/package.json`);
  add(`版本 · ${p}`, pkg.version, `packages/${p}/package.json 的 version`);
}

// ── 件 ──────────────────────────────────────────────────────────────────
const compRoots = [
  "packages/design-ui/src/components",
  "packages/design-system/src/components",
];
let comps = [];
for (const r of compRoots)
  comps.push(...(await collectFiles(path.join(ROOT, r), isTsx)));
add("件 · 总数", comps.length, "components/ 下的 .tsx 文件数");
const byLayer = {};
for (const f of comps) {
  const seg = path.relative(ROOT, f).split(path.sep);
  const layer = seg[seg.indexOf("components") + 1];
  byLayer[layer] = (byLayer[layer] || 0) + 1;
}
/* 显式给比较函数:默认序按 UTF-16 码元,本来就跨机器确定,但把判据写出来比留给
   读者推断好。**不用 localeCompare**——那才会随 locale 变,而这份快照要跨轮 diff。 */
for (const [k, v] of Object.entries(byLayer).sort((a, b) =>
  a[0] < b[0] ? -1 : 1,
))
  add(`件 · ${k}`, v, "按 components/ 下的一级目录归层");

// ── 公开面 ──────────────────────────────────────────────────────────────
const snap = await json(
  "scripts/guardrails/design-system-exports.snapshot.json",
);
for (const [entry, list] of Object.entries(snap.runtime ?? {}))
  add(
    `导出 · ${entry}`,
    Array.isArray(list) ? list.length : 0,
    "公开入口快照的具名导出数",
  );

// ── 守卫 ────────────────────────────────────────────────────────────────
const root = await json("package.json");
const chain = (root.scripts?.guardrails ?? "")
  .split("&&")
  .map((s) => s.trim())
  .filter(Boolean);
add("守卫 · 链条条数", chain.length, "package.json 的 guardrails 串了几条");
/* 脚本数从**链条本身**推导，不按目录 glob 数：check-doc-shape 住在
   scripts/docs/ 而不是 scripts/guardrails/，按目录数会少算一条——第一次跑
   这份快照时就是这么发现的。指标的测法自己也会漂。 */
/* 不用正则:本仓这一天里已经四次被「转义层被吃掉一层」坑到
   (最初那 6 处退格符就是同一个病因)。按空白切开、挑 .mjs 结尾的词,
   同样准确,而且没有可被吃掉的东西。 */
const guardScripts = new Set(
  chain
    .map((c) => root.scripts?.[c.replace("pnpm ", "")] ?? "")
    .flatMap((s) => s.split(" "))
    .filter((w) => w.endsWith(".mjs")),
);
add(
  "守卫 · 脚本数",
  guardScripts.size,
  "guardrails 链条实际引用到的 .mjs（含 token 生成器的 --check）",
);
add(
  "守卫 · 自测覆盖",
  (
    await readFile(path.join(ROOT, "scripts/guardrails/self-test.mjs"), "utf8")
  ).split("guard:").length - 1,
  "self-test.mjs 里的变异用例数",
);

// ── 测试 ────────────────────────────────────────────────────────────────
let tests = 0;
for (const r of ["packages", "scripts"]) {
  const files = await collectFiles(path.join(ROOT, r), (n) =>
    /\.(test|spec)\./.test(n),
  );
  tests += files.length;
}
add("测试 · 文件数", tests, "packages/ 与 scripts/ 下的 *.test.* / *.spec.*");

// ── 覆盖率 ────────────────────────────────────────────────────────────────
/*
 * 读 vitest 的 json-summary。**没跑过 test:coverage 就不报数**，而不是报 0——
 * 「没测过」与「没量过」是两件事，混成同一个数字正是这一轮反复栽的那个坑。
 *
 * 为什么必须量:此前判断「还差什么没测」靠的是「件名有没有出现在测试里」,
 * 那是个会说谎的代理——Button 出现在测试里只因为 DialogForm 渲染了它。第一次
 * 真量出来:语句 47.3%,而且 46 个文件是 0%、1–40% 之间只有 1 个。分布是两极的,
 * 说明剩下的活是「给这些补第一条测试」不是「加深已有的」。
 *
 * 更要紧的是它揪出了一整类被漏掉的东西:0% 榜首几个全是 hooks
 * (useListPagination / useBreakpoint / useFullscreen …)——它们从来不在「件名」
 * 清单里,因为不是组件。纯逻辑,最便宜也最该测。
 */
const COVERAGE_SUMMARY = "packages/design-ui/coverage/coverage-summary.json";
if (existsSync(path.join(ROOT, COVERAGE_SUMMARY))) {
  const cov = await json(COVERAGE_SUMMARY);
  const how = "vitest v8 覆盖率(pnpm test:coverage 后读 json-summary)";
  for (const [key, label] of [
    ["lines", "行"],
    ["statements", "语句"],
    ["branches", "分支"],
    ["functions", "函数"],
  ]) {
    add(`覆盖率 · ${label}%`, cov.total?.[key]?.pct ?? "—", how);
  }
  const files = Object.entries(cov).filter(([k]) => k !== "total");
  add(
    "覆盖率 · 零覆盖文件",
    files.filter(([, v]) => v.lines?.pct === 0).length,
    "从没被任何用例执行过的文件数",
  );
} else {
  add("覆盖率 · 行%", "未量", "先跑 pnpm test:coverage");
}

// ── 预览面 ──────────────────────────────────────────────────────────────
const reg = await readFile(
  path.join(ROOT, "packages/design-preview/src/preview/registry.tsx"),
  "utf8",
);
add(
  "预览面 · 条目数",
  (reg.match(/\n +name: "/g) || []).length,
  "registry.tsx 里的 name: 条目",
);

// ── 文档 ────────────────────────────────────────────────────────────────
const artifacts = (await readdir(path.join(ROOT, "docs/artifacts"))).filter(
  (f) => f.endsWith(".html") && !f.startsWith("_"),
);
add(
  "文档 · Artifact 底本",
  artifacts.length,
  "docs/artifacts/*.html（不含参照物）",
);

// ── 输出 ────────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().slice(0, 10);
const snapshot = { date: stamp, metrics };

const prior = existsSync(OUT_DIR)
  ? (await readdir(OUT_DIR))
      .filter((f) => f.startsWith("baseline-") && f.endsWith(".json"))
      .sort()
  : [];
const previous = prior.length
  ? await json(`docs/audit/${prior[prior.length - 1]}`)
  : null;

const w = Math.max(...metrics.map((m) => [...m.key].length)) + 2;
console.log(`审计基线 · ${stamp}`);
console.log("");
for (const m of metrics) {
  const before = previous?.metrics.find((x) => x.key === m.key);
  let delta = "";
  if (previous) {
    if (!before) delta = "  ← 新增项";
    else if (String(before.value) !== String(m.value))
      delta = `  ← 上轮 ${before.value}`;
  }
  console.log(`  ${m.key.padEnd(w)}${String(m.value).padStart(6)}${delta}`);
}
if (previous) {
  const gone = previous.metrics.filter(
    (x) => !metrics.some((m) => m.key === x.key),
  );
  for (const g of gone)
    console.log(
      `  ${g.key.padEnd(w)}${"—".padStart(6)}  ← 上轮 ${g.value}，本轮已无此项`,
    );
  console.log("");
  console.log(`与 ${previous.date} 的快照比对完毕。`);
} else {
  console.log("");
  console.log("没有更早的快照，这是第一份基线。");
}

if (WRITE) {
  const out = path.join(OUT_DIR, `baseline-${stamp}.json`);
  await writeFile(out, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`已写入 ${path.relative(ROOT, out).split(path.sep).join("/")}`);
}
