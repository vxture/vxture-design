#!/usr/bin/env node

/**
 * check-doc-version.mjs — 文档声称的 DS 版本必须等于伞包的实际版本。
 *
 * ── 补的是哪个盲区 ──
 * 文档写错版本不报错，只是**读的人按上一版的事实做判断**。这一条实测过代价：
 * 2026-08-27 全面核对时发现五份 Artifact 停在 design-ui 6.0.4 / design-system
 * 9.0.4（落后四个 patch、跨了一次发布），而仓内六份文档各自带着一个与任何东西
 * 都对不上的独立 SemVer（2.0.0 / 3.0.0 / 3.1.0 …）——那些号码不指向任何可核对的
 * 事实，因此也没人能发现它们不对。
 *
 * 改法是让文档只带**一个**号：伞包版本（= 应用装的那个 = `ds-v*` 标签），
 * 然后由本守卫盯着它。
 *
 * ── 为什么盯伞包而不是三包 ──
 * 三包各自独立 SemVer，一次发布常常只动其中一两个；而「这份文档描述哪次发布」
 * 只需要一个号。伞包是应用唯一直接安装的包，也是标签用的号。
 *
 * 页脚里另外列出的 tokens / ui 两个版本不在本守卫范围内——它们是明细，会随各自
 * 的发布走；一并盯住的代价是每次单包 patch 都要改六份文档，而那正是让人开始
 * 「顺手改一下数字」的开端。
 *
 * **但同一条页脚里的 `design-system` 版本要盯**：它和 `DS x.y.z` 是同一个号。
 * 这一条是踩出来的——2026-08-28 的 major 只改了 `DS 9.0.8 → 10.0.0`，紧挨着的
 * `design-system 9.0.8` 原样留着，页脚于是自相矛盾，而本守卫当时报绿。
 * 同一行里的两个数指同一件事，对不上就是错，检查它零成本。
 *
 * ── 实测抓到过什么 ──
 * 接入当天即抓到：把伞包 bump 到 9.0.9 而不改文档，六份 Artifact 底本 + 六份
 * 仓内文档全部报错（见 self-test 的 check-doc-version 用例）。
 *
 * 用法：node scripts/docs/check-doc-version.mjs
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PKG = path.join(ROOT, "packages/design-system/package.json");

const { version } = JSON.parse(await readFile(PKG, "utf8"));

const problems = [];

/** 仓内文档：头部的「适用版本：**DS x.y.z**」。 */
const DOCS = path.join(ROOT, "docs");
for (const name of (await readdir(DOCS)).filter((f) => /^\d.*\.md$/.test(f))) {
  const text = await readFile(path.join(DOCS, name), "utf8");
  const m = text.match(/适用版本：\*\*DS (\d+\.\d+\.\d+)\*\*/);
  if (!m) {
    problems.push(`docs/${name}：头部没有「适用版本：**DS x.y.z**」`);
  } else if (m[1] !== version) {
    problems.push(`docs/${name}：写的是 DS ${m[1]}，伞包实际是 ${version}`);
  }
}

/** Artifact 底本：页脚的「· DS x.y.z ·」。参照物不算，它是别人的页面。 */
const ART = path.join(ROOT, "docs/artifacts");
for (const name of (await readdir(ART)).filter(
  (f) => f.endsWith(".html") && !f.startsWith("_"),
)) {
  const text = await readFile(path.join(ART, name), "utf8");
  const foot = text.match(/<div class="foot">([^<]*)<\/div>/);
  if (!foot) {
    problems.push(`docs/artifacts/${name}：没有页脚`);
    continue;
  }
  const m = foot[1].match(/·\s*DS (\d+\.\d+\.\d+)\s*·/);
  if (!m) {
    problems.push(`docs/artifacts/${name}：页脚里没有「· DS x.y.z ·」`);
  } else if (m[1] !== version) {
    problems.push(
      `docs/artifacts/${name}：写的是 DS ${m[1]}，伞包实际是 ${version}`,
    );
  }

  // 同一条页脚里若还写了 design-system 的明细版本，它必须是同一个号。
  const inline = foot[1].match(/design-system (\d+\.\d+\.\d+)/);
  if (inline && inline[1] !== version) {
    problems.push(
      `docs/artifacts/${name}：页脚里 design-system 写的是 ${inline[1]}，` +
        `而同一行的 DS 是 ${m ? m[1] : "?"}／伞包实际是 ${version}`,
    );
  }
}

/**
 * 发版说明的**安装表**：它叫人装的必须就是当前版本。
 *
 * ── 补的是哪个盲区 ──
 * 上面那段只看页脚。2026-09-09 核对时 release-notes.html 的页脚已经是 12.2.0
 * （守卫逼着改的），而正文的大标题、§01 安装表整个还停在 10.0.0 那次迁移——
 * **照 §01 装的人会装一个落后两个 major 的版本**。页脚对、正文错，守卫全程报绿。
 *
 * 教训与本文件开头那条同构：盯住的是**代号**（页脚那一行），不是**性质**
 * （这份文档告诉你装的是不是当前版本）。代号会被单独维护到对为止，
 * 而它周围的内容照旧漂。
 *
 * ── 为什么三包都盯，与上面的取舍不同 ──
 * 上面刻意不盯页脚里的 tokens / ui 明细，理由是「每次单包 patch 都要改六份文档」。
 * 这里不一样：安装表**只有这一处**，且它的全部作用就是告诉人装哪三个版本——
 * 写错任何一个，照做的人就装错。一处的维护成本换不出「装错版本」的代价。
 */
const RN = path.join(ART, "release-notes.html");
try {
  const text = await readFile(RN, "utf8");
  const sec = text.match(/<section id="install">([\s\S]*?)<\/section>/);
  if (!sec) {
    problems.push("docs/artifacts/release-notes.html：没有 §01 安装区段（id=install）");
  } else {
    for (const pkg of ["design-system", "design-ui", "design-tokens"]) {
      const actual = JSON.parse(
        await readFile(path.join(ROOT, `packages/${pkg}/package.json`), "utf8"),
      ).version;
      // 安装表里该包那一行：<td class="mono">@vxture/<pkg></td><td class="mono">x.y.z</td>
      const row = sec[1].match(
        // 反斜杠要双写：这是**模板字符串**，`\s` 在其中会被求值成字面 `s`
        // （非法转义序列丢掉反斜杠），正则拿到的就不是空白类了。初稿三条全报
        // 「找不到版本格」，看着像标记变了，其实是这一层转义。
        new RegExp(`@vxture/${pkg}</td>\\s*<td[^>]*>(\\d+\\.\\d+\\.\\d+)</td>`),
      );
      if (!row) {
        problems.push(
          `docs/artifacts/release-notes.html：§01 安装表里找不到 @vxture/${pkg} 的版本格`,
        );
      } else if (row[1] !== actual) {
        problems.push(
          `docs/artifacts/release-notes.html：§01 叫人装 ${pkg} ${row[1]}，实际是 ${actual}`,
        );
      }
    }
  }
} catch (err) {
  if (err.code !== "ENOENT") throw err;
  // 文件不在就是不在——但它一直在，删掉了该有人知道。
  problems.push("docs/artifacts/release-notes.html：文件不存在");
}

if (problems.length > 0) {
  console.error(`文档版本与伞包不一致（伞包 ${version}）：`);
  for (const p of problems) console.error(`  · ${p}`);
  console.error("");
  console.error(
    "发版时文档要跟着走：改完 package.json 就把六份仓内文档的头部与六份",
  );
  console.error("Artifact 底本的页脚一起改，然后重新发布 Artifact。");
  process.exit(1);
}

console.log(`文档版本守卫通过（12 份文档一致声明 DS ${version}）。`);
