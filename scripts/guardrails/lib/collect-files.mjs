/**
 * collect-files.mjs — 递归收集某目录下的源文件，供各守卫脚本共用。
 *
 * 抽出来的原因很具体：三个守卫（check-preview-coverage / check-component-classes /
 * check-i18n-seam）各写了一份 `walk`，彼此只差一个扩展名过滤。SonarCloud 在
 * PR #14 上把它报成重复代码——报得对，三份实现意味着以后改遍历规则要记得改三处，
 * 而漏改的那一处不会报错，只会少扫一些文件（守卫静默缩小覆盖面，本仓已经栽过两次）。
 *
 * @param {string} dir 起始目录（绝对路径）
 * @param {(name: string) => boolean} accept 只收 `accept(文件名)` 为真的文件
 * @returns {Promise<string[]>} 绝对路径清单
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

export async function collectFiles(dir, accept, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(p, accept, out);
    else if (accept(entry.name)) out.push(p);
  }
  return out;
}

/** 常用过滤器：`.tsx` 与 `.ts`/`.tsx`。写成常量避免各处再手抄正则。 */
export const isTsx = (name) => name.endsWith(".tsx");
export const isTsOrTsx = (name) => /\.tsx?$/.test(name);
