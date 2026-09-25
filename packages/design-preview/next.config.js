import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* 直接指向源码而非 dist：预览面的用途就是看改动的即时效果，走构建产物等于
 * 每改一行都要重新 build。产品不这么做——它们消费发布出去的包。 */
const alias = "../../design-system/src/client.ts";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* 开发指示灯浮在左下角，正好压住侧栏底部的模式开关。这个应用整个就是拿来看界面的，
   * 框架的调试挂件不该盖在被看的东西上面。 */
  devIndicators: false,
  experimental: { webpackBuildWorker: false },
  transpilePackages: ["@vxture/design-system"],
  turbopack: {
    resolveAlias: { "@vxture/design-system": alias },
  },
  webpack: (config) => {
    /* 键末尾的 $ 是**精确匹配**：只把根入口指向源码。webpack 的别名默认按前缀
     * 替换，不带 $ 时 "@vxture/design-system/assets/x.svg" 会被改写成
     * "src/client.ts/assets/x.svg"，生产构建直接 Module not found；子路径应按包的
     * exports 正常解析（2026-09-26 CI 查到，dev 走 turbopack 没暴露）。 */
    config.resolve.alias["@vxture/design-system$"] = join(__dirname, alias);
    return config;
  },
};

export default nextConfig;
