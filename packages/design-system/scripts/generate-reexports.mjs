#!/usr/bin/env node
/**
 * generate-reexports.mjs - 生成 index 对 design-ui / design-tokens 的具名再导出。
 *
 * 为什么存在：index 产物被注入 "use client"，而对 external 包的 `export *` 会
 * 原样留在产物里——Next 15 的 next-flight-loader 在 server/client 边界上硬拒
 * 这个组合（它无法静态枚举客户端引用图）。修法就是错误信息里那句
 * "Please use named exports instead"：值走生成的具名清单，类型走
 * `export type *`（编译期擦除，无运行时痕迹）。
 *
 * 事实来源：两包**已构建**的 CJS 产物（build 顺序本就要求 tokens -> ui ->
 * system，见 050-design-system-release.md §4）。生成物 src/generated-reexports.ts
 * 入仓供编辑器/type-check 直读；每次 `pnpm build` 前重新生成，所以发布产物
 * 永远与当版依赖对齐（伞包对两包钉精确版本，050 §1）。生成物不得手工编辑。
 *
 * 去重规则：design-ui 优先；design-tokens 里与 design-ui 同名的值不再二次
 * 导出（原 `export *` 语义下同名本就 ambiguous-drop，这里显式化）。伞包自持
 * 层（./components ./theme ./density）与两包的值名冲突会在 tsup 构建时直接
 * 报 duplicate export——冲突应当是构建错误，不是静默遮蔽。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { argv, exit, stderr, stdout } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// 用 import()（不是 createRequire）：require 条件会解析到某些依赖损坏的
// CJS 条件文件（如 @phosphor-icons/react 的 index.cjs.js —— .js 后缀 +
// "type":"module"，require(esm) 直接炸）；import 条件是健康的 ESM。
async function runtimeExports(pkg) {
  const mod = await import(pkg);
  return Object.keys(mod)
    .filter((k) => k !== "default" && k !== "__esModule")
    .sort();
}

const ui = await runtimeExports("@vxture/design-ui");
const uiSet = new Set(ui);
const tokens = (await runtimeExports("@vxture/design-tokens")).filter(
  (k) => !uiSet.has(k),
);

const list = (names) => names.map((n) => `  ${n},`).join("\n");

const out = `// 本文件由 scripts/generate-reexports.mjs 生成——不得手工编辑（改动会在下一次
// pnpm build 时被覆盖）。背景与规则见生成脚本头注释。

// ---- @vxture/design-ui 的全部运行时导出（${ui.length} 个） ----
export {
${list(ui)}
} from "@vxture/design-ui";

// ---- @vxture/design-tokens 的运行时导出（${tokens.length} 个，去除与 design-ui 同名项） ----
export {
${list(tokens)}
} from "@vxture/design-tokens";
`;

const target = join(here, "..", "src", "generated-reexports.ts");

/*
 * --check：只比对，不写盘。补的是这样一个盲区——本文件是生成物，**但它入仓**
 * （供编辑器与 type-check 直读）。发布产物永远是对的（每次 build 前重新生成），
 * 所以仓内这份落后了也没有任何东西会红：`check-design-system-exports` 比的是
 * 已构建 dist 的运行时导出对快照，跟这份 src 无关。
 *
 * 代价实测过，同一组五个名字丢了两次：12.9.0 漏提交，#67（12.10.0）补上
 * 249 → 254，#70（12.10.3）又删回去 254 → 249——那次是在 design-ui 的 dist
 * 还落后时重跑了 build，把生成结果写回了仓库。两次都没人发现。
 *
 * 前提与 build 顺序一致：读的是 tokens / ui 的**已构建产物**，所以本检查要跑在
 * build 之后（`guardrails` 链本就如此）。
 */
if (argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    /* 缺文件即视为不同步 */
  }
  if (current !== out) {
    stderr.write(
      "仓内 src/generated-reexports.ts 与当前构建产物的导出面不一致。\n",
    );
    stderr.write(
      `当前产物：design-ui ${ui.length} + design-tokens ${tokens.length} 个具名再导出。\n`,
    );
    stderr.write(
      "运行：pnpm --filter @vxture/design-system exec node scripts/generate-reexports.mjs\n",
    );
    exit(1);
  }
  stdout.write(
    `再导出清单一致（design-ui ${ui.length} + design-tokens ${tokens.length}）
`,
  );
} else {
  writeFileSync(target, out);
  stdout.write(`[generate-reexports] design-ui ${ui.length} + design-tokens ${tokens.length} named re-exports written
`);
}
