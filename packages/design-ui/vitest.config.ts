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
  },
});
