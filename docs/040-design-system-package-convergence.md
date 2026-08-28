# Design System 包结构规范

适用版本：**DS 10.0.0**
更新：2026-08-27
范围：本仓四个包的职责边界与依赖方向

## 1. 包结构

仓里有四个包，**发布出去的是三个**：

| 包                       | 职责                                                                                 | 依赖        |
| ------------------------ | ------------------------------------------------------------------------------------ | ----------- |
| `@vxture/design-tokens`  | T1 原子 + T2 语义两层 CSS、`Density` / `FontSize` 类型、叠放次序的 TS 面             | **零依赖**  |
| `@vxture/design-ui`      | 无状态组件层：组件、图标、hooks、`cn`、配方层                                        | tokens      |
| `@vxture/design-system`  | 伞包 + 运行时接线：主题 / 密度 / 字号 provider、shell、品牌入口；并 re-export 另两包 | tokens + ui |
| `@vxture/design-preview` | 组件预览站（Next 应用），逐件展示各档形态与状态。**不发布**                          | system      |

**应用只安装 `@vxture/design-system`**，另两包按需单独消费。

`design-preview` **不发布**（`private: true`），只在仓内跑，而且**只依赖伞包**——它以
消费方的身份接入，走的是消费方走的那条路。它同时是一条守卫的对象：
`check-preview-coverage` 要求 `components/` 下每个 `.tsx` 都有预览条目——**没有预览的
组件等于没人看过它在各档下长什么样**。

### 1.1 各包的存在理由

**tokens 零依赖是核心价值。** v4 下 token 层是纯 CSS。与 React 组件库捆在一起时，任何只要品牌色的消费方（营销页、邮件模板、Figma 反向同步、未来的移动端）都要背上 React / Radix / Phosphor 的 peer 依赖。

**ui 独立可测。** 与运行时机制解耦后可单独跑视觉回归、单独发版，不受主题与外壳改动牵连。

**system 是运行时接线 + 单一安装点。** 提供把 token 接入运行应用的机制（主题、密度、字号），并让应用免于自行协调三包版本。

## 2. 硬约束

### 2.1 依赖图必须严格线性

```
design-tokens  →  design-ui  →  design-system
```

**`design-ui` 永不 import `design-system`。** 这是保持线性的唯一规则，由仓库守卫组（`pnpm guardrails`）硬门强制。

`Density` / `FontSize` 类型下沉到 tokens，组件层因此不需要反向引用运行时。伞包里
留下的两个组件（`ShellLauncher` / `ShellSidebarNav`）是因为要复用同目录的运行时接线，
不是分层破例。

### 2.2 伞包精确 pin 版本

`design-system` 对另两包用**精确版本**（`"@vxture/design-tokens": "1.2.3"`），不用 `^`。否则消费方会装到三包版本错配的组合。

### 2.3 样式归属

**组件样式必须与组件同包**，否则组件包不完整——装了 `design-ui` 却拿不到它自己的样式。

组件的视觉现在不靠散装 CSS 文件承载：跨组件恒定的类名片段收在
`design-ui/src/styles/recipes.ts`（配方层，见 `060-design-system.md` §1.2.2），
其余写在各组件自己的 cva 里。`design-tokens` 只出 token 层的 CSS。

## 3. 发布

三包有序发布，前者发布成功后者才能发：

```
design-tokens  →  design-ui  →  design-system
```

发布流程、SemVer 判定、dry-run 与发布后验证见 `050-design-system-release.md`（同步升 2.0.0）。

守卫按包拆分：exports 快照、`lint:design*` 各包各一套。

## 4. Tailwind v4 约定

### 4.1 T2 全量注册 `@theme`

所有 T2 语义 token 注册进 `@theme`，组件使用真工具类（`h-control-lg`、`gap-md`、`ease-standard`），**禁止任意值语法**（`h-(--control-height-lg)`）。后者是 v3 时代"token 运行时拿不到"的思维残留，v4 无此限制——已实测 `@theme` 支持命名档位。

例外：`--radius-*` 等与 Tailwind 内置同名的命名空间，取值必须与内置一致后方可注册（见 `065-design-token-pipeline.md` §4.2）。

### 4.2 单一词汇

只保留 shadcn / Tailwind 命名。遗留 `--vx-*` 语义名与 `bg-vx-*` 工具类经 codemod 迁移后删除。

**T1 保留 `--vx-` 前缀**——它不进 `@theme`、不产出工具类，前缀用于与 T2/Tailwind 命名空间区隔。

### 4.3 遗留词汇已清空

`bg-vx-*` 工具类、`tokens-*.css`、`platform-*.css` 均已归零。仍在的 `var(--vx-*)`
引用是 **T1 原子层的正常用法**（T2 语义指向 T1），不是遗留债——见 §4.2。

判据保留：**删除必须由 codemod 驱动，且 codemod 必须有前后等价性验证。** 手工删除
或让引用悬空一律禁止——**CSS 对未定义变量静默失效，不会报错**，删错了没有任何声音。

## 5. 关联文档

- `docs/050-design-system-release.md` —— 三包发布与 SemVer
- `packages/design-system/docs/` —— 对外使用规范（随包发布）
- `docs/060-design-system.md` —— DS 内部工程规范
- `docs/065-design-token-pipeline.md` —— token 构建与 T1/T2/T3 边界
