# @vxture/design-system

Vxture 前端的设计系统伞包：设计 token、UI 组件、可复用模式、主题 / 密度 / 字号运行时、图标隔离层与样式入口。

**应用只装这一个包。** 它把 `@vxture/design-tokens` 与 `@vxture/design-ui` 原样转发，并按**精确版本**钉住它们——直接装那两个包会绕开运行时接线，且版本约束不再由伞包保证。

## 装与接

```bash
pnpm add @vxture/design-system
```

```tsx
// app/layout.tsx
import { FullscreenProvider, ThemeProvider } from "@vxture/design-system";
import "@vxture/design-system/styles/globals.css";
import "@vxture/design-system/styles/brands/vxture.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultMode="system" defaultDensity="default">
          <FullscreenProvider>{children}</FullscreenProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

先引 `styles/globals.css`，再选**一个**品牌入口。

`suppressHydrationWarning` 是必需的：主题在 React 接管之前由一段内联脚本写进
`<html>`，服务端渲染时那个属性还不存在。

## 公开入口

`package.json` 的 `exports` 是唯一权威——下面这份清单由它生成，**从未导出的子路径
导入一律禁止**（`@vxture/design-system/src/**` 之类）。

| 入口                                             | 内容                            |
| ------------------------------------------------ | ------------------------------- |
| `@vxture/design-system`                          | 组件 · provider · shell · hooks |
| `@vxture/design-system/server`                   | 可在 RSC 里引的子集             |
| `@vxture/design-system/tokens`                   | token 的 TS 投影                |
| `@vxture/design-system/types`                    | 类型                            |
| `@vxture/design-system/styles/globals.css`       | **先引这个**                    |
| `@vxture/design-system/styles/brands/vxture.css` | 品牌入口，选一个                |
| `@vxture/design-system/styles/brand.css`         | 品牌基线                        |
| `@vxture/design-system/styles/fonts.css`         | 字体                            |
| `@vxture/design-system/styles/workbench.css`     | 工作台外壳                      |

> `/server` 的子集**比主入口小得多**，而且只有它能进 RSC。判据与常见误接见
> [`docs/07-consumption-pitfalls.md`](./docs/07-consumption-pitfalls.md) §3。

## 装完先读哪一份

完整的消费契约**随包发布**，就在 [`docs/`](./docs/README.md)：

| 想知道                                   | 看                                                                |
| ---------------------------------------- | ----------------------------------------------------------------- |
| 怎么接、允许什么、禁止什么               | [`01-usage.md`](./docs/01-usage.md)                               |
| 色、排版、间距、圆角、阴影各有哪些档     | [`02-visual-spec.md`](./docs/02-visual-spec.md)                   |
| 同一件事该用哪个件（Dialog 还是 Drawer） | [`03-patterns-guide.md`](./docs/03-patterns-guide.md)             |
| T2 token 全族与档位清单                  | [`04-tokens-contract.md`](./docs/04-tokens-contract.md)           |
| 文案怎么写                               | [`05-content-standard.md`](./docs/05-content-standard.md)         |
| 无障碍底线                               | [`06-a11y-standard.md`](./docs/06-a11y-standard.md)               |
| **接上去不报错、构建全绿、结果却是错的** | [`07-consumption-pitfalls.md`](./docs/07-consumption-pitfalls.md) |

最后一份只收那一类坑，**装完就该读一遍**——它们的共同点是编译器不会告诉你。

## 四条禁止

```tsx
// ✗ 内部路径——公开契约只有 exports 声明的那些
import { Button } from "@vxture/design-system/src/components/base/Button";

// ✗ 应用直接用底层图标库——图标有隔离层，换库时不必改调用点
import { User } from "@phosphor-icons/react";

// ✗ 业务源码手写基础控件
<button>Submit</button>;

// ✗ 设计型 inline style——颜色/字号/间距/圆角/阴影一律走 token
<div style={{ color: "#666", padding: 16 }} />;
```

应用可以用业务 class 组装 DS 组件，但**不能定义 `--vx-*` token**，也不能复制 DS 的
基础件。理由与完整清单见 [`01-usage.md`](./docs/01-usage.md) §6。

## 有哪些件

**不在本文枚举。** 抄一份组件表进 README，它必然漂——曾经那份写着 47 个，而实际
是 96 个。权威有三处，都能自动核对：

- `exports` 快照（由 `lint:design-exports` 守着）
- 类型定义——编辑器补全就是最新的清单
- 预览面：每个件在各档下长什么样，由 `lint:design-preview` 保证无遗漏

## 版本

三个包**必须一起升**，伞包对另两包钉精确版本。升级步骤与破坏性变更见各版
`CHANGELOG.md`；跨版本迁移的完整说明在「发版说明」文档里。
