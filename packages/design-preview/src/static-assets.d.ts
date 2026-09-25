/**
 * static-assets.d.ts - 图片静态导入（svg / png / gif …）的模块类型。
 *
 * Next 生成的 `next-env.d.ts` 会引用这组声明，但那个文件被 .gitignore 忽略，
 * 只在本地跑过 dev / build 后才存在——CI 的 type-check 在它生成之前执行，于是
 * `import logo from "./x.png"` 报 TS2307（2026-09-26 查到）。这里提交一份，
 * 不依赖生成物。
 */
/// <reference types="next/image-types/global" />
