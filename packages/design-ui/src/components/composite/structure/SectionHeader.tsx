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
 * 间距随层级收：图标与标题的间距、描述的字级、虚线距离都跟着档位走。图标顶端与
 * 标题首行对齐、不加偏移——三档的图标与标题行高正好同值（32/28、24/24、20/20，
 * 拉丁行高），原先统一的 `mt-2xs` 反而把图标压低 4px。
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
    lead: "gap-md",
    description: "text-body-md",
    rule: "pb-md",
  },
  3: {
    tag: "h3",
    type: "text-title-md",
    iconSize: "lg",
    lead: "gap-sm",
    description: "text-body-sm",
    rule: "pb-sm",
  },
  4: {
    tag: "h4",
    type: "text-title-sm",
    iconSize: "md",
    lead: "gap-xs",
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

  return (
    <div
      className={cn(
        "flex items-start gap-lg",
        withDivider && ["border-b", rule, hairline.field],
        className,
      )}
      {...props}
    >
      <div className={cn("flex min-w-0 flex-1 items-start", lead)}>
        {icon ? (
          <span className="flex shrink-0 text-primary-text" aria-hidden="true">
            <Icon
              name={icon}
              size={iconSize ?? levelIconSize}
              fallback={iconFallback}
            />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2xs">
          {titleSuffix ? (
            <span className="flex min-w-0 items-center gap-xs">
              <Tag className={cn(type, "min-w-0 text-foreground")}>{title}</Tag>
              <span className="shrink-0">{titleSuffix}</span>
            </span>
          ) : (
            <Tag className={cn(type, "text-foreground")}>{title}</Tag>
          )}
          {description ? (
            <p className={cn(descriptionType, "text-muted-foreground")}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        /* self-end：与标题块下沿对齐，不跟标题首行齐平。 */
        <div className="flex shrink-0 items-center gap-sm self-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export { SectionHeader };
