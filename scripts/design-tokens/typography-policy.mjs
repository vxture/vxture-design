/**
 * typography-policy.mjs — 排版角色的定义。
 *
 * 一个角色回答的是"这段文字在版面里是什么身份"，四项属性随之确定：字体族、
 * 字重、字号档、以及行高与字距该怎么取。
 *
 * ── 行高与字距不逐角色写死 ──
 * 两者都由**规则**给出，规则只有两条，取值全部来自 T1，没有任何自造数字：
 *
 *   行高  取字号档自带的行高（T1 每一档都有 `--vx-text-<step>--line-height`，
 *         随字号增大而收紧）；display 与品牌标题统一收紧到 `--vx-leading-tight`。
 *   字距  **一律为零**，全大写除外。逐尺寸曲线（小字放开、大字收紧）逻辑成立，
 *         但在我们的字号区间内最大只值 1.5px，不值得为它养一套机制——判据见
 *         primitive-policy。需要时在使用处用 `tracking-*` 显式声明。
 *
 * 逐角色写死过一版，结果是同一字号在不同角色上出现七组互不相同的行高
 * （同一 12px 上出现 2.0 与 1.33 两种行高），且没有任何依据
 * 能解释差异。规则化之后这类分歧在结构上不可能存在。
 */

/** T1 字号阶梯，字号三档沿此表平移。 */
export const TEXT_LADDER = [
  "3xs",
  "2xs",
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
];

/** 字号三档 = 默认档在阶梯上 −1 / 0 / +1。 */
export const SIZE_MODE_SHIFT = [-1, 0, 1];

/**
 * 行高收紧到 `leading-tight` 的角色：大字号标题。
 *
 * 字号档自带的行高是按正文阅读定的；标题通常只有一到两行，且大字的行间空白在
 * 视觉上被放大，沿用正文行高会显得散。收紧只作用于 display 全族与两级品牌标题
 * ——title 及以下用的是正文字体与正文字号区间，按正文规则处理才对。
 *
 * ⚠ 这里**不再管字距**：字距已随字号档自动收紧，角色再插一手就会出现
 *   "同一字号在不同角色上字距不同"，正是要消除的那类分歧。
 */
export const TIGHT_LEADING_ROLES = /^(display-|heading-[12]$)/;

/**
 * 全大写角色的字距。**字距上唯一的例外。**
 *
 * 大写字母的侧边距是按混排绘制的，连排会挤成一坨。这条与字号无关，是所有排版
 * 指南里最普适的一条，且只影响一个角色——一行例外换一处明确的可读性收益，
 * 与"字距统一为零"的取舍不冲突。
 *
 * `overline` 按定义是标题上方的全大写微型标签，**使用它的组件需自行加
 * `uppercase`**：T2 的 `--text-*` 机制落不了 text-transform。
 */
export const CAPS_ROLES = new Set(["overline"]);
export const CAPS_TRACKING = "--vx-tracking-wider";

/**
 * 中文排版修正轴。
 *
 * 汉字与拉丁字母的排版需求相反，而 `line-height` / `letter-spacing` 对两种文字
 * 一视同仁，所以这必须是一条**模式轴**，不是给每个角色复制一套 `cjk-` 变体——
 * 它作用于任何角色，正如明暗作用于任何颜色。
 *
 修正只有行高一项：+0.15。汉字是全高方块，没有西文的升降部留白，按拉丁行高排会
 * 挤成一片；中文正文的通行区间是 1.7–1.8，拉丁是 1.5。这个差距是肉眼可见的量级。
 *
 * 字距不做修正——拉丁侧已统一为零，没有需要抵消的负值了。
 *
 * ⚠ 写成**加法**而不是另一套取值，是为了与字号三档正交：修正量叠在档位取值上，
 *   三个模式各自的字号档不必再复制一遍。
 *
 * 由 `:lang(zh)` 自动生效：文种是内容属性，不该要求业务显式声明——要求了，
 * 就一定会在中英混排的地方漏掉。
 */
export const CJK_SELECTOR = ":lang(zh)";
export const CJK_LEADING_ADD = 0.15;

/**
 * 排版角色。列依次为：角色名, 字体族, 字重, 默认字号档, 可选模式边界。
 *
 * 3xs / 2xs 只服务极短文本。普通正文从 xs 起步；控件的最小标签另设
 * `label-micro`，默认 10px 且声明 noShrink，字号模式切到 Small 时仍守住 10px。
 * 9px 只留给眉标等不承担独立语义的短元信息。
 */
export const TYPE_ROLES = [
  /* 顶档留一格余量（默认 6xl，大号档用掉 7xl），三档才都跟随字号轴。曾经 display 的
     顶档压在当时的末档上并靠 noGrow 止步，结果大号档下顶上两档撞成同一个字号。 */
  ["display-lg", "brand", "bold", "7xl"],
  ["display-md", "brand", "bold", "6xl"],
  ["display-sm", "brand", "bold", "5xl"],
  ["display-xs", "brand", "bold", "3xl"],

  /* display 已承担营销与首屏大字，heading 只负责产品界面的 h1 / h2 / h3。
     默认 18 / 16 / 14，避免标题压过页面内容；每个角色仍沿原子阶梯提供
     Small / Default / Large 三个字号偏好。删除 title 家族，避免使用者在两套
     近义标题角色之间猜选。 */
  ["heading-1", "brand", "semibold", "lg"],
  ["heading-2", "brand", "semibold", "base"],
  ["heading-3", "brand", "semibold", "sm"],

  /* 正文与标签只保留默认 / 辅助两种用途，不为视觉对称制造 xl / lg / md / sm
     四级矩阵。需要强调的数字、OTP、品牌名直接使用原子字号。 */
  ["body", "sans", "normal", "sm"],
  ["body-small", "sans", "normal", "xs"],

  ["label", "sans", "medium", "sm"],
  ["label-small", "sans", "medium", "xs"],
  ["label-micro", "sans", "medium", "2xs", { noShrink: true }],

  /* 目前只有键位、短代码和技术标识的真实用例；代码编辑器出现后再按需加档。 */
  ["code", "mono", "normal", "xs"],

  ["overline", "sans", "medium", "2xs"],
];

/** 产物里的分组顺序，与角色名前缀一致。 */
export const TYPE_GROUP_ORDER = [
  "display",
  "heading",
  "body",
  "label",
  "code",
  "overline",
];
