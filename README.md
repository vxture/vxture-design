# Vxture Design System

设计系统的独立开发仓。三个发布包 + 一个私有预览面。

| 包                       | 版本   | 职责                                                              | 依赖              |
| ------------------------ | ------ | ----------------------------------------------------------------- | ----------------- |
| `@vxture/design-tokens`  | 3.0.0  | T1 原子层（Tailwind theme 的完整镜像）+ T2 语义层                 | 无 `@vxture` 依赖 |
| `@vxture/design-ui`      | 7.0.0  | 组件实现                                                          | design-tokens     |
| `@vxture/design-system`  | 10.0.0 | 伞包 + 运行时接线（主题 / 密度 / 字号 provider、shell、品牌样式） | tokens + ui       |
| `@vxture/design-preview` | —      | 预览面（**私有，不发布**）——DS 唯一的真实渲染消费方               | design-system     |

依赖是单向的，没有循环，也**不依赖任何平台包**。

## 上手

```bash
pnpm install
pnpm build            # 必须按 tokens → ui → system 的顺序，脚本已固化
pnpm test:guardrails  # 先证明仪器活着
pnpm guardrails       # 十一道守卫
pnpm test             # 808 条用例
```

`pnpm build` 的顺序是硬约束：伞包的类型引用的是另两包的**产物**（`.d.ts`），
不是源码，而 `type-check` 自己不产出声明。不先构建就必然 `TS2307`，
且这个失败**只在干净检出上出现**——本地留着上一次的 `dist`，看起来一直是绿的。

**`test:guardrails` 排在 `guardrails` 前面，顺序有意义。** 守卫坏掉的表现和它
正常工作的表现都是「绿」；自测会逐条喂一份已知有病的输入，确认它真的出声。
判据见 [`docs/070-audit-playbook.md`](./docs/070-audit-playbook.md) §1.1。

## 十一道守卫

`pnpm guardrails` 串起来一次跑完，十一条**全部有变异用例**。

| 命令                        | 守什么                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `lint:design-tokens`        | T1 与 Tailwind 基线同步、T2 生成物同步、工具类真能产出、明暗/密度/字号三轴的键集一致                   |
| `lint:design`               | DS 规范（存量债由 baseline 钉住）                                                                      |
| `lint:design-classes`       | 组件类名**真能产出**——982 处类名喂进真实的 Tailwind 编译器                                             |
| `lint:design-exports`       | 公开入口快照，改导出面必须显式重生成                                                                   |
| `lint:design-preview`       | 每个组件都有预览条目                                                                                   |
| `lint:design-i18n`          | 组件里不出现中日韩字符——文案由调用方传入                                                               |
| `lint:control-chars`        | 源码里不混入字面控制字符（**曾让四条检查的正则永远匹配不上**）                                         |
| `lint:doc-shape`            | 六份 Artifact 底本与参照物同形                                                                         |
| `lint:doc-version`          | 十二份文档声称的 DS 版本 == 伞包实际版本                                                               |
| `lint:server-entry`         | `/server` 在 `--conditions react-server` 下**真的可 import**                                           |
| `lint:packed-consumability` | 按 **registry 安装形态**验：`@source` 目标在包里、目标里真扫得到工具类、`/server` 类型面不宽于运行时面 |

## 三处取舍，写下来免得被当成疏忽

**`tailwindcss` 钉在 `4.2.1`**（根 `pnpm.overrides`）。全新安装会浮到更高版本，
而 T1 是 Tailwind `theme.css` 的完整镜像，版本一变基线就漂、守卫立刻报错。
**解钉是一项独立工作**——升级要单独做，那样出问题时才分得清是谁引起的。

**`packages/design-*` 的嵌套保留了。** 独立仓里这层 `design/` 是冗余的，但路径
写死在 19 个守卫与管线文件里。拉平布局同样是一项独立工作。

**`check-design-system.mjs` 是双管辖的**：一半管 DS 自身，一半管消费方怎么用 DS
（门户的 `globals.css`、admin 的 style entry）。拆仓把它的两半分到了两个仓，
所以它现在**跳过本仓不存在的扫描根**——不是放宽判据（平台仓里移走一个受管辖的
门户文件，它照样报错，已实测），只是不再对「本仓压根没有的目录」发难。
真正该做的是拆成两份脚本，那是收尾的独立一项。

## 发布

走 `publish-design-system.yml`（`workflow_dispatch` 或 `ds-v*.*.*` tag），
顺序 tokens → ui → system，每包各自判断该版本是否已存在、已存在即跳过，
因此整条流水线幂等。**推标签就是真发布**，没有第二次确认。

规则见 [`docs/050-design-system-release.md`](./docs/050-design-system-release.md)。

**禁止复用已发布的版本号**——消费方的 lockfile 会指向一个内容已变的版本，
且没有任何提示。

## 文档去哪儿找

**先看 [`docs/000-doc-map.md`](./docs/000-doc-map.md)**：它只回答一个问题——
一个具体的疑问该去哪一层找。三层的分工是按**读者**分的，不按主题：

| 层       | 读者                         | 在哪儿                                     |
| -------- | ---------------------------- | ------------------------------------------ |
| 仓内     | 要改 DS 的人                 | `docs/`                                    |
| 随包发布 | 消费方                       | `packages/design-system/docs/`             |
| Artifact | 跨仓读者、评审、半年后的自己 | 底本在 `docs/artifacts/`，发布到 claude.ai |

随包发布那一层里，
[`07-consumption-pitfalls.md`](./packages/design-system/docs/07-consumption-pitfalls.md)
只收「接上去不报错、构建全绿、但结果是错的」这一类，接入方装完就能读到。

**Artifact 的唯一真值源是仓内底本**（`docs/artifacts/*.html`），claude.ai 上的
URL 是产物。不要在网页上直接编辑——两边会分叉且没有任何提示，下次从仓内重发
会静默覆盖掉网页上的改动。
