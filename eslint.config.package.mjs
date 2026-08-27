/**
 * eslint.config.package.mjs — 三个发布包共用的 flat config。
 *
 * 抽出来的原因很直接：`packages/design-{ui,system,tokens}/eslint.config.mjs`
 * 此前是**三份逐字节相同**的 42 行。SonarCloud 在 PR #39 上报成重复——报得对，
 * 三份实现意味着以后调一条规则要记得改三处，而漏改的那一处不报错，只是那个
 * 包比另外两个松一点，谁也不会注意到。与隔壁 `collect-files.mjs` /
 * `load-tailwind.mjs` 是同一类抽取，理由也是同一条。
 *
 * 不含 design-preview：它是 Next 应用，走 `next/core-web-vitals`，与这三个
 * 库包本就不是同一套规则，硬并进来才是错。
 *
 * 依赖从**各包自己**解析：三个包都在 devDependencies 里声明了 `@eslint/js`
 * 与 `@typescript-eslint/*`，而 ESM 的 import 按**本文件**的位置解析——本文件
 * 在仓根，仓根只有 `@typescript-eslint/*` 没有 `@eslint/js`。故此处不 import
 * `@eslint/js`，改由各包把它传进来（`makePackageConfig(js.configs.recommended)`），
 * 免得为了一条共享配置去动根 package.json 与锁文件。
 *
 * @param {object} jsRecommended 各包传入的 `js.configs.recommended`
 * @returns {object[]} flat config 数组
 */

import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export function makePackageConfig(jsRecommended) {
  return [
    {
      ignores: ["dist/**", "coverage/**", "node_modules/**"],
    },
    jsRecommended,
    {
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaVersion: 2023,
          sourceType: "module",
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      plugins: {
        "@typescript-eslint": tsPlugin,
      },
      rules: {
        ...tsPlugin.configs.recommended.rules,
        "no-undef": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-empty-object-type": [
          "error",
          { allowInterfaces: "with-single-extends" },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
      },
    },
  ];
}
