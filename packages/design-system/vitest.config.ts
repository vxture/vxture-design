/**
 * vitest.config.ts - 伞包的测试配置。
 * @package @vxture/design-system
 *
 * ── 为什么这个包直到 2026-08-26 才有测试 ──
 * 覆盖率从接入那天起就只量 design-ui——`test:coverage` 只存在于那一个包，
 * 而基线快照读的也只是它的 json-summary。于是「行覆盖 83.9%」这个数一路被
 * 当成全仓的，实际是 122 个源文件里的 122 个，另外 23 个**一次都没被数过**。
 *
 * 而漏掉的正是**消费方真正安装的那个包**（应用只装伞包）。这与 hooks 那次是
 * 同一个形状：它不在按包排的清单里，因为清单是按「有没有 test 脚本」隐式排的。
 *
 * ── 这个包里最该测的是什么 ──
 * 不是那 6 个 shell 件，是 `theme/script.ts` 里的 `themeBootstrapScript`：
 * 一段**字符串形态的 JavaScript**，注进每个门户每一页的 `<head>`，在 React
 * 之前跑。tsc 不看它、eslint 不看它，而它自带的 `catch (_) {}` 把一切吞掉——
 * 出错的表现不是报错，是「主题就是不生效」。
 *
 * 测试目录与 design-ui 同规放在 `src/` 之外，理由见那边的头注（守卫扫 src/）。
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.tsx", "tests/**/*.test.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**"],
      /* generated-reexports.ts 是生成物（由 generate-reexports.mjs 产出、
         `--check` 守着同步），不该进覆盖率分母——它没有自己的行为可测。 */
      exclude: [
        /* CSS 随包发出，但它不是 JS——算进覆盖率分母只会凭空多出一串 100%，
           把「伞包基本没测」这个事实稀释掉。 */
        "**/*.css",
        "**/*.types.ts",
        "src/**/index.ts",
        "src/generated-reexports.ts",
        "src/client.ts",
        "src/server.ts",
        "src/tokens-entry.ts",
        "src/types-entry.ts",
      ],
      all: true,
    },
  },
});
