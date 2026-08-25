#!/usr/bin/env node

/**
 * self-test.mjs — 守卫自测：问出「这条断言真的会触发吗」。
 *
 * ── 补的是哪个盲区 ──
 * 2026-08-25 的审计里查到:check-design-system.mjs 有 6 处字面量退格符,位置全是
 * 本该写词边界的地方,含它的正则永远匹配不上——**四条检查从写下那天起就在打勾、
 * 什么都没查**。而 `pnpm guardrails` 一路绿灯,一次都没有异常。
 *
 * 发现它靠的是 SonarCloud 报了个「控制字符」:**另一个工具、另一条完全无关的理由**。
 * 换句话说这次是撞上的,不是查出来的。
 *
 * 守卫是这套系统的安全网,而**安全网破了不会有任何声音**——它坏掉的表现和它正常
 * 工作的表现,都是「绿」。所以守卫必须自己被测:给它一份**已知有病**的输入,它必须
 * 报错;报不出来,这条守卫就是死的。
 *
 * ── 方法 ──
 * 变异测试。对真实文件做一处外科式改动 → 跑那条守卫 → 断言它**非零退出** → 还原。
 * 不用 fixture 目录,因为守卫读的是 `process.cwd()` 下的真实路径;造一份平行的
 * 假仓,只会让自测和真实运行环境分叉。
 *
 * ── 安全 ──
 * · 工作树不干净就拒绝运行(还原靠的是内存里的原文,脏树会掩盖还原失败)
 * · 每个变异在 finally 里还原
 * · 全部跑完后再验一次 `git status --porcelain` 为空,不为空就报错退出
 *
 * ── 覆盖 ──
 * 未覆盖的守卫在末尾**逐条列出并说明原因**。静默少测和静默少扫是同一类病。
 *
 * 用法：node scripts/guardrails/self-test.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";

const BS = String.fromCharCode(8);
const WB = String.fromCharCode(92) + "b";

/** 每个用例：一处变异 + 它必须惊动的那条守卫。 */
const CASES = [
  {
    guard: "scripts/guardrails/check-control-chars.mjs",
    name: "词边界退化成退格符",
    file: "scripts/guardrails/check-design-system.mjs",
    mutate: (s) => {
      const i = s.indexOf(WB);
      if (i < 0) return null;
      return s.slice(0, i) + BS + s.slice(i + 2);
    },
  },
  {
    guard: "scripts/guardrails/check-i18n-seam.mjs",
    name: "英文托底被改回中文",
    file: "packages/design-ui/src/components/base/feedback/Banner.tsx",
    mutate: (s) =>
      s.includes('dismissLabel = "Dismiss"')
        ? s.replace('dismissLabel = "Dismiss"', 'dismissLabel = "关闭提示"')
        : null,
  },
  {
    guard: "scripts/guardrails/check-component-classes.mjs",
    name: "写了一个不存在的类名",
    file: "packages/design-ui/src/components/base/feedback/Banner.tsx",
    mutate: (s) =>
      s.includes('"flex items-start gap-sm rounded-xl border p-md"')
        ? s.replace(
            '"flex items-start gap-sm rounded-xl border p-md"',
            '"flex items-start gap-sm rounded-xl border p-md text-body-xs"',
          )
        : null,
  },
  {
    guard: "scripts/guardrails/check-design-system.mjs",
    name: "收敛样式里硬编码 motion 时长",
    file: "packages/design-system/src/styles/fullscreen.css",
    mutate: (s) => s + "\n.vx-selftest-probe { transition-duration: 250ms; }\n",
  },
  {
    guard: "scripts/guardrails/check-preview-coverage.mjs",
    name: "预览面条目改名，件因此失去覆盖",
    file: "packages/design-preview/src/preview/registry.tsx",
    mutate: (s) =>
      s.includes('name: "Banner",')
        ? s.replace('name: "Banner",', 'name: "BannerRenamed",')
        : null,
  },
  {
    guard: "scripts/guardrails/check-design-system-exports.mjs",
    name: "公开导出面与快照漂移",
    file: "scripts/guardrails/design-system-exports.snapshot.json",
    mutate: (s) => {
      const snap = JSON.parse(s);
      const list = snap.runtime?.["."];
      if (!Array.isArray(list) || list.length === 0) return null;
      snap.runtime["."] = list.slice(0, -1);
      return JSON.stringify(snap, null, 2) + "\n";
    },
  },
  {
    guard: "scripts/docs/check-doc-shape.mjs",
    name: "文档导轨组被改名",
    file: "docs/artifacts/audit.html",
    mutate: (s) =>
      s.includes(">文档集<") ? s.replace(">文档集<", ">DS 文档集<") : null,
  },
];

/** 跑不了变异测试的守卫，逐条带原因——静默少测和静默少扫是同一类病。 */
const UNCOVERED = [
  [
    "check-server-entry-safety",
    "断言的对象是**已构建的 dist**，变异源码后必须重新 build 才生效；单跑一次自测要多花约一分钟",
  ],
  ["check-packed-consumability", "同上，读的是 dist 与 pnpm pack 的产物"],
  [
    "check-mode-blocks",
    "断言的是三轴键集的**相互一致**，任何单点变异都会同时改动两侧，造不出「只坏一边」的输入",
  ],
];

function tree() {
  return execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim();
}

function runGuard(script) {
  try {
    execFileSync(process.execPath, [script], { stdio: "pipe" });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

if (tree() !== "") {
  console.error("工作树不干净——自测会改真实文件再还原，脏树会掩盖还原失败。");
  console.error("先提交或 stash，再跑本自测。");
  process.exit(1);
}

const results = [];
for (const c of CASES) {
  const original = readFileSync(c.file, "utf8");
  const mutated = c.mutate(original);
  if (mutated === null || mutated === original) {
    results.push({ ...c, verdict: "锚点失效", ok: false });
    continue;
  }
  try {
    writeFileSync(c.file, mutated);
    const code = runGuard(c.guard);
    results.push({
      ...c,
      verdict: code === 0 ? "没报错" : "报错",
      ok: code !== 0,
    });
  } finally {
    writeFileSync(c.file, original);
  }
}

const pad = (s, n) => s + " ".repeat(Math.max(0, n - [...s].length * 1));
console.log("守卫自测——给每条守卫一份已知有病的输入：");
console.log("");
for (const r of results) {
  const mark = r.ok ? "✓" : "✗";
  const guard = r.guard.split("/").pop().replace(".mjs", "");
  console.log(`  ${mark} ${guard}`);
  console.log(`      变异：${r.name}`);
  console.log(
    `      结果：${r.verdict}${r.ok ? "" : "  ← 这条守卫抓不到它该抓的东西"}`,
  );
}

console.log("");
console.log("未做变异测试的守卫：");
for (const [g, why] of UNCOVERED) console.log(`  · ${g} —— ${why}`);

const dirty = tree();
if (dirty !== "") {
  console.error("");
  console.error("还原失败，工作树被改动：");
  console.error(dirty);
  process.exit(1);
}

const failed = results.filter((r) => !r.ok);
console.log("");
if (failed.length > 0) {
  console.error(
    `自测未通过：${failed.length}/${results.length} 条守卫抓不到自己该抓的东西。`,
  );
  process.exit(1);
}
console.log(
  `自测通过（${results.length} 条守卫各自被一份已知有病的输入惊动；工作树已还原）。`,
);
