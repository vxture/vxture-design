# Vxture Design System

设计系统的独立开发仓。三个发布包 + 一个私有预览面。

| 包                       | 版本  | 职责                                                              | 依赖              |
| ------------------------ | ----- | ----------------------------------------------------------------- | ----------------- |
| `@vxture/design-tokens`  | 2.2.2 | T1 原始层（Tailwind theme 的完整镜像）+ T2 语义层                 | 无 `@vxture` 依赖 |
| `@vxture/design-ui`      | 3.1.3 | 组件实现                                                          | design-tokens     |
| `@vxture/design-system`  | 6.4.2 | 伞包 + 运行时接线（主题 / 密度 / 字号 provider、shell、品牌样式） | tokens + ui       |
| `@vxture/design-preview` | —     | 预览面（**私有，不发布**）——DS 唯一的真实渲染消费方               | design-system     |

依赖是单向的，没有循环，也**不依赖任何平台包**——这是 2026-08-21 拆仓的前提，
由 `vxture-platform#346` 完成（主题/偏好契约键从 `@vxture/shared` 迁入 design-tokens）。

## 为什么 scope 仍是 `@vxture`

**GitHub Packages 要求 npm scope 等于发包组织。** 本仓在 `vxture` 组织下，
所以三包继续叫 `@vxture/*`——包身份连续，消费方不必改名，版本线接着走
（`@vxture/design-system` 已到 6.4.2，从 0.1.0 重开会让 `latest` 倒退）。

平台侧的 `@vxture-platform/shared` 是另一条线，不在本仓。

## 上手

```bash
pnpm install
pnpm build          # 必须按 tokens → ui → system 的顺序，脚本已固化
pnpm guardrails     # 七道守卫
```

`pnpm build` 的顺序是硬约束：伞包的类型引用的是另两包的**产物**（`.d.ts`），
不是源码，而 `type-check` 自己不产出声明。不先构建就必然 `TS2307`，
且这个失败**只在干净检出上出现**——本地留着上一次的 `dist`，看起来一直是绿的。

## 七道守卫

| 命令                        | 守什么                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `lint:design-tokens`        | T1 与 Tailwind 基线同步、T2 生成物同步、明暗模式块                                                     |
| `lint:design`               | DS 规范（存量债由 baseline 钉住）                                                                      |
| `lint:design-classes`       | 组件类名**真能产出**（95 组件 / 973 处类名列表）                                                       |
| `lint:design-exports`       | 公开入口快照，改导出面必须显式重生成                                                                   |
| `lint:design-preview`       | 每个组件都有预览条目                                                                                   |
| `lint:server-entry`         | `/server` 在 `--conditions react-server` 下**真的可 import**                                           |
| `lint:packed-consumability` | 按 **registry 安装形态**验：`@source` 目标在包里、目标里真扫得到工具类、`/server` 类型面不宽于运行时面 |

后两道来自 `vxture-platform#347` / `#268`——那两条 issue 的共同形状是
**在开发形态下测不出来，只有消费方会撞上**。两道都经过反向验证（把缺陷退回去，
守卫确实报错），且都跑在**发布之前**。

## 两处拆仓时的取舍，写下来免得被当成疏忽

**`tailwindcss` 钉在 `4.2.1`**（根 `pnpm.overrides`）。全新安装会浮到 4.3.3，
而 T1 是 Tailwind `theme.css` 的完整镜像，版本一变基线就漂、守卫立刻报错。
迁移当天不把 Tailwind 升级混进来——先证明搬运是纯粹的移动，升级另做，
那样出问题时才分得清是谁引起的。**解钉是一项独立工作**。

**`packages/design-*` 的嵌套保留了。** 独立仓里这层 `design/` 是冗余的，
但 53 处路径写死在 14 个守卫与管线文件里。迁移当天再改，出问题时分不清是
"搬坏了"还是"改路径改坏了"。拉平布局同样是一项独立工作。

**`check-design-system.mjs` 是双管辖的**：一半管 DS 自身，一半管消费方怎么用 DS
（门户的 `globals.css`、admin 的 style entry）。拆仓把它的两半分到了两个仓，
所以它现在**跳过本仓不存在的扫描根**——不是放宽判据（平台仓里移走一个受管辖的
门户文件，它照样报错，已实测），只是不再对"本仓压根没有的目录"发难。
真正该做的是拆成两份脚本，那是收尾的独立一项。

## 发布

走 `publish-design-system.yml`（`workflow_dispatch` 或 `ds-v*.*.*` tag），
顺序 tokens → ui → system，每包各自判断该版本是否已存在、已存在即跳过，
因此整条流水线幂等。规则见 [`docs/050-design-system-release.md`](./docs/050-design-system-release.md)。

**禁止复用已发布的版本号**——消费方的 lockfile 会指向一个内容已变的版本，且没有任何提示。

## 对外文档

随包发布的消费契约在 `packages/design-system/docs/`，其中
[`07-consumption-pitfalls.md`](./packages/design-system/docs/07-consumption-pitfalls.md)
只收「接上去不报错、构建全绿、但结果是错的」这一类，接入方装完就能读到。
