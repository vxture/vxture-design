/**
 * TableTitleCell.tsx - 列表主列的两行单元格：主信息 + 辅助信息。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * admin 租户列表的行模式（owner 拍板保留，2026-08-03）：每行两层——主信息一行
 * （可点进详情），辅助信息一行（编码、区域一类的补充事实）。提炼成标准件后，
 * 各列表不再各写一遍 flex-col。
 *
 * 相对 admin 的修正（2026-08-05 owner 逐条实测 admin 现状后确认）：
 * - 主信息是**标题**，不是链接：`text-foreground` 深色，hover 才转品牌色。admin
 *   那边用 `Button variant="link"` 渲染，于是常态就是一整列蓝字——链接色是"可点"
 *   的信号，一列全蓝等于没信号，只剩刺眼。
 * - 主信息与辅助行**左缘齐平**：`Button` 自带 `px-md`，标题因此比它下面那行
 *   缩进 16px，两行读起来像不属于同一格。这里主信息不带横向内边距。
 * - 辅助行常规字重——admin 用了 720+，与主信息几乎同重，抢了主信息的位置。
 * - 图标与主信息是**一体**：`gap-sm` 贴住标题（admin 的 16px 让图标看起来更靠近
 *   左边的序号列而不是它要标注的标题）。左侧留白归容器——`DataTable` 的业务列
 *   自带 `px-md`。
 *
 * 字号与字重（owner 2026-09-07，当天两次实测后定稿）：缺省档 `size="md"` =
 * 主 `label-md` **加粗**（`font-semibold`）/ 辅 `body-sm`，默认全局字号下是
 * **14px 加粗 / 12px 常规**。
 *
 * 中途试过 16/14（`size="lg"`，即 DS 11.0.0 那一版），**实测失败并撤回**：本件的
 * 两行行高是钉死的（见下），字号一大就顶开行高，整张表的行距被撑得过分。行距原本
 * 是合理的，问题出在字号。`lg` 档保留但不再是缺省——需要更大字的场合（低密度、
 * 大屏看板）仍可显式传。
 *
 * 层次因此由**字号 + 字重 + 前景色**三者一起给，而不是只靠字号：`label-md` 自带的
 * `medium`(500) 与辅助行的 `normal`(400) 只差一档，在 14/12 这种小字号上几乎读不出
 * 主次。字重加在**主信息**上是拉开层次，与上面那条「辅助行不要加重」不矛盾——那条
 * 说的是别让辅助行去抢主信息的位置。
 *
 * 全部按 token 走，三档全局字号（`vx-font-small` / 默认 / `vx-font-large`）自动
 * 跟随——写死 px 会让本件从那套设定里掉出去。**小号档下两行同为 12px，这是预期的**
 * （owner 2026-09-07）：`label-md` 与 `body-sm` 在 `vx-font-small` 下都解析到
 * `--vx-text-xs`，此时层次全部由字重承担（主加粗 / 辅常规）。字号不是唯一的层次
 * 手段，同号不等于没层次。
 *
 * 图标带 `fallback="placeholder"`：这里的图标名多半由业务数据映射而来，取不到
 * 时要出占位而不是留一个塌掉的空位。
 *
 * 两行的行高钉死（主 `control-2xs` = 20px、辅 `control-3xs` = 16px、行距
 * `gap-2xs` = 4px），不随内容撑：一行数据要能横向连读——本件的主信息得跟同行
 * 其他列的主信息齐平，辅助信息跟辅助信息齐平。主行的 20px 取自 `Badge` 的高度，
 * 所以标题后挂 `titleSuffix` 时这一行也不会比别的格高出一截。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { interactive } from "../../../styles/recipes";
import { Icon, type IconName } from "../../../icons";

export interface TableTitleCellProps {
  readonly title: React.ReactNode;
  /**
   * 紧跟主信息之后的同行内容：多为一两个标（"系统"、"默认"）。它标的是主信息
   * 本身的性质，所以必须与主信息同行——挪到辅助行就变成了另一条事实。
   * 换行时整体下沉，不切断主信息。
   */
  readonly titleSuffix?: React.ReactNode;
  /** 辅助信息行：编码、区域、时间一类的补充事实。 */
  readonly description?: React.ReactNode;
  /**
   * 两行的字号档。缺省 `"md"` = 主 `label-md` 加粗 / 辅 `body-sm`，默认全局字号下
   * 是 14px 加粗 / 12px 常规——**表格用这一档**，见文件头（`lg` 实测顶开行高）。
   *
   * `"lg"` = 主 `label-lg` / 辅 `body-md`（默认档 16/14）留给低密度、大屏看板一类
   * 行高本就宽松的场合。
   *
   * 是**受控词表**不是 className：本件不开自由 CSS 逃生口（见 `DataTable` 文件头
   * 「删三个列级逃生口」那条同理）。
   *
   * 三档全局字号（`vx-font-small` / 默认 / `vx-font-large`）由 token 自己跟随，
   * 本件不参与：写死 px 会让这一件从三档设定里掉出去。
   */
  readonly size?: "md" | "lg";
  readonly icon?: IconName;
  /** 给了主信息就渲染成可点的标题（进详情），不给就是纯文本。 */
  readonly onTitleClick?: () => void;
  /**
   * 原生 `title`：主信息与辅助行都会截断，完整内容得有地方看。只收纯文本——
   * 需要富内容的提示走 `Tooltip`，那是另一件。
   */
  readonly tooltip?: string;
  readonly className?: string;
}

/**
 * 两行的字号取自同一档，避免主副各自被调成不成比例的组合。
 *
 * 主信息一律 `font-semibold`：层次由**字号 + 字重 + 前景色**三者一起给。`label-md`
 * 自带的 `medium`(500) 与辅助行的 `normal`(400) 只差一档，在 14/12 这种小字号上
 * 几乎读不出主次（owner 2026-09-07 实测）。
 */
const SIZE: Record<"md" | "lg", { title: string; description: string }> = {
  md: { title: "text-label-md font-semibold", description: "text-body-sm" },
  lg: { title: "text-label-lg font-semibold", description: "text-body-md" },
};

function TableTitleCell({
  title,
  titleSuffix,
  description,
  size = "md",
  icon,
  onTitleClick,
  tooltip,
  className,
}: TableTitleCellProps) {
  const type = SIZE[size];
  return (
    <span
      className={cn("flex min-w-0 items-center gap-sm", className)}
      {...(tooltip ? { title: tooltip } : {})}
    >
      {icon ? (
        <Icon
          name={icon}
          size="sm"
          fallback="placeholder"
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
        />
      ) : null}
      <span className="flex min-w-0 flex-col gap-2xs">
        <span className="flex min-h-control-2xs min-w-0 flex-wrap items-center gap-xs">
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              /* 悬停只换颜色，**不加下划线**（owner 2026-08-14）。一屏几十行标题
                 各自挂一条下划线，读起来像一列断续的横线，而下划线在这套界面里已经
                 是链接的记号——这里点开的是详情，不是导航。
                 也没有改字重：`font-medium` 会让文字变宽、把同一行后面的内容挤动，
                 悬停时整行发生位移比没有反馈更糟。颜色变化本身已经够指示可点。 */
              className={cn(
                "min-w-0 truncate rounded-sm text-foreground",
                type.title,
                interactive,
                "hover:text-primary-text",
              )}
            >
              {title}
            </button>
          ) : (
            <span
              className={cn("min-w-0 truncate text-foreground", type.title)}
            >
              {title}
            </span>
          )}
          {titleSuffix}
        </span>
        {description ? (
          <span
            className={cn(
              "flex min-h-control-3xs items-center truncate text-muted-foreground",
              type.description,
            )}
          >
            {description}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export { TableTitleCell };
