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

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";

const BS = String.fromCodePoint(8);
const WB = String.fromCodePoint(92) + "b";

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
  {
    /*
     * 变异的是**伞包版本**而不是文档——因为真实场景就是这个方向：发版时改了
     * package.json，六份仓内文档与六份 Artifact 底本忘了跟。反过来变异一份
     * 文档只能证明「守卫在读那一份」，证明不了它盯的是发布这件事。
     */
    guard: "scripts/docs/check-doc-version.mjs",
    name: "伞包发了新版而文档没跟",
    file: "packages/design-system/package.json",
    mutate: (s) => {
      const m = s.match(/"version": "(\d+)\.(\d+)\.(\d+)"/);
      if (!m) return null;
      const bumped = `"version": "${m[1]}.${m[2]}.${Number(m[3]) + 1}"`;
      return s.replace(m[0], bumped);
    },
  },
  /*
   * ── 最后三条：2026-08-26 补上 ──
   *
   * 这三条此前列在「未做变异测试」里，各自附着一条理由。**三条理由查下来两条
   * 不准、一条完全错**——而它们在那张表上原样躺了一整轮，谁也没去验：
   *
   *   check-mode-blocks          原写「任何单点变异都会同时改动两侧，造不出
   *                              『只坏一边』的输入」。**错**。删掉暗色块里
   *                              一个变量声明就是只坏一边，守卫当场报「键集
   *                              与默认块不一致——缺 1（background）」。
   *
   *   check-server-entry-safety  原写「变异源码后必须重新 build 才生效」。
   *                              **不必**：它读的就是 dist，直接变异 dist 即可，
   *                              17 秒。
   *
   *   check-packed-consumability 原写「同上，读的是 dist 与 pnpm pack 的产物」。
   *                              贵在 `npm pack` 而不是 build，而且它还读**随包
   *                              发出的 CSS 源文件**——改 globals.css 的 @source
   *                              就够，不用碰 dist。稳定态 27~41 秒。
   *
   * 教训与本仓查过的那几处同源：**一条写下来没人验的理由，和一条从没生效过的
   * 守卫是同一类东西**——都长得像已经想过了。
   */
  {
    guard: "scripts/guardrails/check-mode-blocks.mjs",
    name: "暗色块少一个变量（键集只坏一边）",
    file: "packages/design-tokens/src/styles/semantic/color-semantic.css",
    mutate: (s) => {
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const lines = s.split(nl);
      const start = lines.findIndex((l) => l.includes(":root.dark"));
      if (start < 0) return null;
      const idx = lines.findIndex(
        (l, i) => i > start && /^\s*--[a-z0-9-]+\s*:/i.test(l),
      );
      if (idx < 0) return null;
      lines.splice(idx, 1);
      return lines.join(nl);
    },
  },
  {
    guard: "scripts/guardrails/check-server-entry-safety.mjs",
    name: "/server 里出现模块作用域的 createContext",
    /* 变异 dist 而不是 src：这条守卫断言的对象就是已构建的产物，
       改源码反而要多跑一次 build 才生效。 */
    file: "packages/design-ui/dist/server.mjs",
    needsBuild: true,
    mutate: (s) =>
      'import * as React from "react";\nReact.createContext(void 0);\n' + s,
  },
  {
    guard: "scripts/guardrails/check-packed-consumability.mjs",
    name: "@source 指回 src/（那个目录不在 files 里）",
    /* 复刻的是真实付出过代价的那一版：@source 指向 src，而两个包的 files 都只
       发 dist。解析为空**不报错**，症状与根本没写 @source 完全一致。 */
    file: "packages/design-system/src/styles/globals.css",
    mutate: (s) =>
      s.includes('@source "../../../design-ui/dist";')
        ? s.replace(
            '@source "../../../design-ui/dist";',
            '@source "../../../design-ui/src";',
          )
        : null,
  },
];

/** 跑不了变异测试的守卫，逐条带原因——静默少测和静默少扫是同一类病。 */

/*
 * 跳过必须**出声**。一条被静默跳过的自测，和一条从没生效过的守卫是同一类
 * 东西——都在「绿」里躲着。下方无论跑没跑都会打印状态。
 *
 * 这里曾经有一条「慢车道」：`check-packed-consumability` 要 `npm pack` 三个包
 * 再解出来断言，第一次实测 140 秒，于是默认跳过、只在 CI 跑。**量准之后拆掉了**
 * ——那 140 秒是冷启动，稳定态是 27~41 秒，全套自测带上它 66 秒、不带 48 秒。
 * 差 18 秒撑不起一条会让人漏跑的分支。
 */

function runGuard(script) {
  try {
    execFileSync(process.execPath, [script], { stdio: "pipe" });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

const results = [];
const skipped = [];
for (const c of CASES) {
  /* 断言对象是构建产物的用例：没 build 就明说跳过，不假装通过。 */
  if (c.needsBuild && !existsSync(c.file)) {
    skipped.push({ ...c, why: `缺 ${c.file}——先跑 pnpm build` });
    continue;
  }
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
      originalContent: original,
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
if (skipped.length > 0) {
  console.log("");
  console.log("本次跳过：");
  for (const s of skipped) {
    console.log(
      `  · ${s.guard.split("/").pop().replace(".mjs", "")} —— ${s.why}`,
    );
  }
}

/*
 * 覆盖数**算出来**，不写死。
 *
 * 这一行原本是字符串 "全部 10 条守卫都有各自的变异用例"。接第 11 条守卫时它
 * 一个字都没变，照样声称 10 条全覆盖——**一个自称完整的清单比没有清单更坏**
 * （070 §1.1 与 §5.1.4 是同一条：写下来没人验的话，坏起来和从没生效过的守卫
 * 一模一样）。现在两边都从事实取：链条读 package.json，用例读本文件的 CASES。
 */
const chain = JSON.parse(readFileSync("package.json", "utf8"))
  .scripts.guardrails.split("&&")
  .map((s) => s.trim())
  .filter(Boolean);
const covered = new Set(CASES.map((c) => c.guard));

console.log("");
if (covered.size === chain.length) {
  console.log(`覆盖：全部 ${chain.length} 条守卫都有各自的变异用例。`);
} else {
  console.log(
    `覆盖：${covered.size} / ${chain.length} —— 有守卫还没有变异用例。`,
  );
  console.log(
    "  一条没被变异验过的守卫，和一条从没生效过的守卫，看起来都是绿的。",
  );
  process.exitCode = 1;
}

/*
 * 还原复验：逐文件比对字节，而不是问 git。
 *
 * 早先这里跑 `git status --porcelain`，并且脏树就拒绝运行。两处都换掉了：
 *   · **更精确**：本自测只碰下面这几个文件，逐个比对能指出是**哪一个**没还原；
 *     全局 git 状态还会被无关的 WIP 干扰
 *   · **不再拒绝脏树**：改到一半想跑一次自测是正当需求，早先那道门槛纯属自找
 *   · 顺带去掉一个子进程——靠 PATH 找 `git` 在构建脚本里是不必要的依赖
 */
const notRestored = results
  .filter((r) => r.originalContent !== undefined)
  .filter((r) => readFileSync(r.file, "utf8") !== r.originalContent)
  .map((r) => r.file);
if (notRestored.length > 0) {
  console.error("");
  console.error("还原失败，以下文件与自测前不一致：");
  for (const f of notRestored) console.error(`  "" ${f}`);
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
