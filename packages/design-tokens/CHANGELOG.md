# @vxture/design-tokens — 更新日志

发布走 `publish-design-system.yml`（GitHub Packages `npm.pkg.github.com`）。版本规则见
`docs/050-design-system-release.md` §2。

⚠ 本包的破坏性判据与代码包不同：**删掉一个 CSS 变量不会报错，只会静默失效**。
故 token 的删改一律按 major，不做"应该没人用"的推定。

---

## 3.4.0 — 2026-09-25

新增 `code-lg` 排版角色；`title` 与 `overline` 字重从 600 降到 500（minor：
新增 token 档，050 §2）。均为 owner 决定。

### 新增 `code-lg`

- code 族从两档变三档：`code-sm` / `code-md` / `code-lg` 默认 12 / 14 / 16px，
  工具类 `text-code-lg`。等宽体、400 字重，与另两档同。
- 随字号三档整体平移：较小 14、默认 16、较大 18。

### `title` / `overline` 字重 500

- `--title-{xl,lg,md,sm}-font-weight` 与 `--overline-font-weight` 由
  `--vx-font-weight-semibold` 改为 `--vx-font-weight-medium`，三档字号模式同步。
- `heading-*`（600）、`display-*`（700）、`label-*`（500）、`body-*` / `code-*`
  （400）不变。
- 由此 `title` 与 `label` 同重：同字号下两族不再靠字重区分，靠用途与位置。
- 写了 `text-title-*` 又显式加 `font-semibold` / `font-bold` 的地方不跟随
  （显式类优先）。DS 内只有数值展示这样写（`MetricCard` / `LabeledValue` /
  `MetricListCard`），是有意加重，未改。

## 3.3.1 — 2026-09-25

修宽松密度（patch：只改取值，不增删名字，050 §2）。来自 ruyin（#59）。

- **`.density-comfortable` 的 inset 与 row 两组此前与默认档逐字相同**，只有
  control 抬了一档，用户切到「宽松」只看得到控件变高。根因在生成器：默认档的
  inset / row 取的是 `SPACING_SCALE` 最宽那一列（原宽松的取值），中间列闲置，
  宽松档没有更宽的值可取。
- 现在表的三列就是 compact / default / comfortable，三族按同一个列号取值。
  宽松档 inset 往上挪一格（`md` 16→24、`lg` 24→32、`7xl` 128→160；`2xs` 只到
  6px），row 放大 8 到 16px（`row-md` 56→64）。control 仍是 ±1 档。
- **默认档与紧凑档一个值都没动**（逐行对照生成物确认）。
- 生成器断言从「三档非递减」收紧为「严格递增（`none` 除外）」，两档相等直接
  报错，防止这种情况再出现。

## 3.0.0 — 2026-08-28

**移除 `--spacing-none` 的 `@theme` 注册**（major：删 token 一律按 major）。

`none` 是 CSS 全局关键字，在不同属性上含义不同：`padding` 上我们想表达的是 0，
而 `max-width: none` 是"无上限"、`line-height` 的 Tailwind 原义是 1。把字面词
`none` 登记进 spacing 命名空间后，**凡是读 spacing 档的工具类族都会把 `X-none`
解析成 0**——Tailwind 不区分"这个族的 none 是不是 0"。

实测 admin 编译产物，14 个 `*-none` 工具类落到这一档，12 个是对的
（p / px / pt / gap / top / right / bottom / inset-x），2 个是错的：

    .leading-none { line-height: var(--space-none) }   → 0，应为 1
    .max-w-none   { max-width: none;
                    max-width: var(--space-none) }     → 0，应为 none

后者尤其隐蔽：Tailwind 先输出自己的 `max-width: none`，再被本档覆盖，**类名照常
生成**，肉眼与「类是否产出」的检查都看不出异常。实际后果：三个门户 18 处
`DialogTitle` 行高归零、标题与描述叠字；对话框写 `max-w-none` 被夹成 34px 宽。

**升级要做的**：`p-none` / `gap-none` / `pt-none` 这类不再产出工具类，改写成
Tailwind 内建的 `p-0` / `gap-0` / `pt-0`——含义完全相同，且它们本来就在
tailwind-merge 的刻度表里，同组冲突还能被正确合并（`p-none` 一直不能）。
`--space-none` 作为语义取值仍然存在，CSS 里引用写 `var(--space-none)`。

守卫：`check-utilities.mjs` 新增"关键字档不得被间距档遮蔽"断言，且改为编译
**消费方真正编的那条链**（design-system 的 `globals.css`）而不是只编 tokens——
在窄链上 `max-w-none` 是干净的，只有真链才复现，守卫编窄了等于自发假绿灯。

## 2.2.3 — 2026-08-22

修 `repository.url` 的 scheme 前缀（patch，050 §4）。

- GitHub Packages 的「Repository source」校验只认裸的 `https://github.com/OWNER/REPO.git`，
  `git+https://...` 会被当成非 GitHub 来源，判定为无法校验。去掉 `git+` 前缀，
  `type`/`directory` 不变。

## 2.2.2 — 2026-08-21

修 `package.json` 的 `repository` 字段（patch，050 §4）。

- GitHub Packages 的「Repository source」是直接读 `package.json` 的 `repository`
  字段渲染的，不是按实际发布来源自动判定——2.2.1 的字段值不准确，包设置页因此
  显示归属有误。改指 `vxture/vxture-design`。

## 2.2.1 — 2026-08-21

重新建立本包的可发布状态（patch，050 §4 / issue #1）。产物内容与 2.2.0 一致，
版本号 +1 仅为解除发布流水线的历史阻塞。

## 2.2.0 — 2026-08-21

新增导出（minor，050 §2）。

- **新增：`THEME_CONSTANTS` / `PREFERENCE_CONSTANTS`**（`src/persistence.ts`）。
  本包本就拥有模式轴的**取值与类名**（DENSITIES / FONT_SIZES / densityClass /
  fontSizeClass），这两组是同一件事的另一半——那些取值**存在哪、叫什么键**
  （localStorage / cookie / data-theme / 广播事件）。这类纯表现层契约归属
  design-tokens，不依赖任何业务包，设计三包因此能作为自足单元发布。零运行时
  依赖不变。
- 消费方引用方式：从 `@vxture/design-system`（伞包已具名再导出）或
  `@vxture/design-tokens` 取用。

## 2.1.0 — 2026-08-18

纯增量，无删改——minor。

### ✨ 新增

- **T2 `--container-panel-xl: 58rem`**——panel 梯补超宽档（双栏表单、并排预览），
  owner 批准新增；@theme 字面量消费方为 design-ui Dialog 的 `width="xl"` 档
  （v4 只发射被工具类字面量消费的变量，无消费方会静默失效）。
- **T1 `--vx-radius-full: 9999px`**（EXTENSIONS 扩展）——胶囊/圆点档。Tailwind 的
  `rounded-full` 是硬编码 `calc(infinity*1px)`、不进 theme，CSS 文件层（取值桥/
  遗留层）此前没有可引用的 var 面；自 shell-template 同名同值收编，零漂移。

### 🔧 取值调整（不增删名字，patch 级随批）

- **`font/sans` 覆盖栈**补中文系统回退：`'PingFang SC', 'Microsoft YaHei'` 插在
  `'Noto Sans SC'` 与 `ui-sans-serif` 之间——webfont 未载入时中文落系统 CJK 字形，
  而非无中文字形的 ui-sans-serif。自 shell-template 的刻意设计经生成器管路收编。

---

## 2.0.0 — 2026-08-17

首个版本。从 `@vxture/design-system` 拆出，零运行时依赖。

版本号从 2.0.0 起：按 050 §2.1「major 号在批次开启时已定，批次内不重复决策」，
随三包同批的号走，而不是自己另起一个 1.0.0。

### 内容

- **T1 原子层** —— Tailwind v4 theme 的完整镜像，由 `scripts/design-tokens/generate-foundation.mjs`
  直接读上游 `theme.css` 生成，一致性由构造保证。全部偏离登记在 `foundation-policy.mjs`：
  扩展（`text-3xs/2xs`、`breakpoint-xs/3xl/4xl/5xl`、`font-brand/cjk`、时长档）、
  覆盖（`font-sans` / `font-mono` 的字体栈）、减法（色板只留六个色相加品牌色）。
- **T2 语义层** —— 色彩（112 角色 × 明暗）、24 档排版角色（× 字号三档）、
  间距（× 密度三档）、圆角、视觉高度、叠放次序、时长与缓动、透明度、描边宽度、
  图标与媒体尺寸、页面与内容宽度。输入全部在 `scripts/design-tokens/*-policy.mjs`。
- **TS 面** —— `Z_INDEX` 叠放阶梯、`Density` / `FontSize` 及其类名。由同一份策略生成，
  与 CSS 不会漂移。

### 样式入口

- `@vxture/design-tokens/styles/tokens.css` —— T1 + T2 + `@theme` 注册
- `@vxture/design-tokens/styles/tailwind.css` —— Tailwind 基线与暗色变体

一般不直接引用：`@vxture/design-system/styles/globals.css` 已经把它们串在链首。
