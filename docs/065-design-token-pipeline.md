# Design Token 构建规范

适用版本：**DS 10.0.0**
更新：2026-08-27
范围：`@vxture/design-tokens` 的 T1/T2 两层、`scripts/design-tokens/*` 生成器

本文定义 token 的**唯一构建路径**与权威边界。层级的对外定义见包内
`packages/design-system/docs/01-usage.md` §2，T1 镜像机制见 `060-design-system.md`
§1.1，发布影响见 `050-design-system-release.md`。

> **Figma 播种期已结束。** token 曾由 Figma 的一次性 DTCG 导出播种，`Figma-Token/`
> 是当时的过程文件，集合全部迁入后已删除。现在 T1 由上游 Tailwind 生成、T2 由策略
> 文件生成，**Figma 是下游**——它导入 DS 的产出用于设计推演，不再是任何取值的来源。

## 1. 权威边界

**本仓的 token 产出即唯一真值源。** 其余一切都是应用方——**Figma 也是应用方**。

| 角色                                   | 定位                           | 权威                     |
| -------------------------------------- | ------------------------------ | ------------------------ |
| `scripts/design-tokens/*-policy.mjs`   | **生成器的全部输入**           | **是**                   |
| 上游 `tailwindcss/theme.css`           | T1 的镜像源                    | **是**（经 policy 偏离） |
| `packages/design-tokens/src/styles/**` | 生成物                         | 是（但不可手工编辑）     |
| `src/tokens/*.ts`                      | 真值源的 TS 投影               | 否（由 CSS 层决定）      |
| Figma 文件                             | **应用方**：用 DS token 做设计 | 否                       |

生成物头部标注「由脚本生成，勿手工编辑」并写明源与命令。**手工编辑会被下一次生成
静默覆盖**，且理由无处可查。

## 2. 管线

```
tailwindcss/theme.css ──┐
                        ├─→ generate-primitive.mjs ─→ src/styles/primitive/**.css   (T1)
primitive-policy.mjs ───┘

color-policy.mjs ───────┐
semantic-policy.mjs ────┼─→ generate-semantic*.mjs  ─→ src/styles/semantic/**.css   (T2)
typography-policy.mjs ──┘

                          generate-theme.mjs        ─→ theme.css（@theme 注册）
                          generate-token-ts.mjs     ─→ src/tokens/*.ts（TS 投影）
                                    ↓
                     tokens.css 聚合 → 消费方 / 导出 DTCG 供 Figma 导入
```

每个生成器都提供 `--check`：只校验不写入。`pnpm lint:design-tokens` 串起五个
`--check` 加 `check-utilities` 与 `check-mode-blocks`，已进 `pnpm guardrails`。

**生成物清单不在本文枚举。** 抄一份文件表进散文，它必然漂——判据是 policy 文件，
文件表由生成器决定，`--check` 保证两者同步。

## 3. T1 / T2 的边界

> **T1 是无意义的值刻度，T2 是组件消费的名字。**

判据只有一条：**这个 token 的名字本身是否携带含义。** `--vx-radius-md: 6px` 只是阶梯
上的一格 → T1；`--z-modal: 500`、`--opacity-disabled` 名字即含义 → T2。

T1 内部允许互相引用（`--vx-radius-md: var(--vx-spacing-1-5)` —— 圆角与间距同为长度
量纲，共用一条阶），这不破坏分层。

**零增益的族也走 T2**，使分层边界处处成立。**radius 族不指向 T1**：T1 镜像的是
Tailwind 的固定阶梯，那条梯子没有基数概念，逐档改才能换基调——这是 T2 对上游值域的
有意偏离。

### 3.1 T2 中允许保留裸值的只有三类

| 类别             | 理由                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| 排版角色行高比值 | 各角色比值不同（1.167 / 1.200 / 1.429）——大字号收紧行距是排版惯例，**不可能**引用一条固定倍数刻度 |
| 布局常量         | 侧栏 / 面板 / 字段 / 顶栏尺寸是一次性产品决策，收进原子层只会让长度阶膨胀                         |
| z-index          | 语义梯度，名字即含义                                                                              |

**四族在 T2 落字面量**：z-index、opacity、border-width 上游无原子层可指；容器宽度是
因为容器查询里 `var()` 不参与求值。

### 3.2 T2 按命名空间分文件

**一个命名空间对应一族工具类，一一对应。** 不按来源集合分文件——一个集合常横跨多个
工具类族，而命名空间稳定，且「改这个文件会影响哪族工具类」在文件名上即可见。

### 3.3 三族有模式轴

色彩（`.dark`）、排版角色（`html.vx-font-*`）、间距（`.density-*`）在模式选择器下声明、
由 `theme.css` 以 `@theme inline` 注册，故模式切换自动跟随。其余各族在自己的 semantic
文件里 `@theme` 一处声明即完成注册。

键集一致性由 `check-mode-blocks` 守：任一模式块缺一个变量就报「键集与默认块不一致」。

## 4. 命名规则

### 4.1 命名空间必须写对

`--transition-duration-*`、`--z-index-*`、`--spacing-*`。**写错则变量声明成功、工具类
不产出、且不报错。** 由 `check-utilities.mjs` 逐族取样实测——它真跑一遍 Tailwind 编译，
断言样例工具类确实存在。

### 4.2 变量名不得遮蔽 Tailwind 主题变量，除非同值

Tailwind v4 的工具类编译为对同名主题变量的引用——`rounded-md` 即
`border-radius: var(--radius-md)`。因此在 `:root` 定义同名变量会**直接改掉仓库中该工具
类的全部用法**，无需任何「桥接」动作。

规则：**与 Tailwind 内置同名的命名空间，取值必须与内置一致后方可注册。** 同名同值时
遮蔽无害；同名不同值就是在不声不响地改写上游语义。

排查方法：把 T2 全部变量名与 `tailwindcss/theme.css` 的变量名取交集。新增 token 时
重跑该比对。

### 4.3 T1 前缀

**T1 保留 `--vx-` 前缀**——它不进 `@theme`、不产出工具类，前缀用于与 T2 / Tailwind
命名空间区隔。T2 一律用 shadcn / Tailwind 约定名，不另起一套词汇。

## 5. 偏离机制

T1 是镜像不是差分，**一致性由构造保证**：生成器直接读上游 `theme.css`。靠人工核对
维持「取值等于 Tailwind」是不行的——实测漂成过两套（色板停在 v3 的 hex，而 v4 早已
改用 oklch；shadow 与 ease 各自另起一套）。

全部偏离登记在 `primitive-policy.mjs`，逐条带理由，生成时打印：

- **扩展**（Tailwind 没有的挡位）
- **覆盖**（Tailwind 有、DS 判定要改）
- **减法**（色板只留六个色相加品牌色）

T2 的偏离同理登记在 `semantic-policy.mjs` / `color-policy.mjs` / `typography-policy.mjs`。

> **就地写死一律不接受。** 新挡位分两种：T1 缺档补进 `primitive-policy.mjs` 的扩展表，
> T2 缺语义名补进 `semantic-policy.mjs`。两者都要写理由。

## 6. 变更流程

1. 改对应的 `*-policy.mjs`（**不是**改生成物）。
2. 跑生成器（不带 `--check`），审阅生成物 diff——它说明工程受什么影响。
3. 按 `050-design-system-release.md` 判定 SemVer。**token 值变化属行为变更**，即使公开
   入口未变；**删改 token 一律按 major**——删掉一个 CSS 变量不会报错，只会静默失效。
4. PR 合入、发布。
5. 设计侧从 DS 导出的 DTCG 重新导入 Figma，使设计稿跟上实现。

## 7. 守卫

| 命令                       | 作用                                                 |
| -------------------------- | ---------------------------------------------------- |
| `pnpm lint:design-tokens`  | 五个生成器 `--check` + 工具类实测 + 模式块键集一致性 |
| `pnpm lint:design`         | 分层与裸值守卫                                       |
| `pnpm lint:design-classes` | 组件写的类名真能被 Tailwind 产出                     |
| `pnpm lint:design-exports` | 公开入口快照                                         |

全部已进 `pnpm guardrails`，且各自有变异用例（`pnpm test:guardrails`）。

## 8. 关联文档

- `packages/design-system/docs/01-usage.md` §2 —— 层级的对外定义
- `packages/design-system/docs/04-tokens-contract.md` —— T2 全族契约
- `docs/060-design-system.md` §1.1 —— T1 镜像与偏离登记
- `docs/050-design-system-release.md` —— 发布与 SemVer
- `docs/040-design-system-package-convergence.md` —— 包结构
