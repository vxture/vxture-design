# Design System 内部工程规范

适用版本：**DS 10.1.0**
更新：2026-08-27
范围：本仓 DS 三包的维护者与守卫脚本

> **对外使用规范已随包发布**，见 `packages/design-system/docs/`（01 使用契约 / 02 视觉规格 / 03 模式选用 / 04 token 契约 / 05 内容规范 / 06 无障碍达标线），随 `@vxture/design-system` 的 `files` 一同发包。本文只保留内部工程内容：token 管线决策、守卫机制、偏离登记与历史判据。消费方规则一律以包内 docs 为准，本文不得复述。

## 1. 分层与 token 管线（内部）

L0–L5 组件归属与 T1–T4 token 分层的对外定义见包内 `docs/01-usage.md`；T2 全族契约见 `docs/04-tokens-contract.md`。本节只留生成侧机制。

### 1.1 T1 镜像与偏离登记

**T1 是镜像，不是差分**。命名空间、分组、挡位、名称、取值与 Tailwind v4 逐项一致，由 `scripts/design-tokens/generate-primitive.mjs` 读上游 `theme.css` 生成，一致性由构造保证。全部偏离登记在 `scripts/design-tokens/primitive-policy.mjs`，逐条带理由，生成时打印：

- **扩展**（Tailwind 没有的挡位）：`breakpoint-xs/3xl/4xl/5xl`、`font-brand/cjk`（字号档无扩展，最小档即上游的 `xs`=12px）
- **覆盖**（Tailwind 有、DS 判定要改）：`font-sans` / `font-mono` 的字体栈
- **减法**：色板只留 neutral / red / amber / emerald / sky / purple 六个色相（完整色阶）加品牌色

**命名空间必须写对**：`--transition-duration-*`、`--z-index-*`、`--spacing-*`。写错则变量声明成功、工具类不产出且不报错。由 `check-utilities.mjs` 逐族取样实测。

**零增益的族也走 T2**，使分层边界处处成立。**radius 族不指向 T1**：T1 镜像的是 Tailwind 固定阶梯，那条梯子没有基数概念，逐档改才能换基调——这是 T2 对上游值域的有意偏离。

**三族有模式轴**，在模式选择器下声明、由 `theme.css` 以 `@theme inline` 注册，故模式切换自动跟随：色彩（`.dark`）、排版角色（`html.vx-font-*`）、间距（`.density-*`）。其余各族在自己的 semantic 文件里 `@theme` 一处声明即完成注册。

**四族在 T2 落字面量**：z-index、opacity、border-width 上游无原子层可指；容器宽度是因为容器查询里 `var()` 不参与求值。

**T3 已退役**，组件尺寸由 cva variant 承担（三根轴见包内 `docs/01-usage.md` §3）。

### 1.2 尺寸一致性的三道防线

三根轴的对外定义见包内 `docs/01-usage.md` §3。一致性靠三道，只有第二道是真保证：

1. **cva 定义合法集合** —— `size` 只有 sm/default/lg，写别的 TS 报错。
2. **图案件固定"哪个上下文用哪档"** —— 由图案件自己渲染控件或经 context 下发 `size`，调用方没有选择余地。
3. **护栏** —— 禁任意值语法、禁应用层定义 `--vx-*`、禁裸设计值。

### 1.2.1 视觉规格的上游对照留档

规格本体见包内 `docs/02-visual-spec.md`。上游取舍留档：

- 组件视觉规格取 shadcn vega，原语基座保持 Radix。实测三个基座（radix / base / aria）的 vega 类名逐字相同——style 与基座正交，换基座不改变任何视觉。
- 危险动作淡底取自 vega，但不照抄它的 `bg-destructive/10`——alpha 不自适应暗色，vega 必须补写 `dark:` 变体，而我们有十档 destructive 阶，实色结果确定。**采纳的是上游的判断，不是它缺 muted 阶时的将就手段。**
- `destructive-strong` 上游没有，是因为它不发确认对话框图案，从未遇到这个问题。
- 密度不改控件高度：实测 shadcn 的 maia（generous）与 vega 控件高度完全相同（24/32/36/40）。故 `SPACING_SCALE` 的 `control` 族默认档取中间列，`inset` 与 `row` 取最宽列。
- 透明模式的视觉权威 = admin 内容区语法。

### 1.2.2 配方层

T2 装得下"值"，装不下"规则"。跨组件恒定的类名片段抽到 `design-ui/src/styles/recipes.ts`，所有 cva 引用：

| 配方                       | 管什么                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| `interactive`              | 焦点环 + 禁用态 + 过渡                                                        |
| `pressable`                | `active:not-aria-[haspopup]:translate-y-px`（菜单触发器排除，否则面板跟着抖） |
| `expandable`               | 触发器在面板展开期间保持高亮                                                  |
| `invalid`                  | `aria-invalid` 驱动的失败态                                                   |
| `inlineIcon` / `iconInset` | 内联图标的尺寸与单侧内边距收紧                                                |
| `radiusClamp`              | 小控件圆角封顶                                                                |
| `panel` / `overlayMotion`  | 叠层面板外观与进出场（必须 `data-[state=*]`，`data-open:` 永远匹配不上）      |
| `hairline`                 | 发丝线：实线开区块 / 虚线分行分字段                                           |
| `veil`                     | 透明模式叠层三档（58 / 68 / 72%）                                             |
| `revealOnHover`            | 次要操作随父容器 hover / focus-within 渐显                                    |

**只放跨组件恒定的片段**。只有一个组件用到的写在它自己的 cva 里。由 `lint:design-classes` 双向守：清单外的组件手写这些片段报错（挡新增漂移），清单内的组件已经不写了也报错（挡豁免清单腐烂）。

### 1.3 组件目录（内部约定）

目录五级的对外判据见包内 `docs/03-patterns-guide.md`。仓内另有：

- 产品专名一律禁止（D16）——件名不许出现任何产品名，否则它就只属于那一个产品。

## 2. 已切到包内规范的部分

下列内容**只在包内 docs 写全**，本文不复述——它们随 `@vxture/design-system` 发包，
消费方拿到的就是那一份。

| 找什么                                   | 去哪儿                              |
| ---------------------------------------- | ----------------------------------- |
| 结构件命名、标题阶梯                     | `docs/02-visual-spec.md` §7         |
| 品牌标识组合                             | `docs/01-usage.md` §7               |
| 入口白名单、品牌入口、合法使用方式       | `docs/01-usage.md` §5               |
| 跨仓消费最小标准（registry / CI / 验收） | `docs/01-usage.md` §5               |
| 禁止事项                                 | `docs/01-usage.md` §6               |
| 三根尺寸轴的定义                         | `docs/01-usage.md` §3               |
| T1–T4 层级的对外定义                     | `docs/01-usage.md` §2               |
| AI 色彩语义                              | `docs/04-tokens-contract.md` §2     |
| Motion / z-index / breakpoint 档位契约   | `docs/04-tokens-contract.md` §8–§11 |
| 组件目录五级的判据                       | `docs/03-patterns-guide.md`         |
| 视觉刻度本体                             | `docs/02-visual-spec.md`            |
| 文案规范 / 无障碍底线 / 消费方踩过的坑   | `docs/05` / `docs/06` / `docs/07`   |

应用侧越界由守卫拦：AI 色彩原子由 `ds/no-app-ai-primitive-token` 阻止，
z-index 由 `ds/no-hardcoded-z-index` 按白名单兜底。z-index 阶梯依据 Bootstrap /
MUI / Ant Design 三家共识，权威表在 `scripts/design-tokens/semantic-policy.mjs`。

## 3. 新挡位流程

新挡位分两种情况：**T1 缺档**（上游没有的取值）走 §4 的流程补进 `primitive-policy.mjs` 的扩展表；**T2 缺语义名**（取值有了但没有对应角色）补进 `semantic-policy.mjs`。两者都要写理由，生成时逐条打印。就地写死一律不接受。

事实来源只有四处：`src/styles/primitive|semantic/*`（生成物）、`primitive-policy.mjs`（T1 相对上游的偏离）、`semantic-policy.mjs` / `color-policy.mjs` / `typography-policy.mjs`（T2 的全部输入）与规范文档。生成物不得手工编辑，改动会被下一次生成静默覆盖。

## 4. DS 不足时的处理

1. 确认 DS 没有对应 primitive、pattern 或 token。
2. 在 `packages/design-tokens|design-ui|design-system` 中按依赖方向补齐能力。
3. 从公共入口导出，必要时同步 style entry 和 guardrail 白名单。
4. 应用端改为消费 DS 能力。
5. 运行 `pnpm lint:design` 和受影响 package 的 `lint` / `type-check` / `build`。

禁止在应用端先临时实现，再计划以后回收。

## 5. AI 行为约束

AI 修改前端代码时必须：

- 优先从 `@vxture/design-system` 选择组件、Icon、token 和样式入口。
- 遇到 DS 不足时先补 DS 或明确记录缺口。
- 保持业务 class 为组装语义，不把基础控件、颜色、尺度写回应用层。
- 运行或记录对应验收命令。

## 6. 守卫

**十条守卫成一条链**，跑 `pnpm guardrails` 一次全过。逐条的「补的是哪个盲区」写在各
脚本的头注释里——**那段注释是它存在的理由，删了它这条守卫就没人知道为什么不能删**。

十条各自都有变异用例：`pnpm test:guardrails` 会逐条喂一份已知有病的输入，确认它真的
出声。**先跑自测再读守卫输出**——守卫坏掉的表现和它正常工作的表现都是「绿」
（判据见 `070-audit-playbook.md` §1.1）。

`lint:design-exports` 守 DS 公开入口（exports 子路径 + 具名导出 + files +
peerDependencies）。入口变化必须先按 `050-design-system-release.md` 判定 SemVer，
再用 `--update` 显式更新快照。

消费者变更还要运行对应应用的 `lint` / `type-check` / `build`。

## 7. 关联文档

- `packages/design-system/docs/` —— 对外使用规范（随包发布）
- `packages/design-system/README.md`
- `docs/065-design-token-pipeline.md`
- `docs/050-design-system-release.md`
- `docs/040-design-system-package-convergence.md`
