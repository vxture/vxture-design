/**
 * vitest.config.ts - design-ui 的组件测试配置。
 * @package @vxture/design-ui
 *
 * ── 为什么测试放在 src/ 之外 ──
 * `tests/` 而不是 `src/**\/__tests__/`，理由是本仓已有的两条守卫都扫 `src/`：
 *   · check-i18n-seam —— 禁止中日韩字符。测试用例名是**写给维护者的散文**，
 *     和注释同一类，本仓的维护语言是中文
 *   · check-preview-coverage —— 要求 `components/` 下每个 .tsx 都有预览条目
 * 把测试塞进 src/ 会同时撞上这两条，然后逼着给守卫开豁免——**为了迁就测试而给
 * 守卫开口子，是把安全网剪个洞**。挪个目录就没有这个问题。
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
    /* 每个用例后自动清 DOM。不清的话上一条用例留下的 portal 节点会被下一条
       的 getByRole 找到——而且是**间歇性**的，取决于用例顺序。 */
    restoreMocks: true,
    /*
     * 覆盖率不设阈值门槛（thresholds），这是有意的。
     *
     * 阈值会立刻催生「为过线而写的测试」——断言一个必然成立的东西，行数涨了、
     * 什么都没钉住。本仓这一轮的判据始终是「把缺陷放回去，测试红不红」，那件事
     * 覆盖率量不了。
     *
     * 它在这里的作用只有一个：**回答「哪些代码从没被执行过」**。此前判断「测什么」
     * 靠的是 CHANGELOG 里的缺陷记录（好启发）与「件名有没有出现在测试里」（坏
     * 代理——Button 出现只是因为 DialogForm 渲染了它）。数字进基线快照，跨轮可比。
     */
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/components/**",
        "src/icons/**",
        "src/utils/**",
        "src/hooks/**",
      ],
      exclude: ["**/*.types.ts", "src/components/**/index.ts"],
      all: true,
    },
  },
});
