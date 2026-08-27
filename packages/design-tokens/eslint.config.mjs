// 规则本体在仓根 `eslint.config.package.mjs`——三个发布包共用一份。
// `@eslint/js` 由各包自己解析后传进去，理由见那边的文件头。
import js from "@eslint/js";
import { makePackageConfig } from "../../eslint.config.package.mjs";

export default makePackageConfig(js.configs.recommended);
