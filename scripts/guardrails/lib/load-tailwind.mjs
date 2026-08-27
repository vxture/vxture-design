/**
 * load-tailwind.mjs — 从 pnpm store 里找出 tailwindcss 并拿到它的编译 API。
 *
 * 抽出来的原因与隔壁 `collect-files.mjs` 完全一样：两个守卫
 * （check-utilities / check-component-classes）各手抄了一份同样的解析逻辑，
 * SonarCloud 报成重复——报得对。这一处漏改的代价比遍历那一处还大：
 * **找不到 tailwind 时两边都是 `process.exit(0)`，静默放行。** 于是解析逻辑
 * 一旦跟不上 pnpm 的目录布局或 tailwind 的 dist 路径，两条守卫会一起变成
 * 空跑，而 CI 全绿——「守卫静默缩小覆盖面」在本仓已经栽过两次。
 *
 * 为什么不 `import "tailwindcss"`：tailwindcss 不是本仓根 package.json 的直接
 * 依赖（由各 portal 持有），裸名解析不到。
 *
 * 退出行为**原样保留**（找不到就报一句然后 exit 0）：把它改成 exit 1 会让
 * 没装 tailwind 的环境直接红，那是另一个决定，不该顺手夹带在一次抽取里。
 *
 * @param {string} what 跳过时报给人看的名字，如「工具类实测」。
 * @returns {Promise<{ compile: Function, dir: string, pnpmDir: string }>}
 *   tailwind 的编译 API、它的安装目录，以及 pnpm store 的路径——调用方解析
 *   tailwind **插件**时还要用它（`@plugin "tailwindcss-animate"`），交出去
 *   免得那条路径又被各写一份。找不到时不返回——进程已经退出。
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export async function loadTailwind(what) {
  const pnpmDir = path.join(process.cwd(), "node_modules/.pnpm");
  const twDir = (await readdir(pnpmDir)).find((d) => /^tailwindcss@\d/.test(d));
  if (!twDir) {
    console.error(`未找到 tailwindcss 安装目录，跳过${what}。`);
    process.exit(0);
  }
  const dir = path.join(pnpmDir, twDir, "node_modules/tailwindcss");
  const { compile } = await import(
    new URL(
      `file://${path.join(dir, "dist/lib.mjs").split(path.sep).join("/")}`,
    ).href
  );
  return { compile, dir, pnpmDir };
}
