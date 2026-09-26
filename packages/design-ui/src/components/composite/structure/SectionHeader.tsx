/**
 * SectionHeader.tsx - 二级及以下的标题区。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 层级由 `level` 给出，同时决定语义元素、排版角色、图标档与间距，几样不会各说各话。
 *
 * ## 标题阶梯（owner 2026-09-26 定稿，取代 2026-08-02 的四档）
 *
 * **level 的数字就是 h 的数字**，整页一套：
 *
 *   level 1 → ViewHeader    <h1> + heading-3 (24px 品牌体) + icon 48   页头（另一件）
 *   level 2 → SectionHeader <h2> + title-lg  (18px)          + icon 32   大板块（缺省）
 *   level 3 → SectionHeader <h3> + title-md  (16px)          + icon 24   板块
 *   level 4 → SectionHeader <h4> + title-sm  (14px)          + icon 20   分组
 *
 * 所以本件只有 2 / 3 / 4 三档——第 1 级是页头，归 `ViewHeader`，一页一个 h1。
 *
 * **为什么这样排**（owner 2026-09-26「四级标题样式混乱」）：
 * - 原 level 4 用 `label-md`，与 level 3 的 `title-sm` 取值完全相同（14px / 500 /
 *   同行高），三、四两级看上去一模一样。根因在 token：`title` 族只有四档，页头
 *   也用 `title-xl`，板块只剩三档，第四档只能去别的族借。
 * - 页头改用 `heading` 族（页头文本），`title` 族四档里的 18 / 16 / 14 全留给板块，
 *   每一级字号都不同。
 * - 原 level 1 也是 h1、level 与 h 错位一格；现在 level 与 h 一一对齐。
 *
 * **一行对齐**（owner 2026-09-26）：图标 | 标题 | 动作在同一行、垂直居中，动作靠右；
 * 描述是第二行，只在标题列下（不在图标下、不在动作下）。不给描述就没有第二行，
 * 不留空位、不留行距。用 grid 排：第一行三格各自居中，描述单独一行，互不牵动——
 * 原先图标与标题顶对齐、动作贴底（self-end），有描述时三者各在各的高度上。
 *
 * 间距随层级收：图标与标题的列间距、描述的字级、虚线距离都跟着档位走。
 *
 * **每一级都带虚线下边框，可关**（`divider={false}`；owner 2026-09-26「每级应该都有
 * 下划线（可显隐）」）。虚线分字段、实线开区块（V4）——标题的线界的是标题与正文。
 *
 * 本件的职责到"每一档长什么样"为止——排版角色、语义元素、两者的对应关系。
 * 放几个、放在哪属于信息结构，不在这里的题目里。
 *
 * 与 `ViewHeader` 的分工：`ViewHeader` 是 view 顶部那个完整区域（眉标、图标底板、
 * 描述、标题旁附加物、右侧动作区），`SectionHeader` 是纯粹的标题阶梯。要那套完整
 * 结构用前者，只要一行标题用后者。
 *
 * 相对原实现（DetailSectionHeading）的三处收窄：
 * - **`icon` 改为可选**。原来是必填，导致没有合适图标的板块只能硬塞一个。
 * - **增 `description` 与 `action`**，让它能直接充当 `Section` 的头部，两处不再
 *   各写一套标题排版——原先 PageSection 自己渲染 h2，与本件的 h2 样式并不一致。
 * - **删掉 `iconClassName` / `copyClassName` 两个逃生口**，理由同 ViewHeader：
 *   逃生口会把内部 DOM 变成公开契约。
 */

import * as React from "react";
import { Icon } from "../../../icons";
import type { IconName, IconSize } from "../../../icons";
import { hairline } from "../../../styles/recipes";
import { cn } from "../../../utils/cn";

/** 2 / 3 / 4，数字即 h 的数字；第 1 级是页头 `ViewHeader`。 */
export type SectionHeaderLevel = 2 | 3 | 4;

export interface SectionHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  readonly title: React.ReactNode;
  /**
   * 标题行内、紧跟标题的挂件：口径说明的 `?`、跳去图表的小图标一类。
   *
   * 与 `action` 分工：`action` 靠右、是这个板块的动作；本槽贴着标题、是标题的
   * 一部分——admin 总览的四个面板头里，"详情"在右端而 `?` 紧贴标题，分属两处
   * （2026-08-05）。同 `TableTitleCell.titleSuffix` 的先例。
   */
  readonly titleSuffix?: React.ReactNode;
  /** 2–4，即 h2–h4；同时决定排版角色、图标档与间距。缺省 2。 */
  readonly level?: SectionHeaderLevel;
  readonly description?: React.ReactNode;
  /** 板块级动作，通常是一个 ghost / outline 按钮。 */
  readonly action?: React.ReactNode;
  readonly icon?: IconName;
  readonly iconSize?: IconSize | number;
  readonly iconFallback?: IconName;
  /** 虚线下边框。缺省每一级都有；`false` 关掉。 */
  readonly divider?: boolean;
}

/**
 * 每档一行，几样属性一起定——分开定就会出现「字是三级、间距是一级」。
 * 第 1 级（h1 / heading-3 / icon 48）属 ViewHeader。
 * ⚠ 类名必须是完整字面量：Tailwind 扫源码文本，拼接出来的类不会生成、也不报错。
 */
const BY_LEVEL = {
  2: {
    tag: "h2",
    type: "text-title-lg",
    iconSize: "xl",
    lead: "gap-x-md",
    description: "text-body-md",
    rule: "pb-md",
  },
  3: {
    tag: "h3",
    type: "text-title-md",
    iconSize: "lg",
    lead: "gap-x-sm",
    description: "text-body-sm",
    rule: "pb-sm",
  },
  4: {
    tag: "h4",
    type: "text-title-sm",
    iconSize: "md",
    lead: "gap-x-xs",
    description: "text-body-sm",
    rule: "pb-xs",
  },
} as const;

function SectionHeader({
  className,
  title,
  titleSuffix,
  level = 2,
  description,
  action,
  icon,
  iconSize,
  iconFallback = "placeholder",
  divider,
  style,
  ...props
}: SectionHeaderProps) {
  const {
    tag: Tag,
    type,
    iconSize: levelIconSize,
    lead,
    description: descriptionType,
    rule,
  } = BY_LEVEL[level];
  const withDivider = divider ?? true;
  /* 有图标三列（图标 | 标题 | 动作），无图标两列——空的图标列也会吃掉一道列间距，
     标题就不贴左了。 */
  const hasIcon = Boolean(icon);
  const titleCol = hasIcon ? "col-start-2" : "col-start-1";
  const actionCol = hasIcon ? "col-start-3" : "col-start-2";

  const heading = (
    <Tag className={cn(type, "min-w-0 text-foreground")}>{title}</Tag>
  );

  return (
    <div
      className={cn(
        "grid items-center gap-y-2xs",
        lead,
        withDivider && ["border-b", rule, hairline.field],
        className,
      )}
      style={{
        // 布局骨架，不是视觉取值：列模板没有对应的 token 工具类。
        gridTemplateColumns: hasIcon
          ? "auto minmax(0, 1fr) auto"
          : "minmax(0, 1fr) auto",
        ...style,
      }}
      {...props}
    >
      {icon ? (
        <span
          className="col-start-1 row-start-1 flex text-primary-text"
          aria-hidden="true"
        >
          <Icon
            name={icon}
            size={iconSize ?? levelIconSize}
            fallback={iconFallback}
          />
        </span>
      ) : null}
      {titleSuffix ? (
        <span
          className={cn(
            titleCol,
            "row-start-1 flex min-w-0 items-center gap-xs",
          )}
        >
          {heading}
          <span className="shrink-0">{titleSuffix}</span>
        </span>
      ) : (
        <div className={cn(titleCol, "row-start-1 min-w-0")}>{heading}</div>
      )}
      {action ? (
        <div
          className={cn(
            actionCol,
            "row-start-1 flex items-center justify-end gap-sm",
          )}
        >
          {action}
        </div>
      ) : null}
      {description ? (
        <p
          className={cn(
            titleCol,
            "row-start-2 min-w-0",
            descriptionType,
            "text-muted-foreground",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export { SectionHeader };
