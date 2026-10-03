/**
 * StatusBadge.tsx - 状态标。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 收录依据：产品扫描出现频次第二（console 11 / admin 39 处文件）。上游 shadcn
 * 只有 Badge，状态标是在它之上加"语气 + 可选圆点"的一层。
 *
 * 语气刻度见 `./tone`——与 `Banner` 共用一份。
 *
 * 有明确语义的五档默认采用**表意图标 + 语气底色 + 文字**；`neutral` 只保留底色
 * 与文字，不用无语义的短横占位。图标缺省随语气取自 `toneIcons`，因此不必每处
 * 各配一张：成功=对勾、危险=叉、警告=感叹、信息=信息符；`brand` 用 sparkles。
 *
 * 图标是有语义档位的冗余线索，不替代文字；`neutral` 的文字本身就是完整表达。
 * 表格的业务语气全靠这一列表达（行不染色，见 `DataTable` 文件头）。
 *
 * `dot` 是**密集场景的降级**：一行里并排四五个标时圆点比图标省宽。给了 `dot`
 * 就不出图标，两个前导记号不叠。
 *
 * 原实现挂了 .vx-status-badge，且间距与圆点尺寸用的是不跟随三档的裸数值。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Badge, type BadgeProps, type BadgeSize } from "./Badge";
import { Icon, type IconName } from "../../../icons";
import { toneIcons, toneSurfaceClasses, type Tone } from "../../tone";

export type StatusBadgeTone = Tone;

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  readonly tone?: StatusBadgeTone;
  /**
   * 前导图标。缺省随语气（`toneIcons`）。传具体图标名可换——业务态比语气细时
   * 用得上（"停止中"是 warning 语气，但时钟比感叹号准）。`false` 关掉。
   */
  readonly icon?: IconName | false;
  /** 改用圆点而非图标：密集并排场景省宽。给了它就不出图标。 */
  readonly dot?: boolean;
}

/** 与 controlContent 的五档图标规格一致；缺省 Badge 尺寸是 sm。 */
const iconSizeByBadgeSize: Record<BadgeSize, "xs" | "sm"> = {
  xs: "xs",
  sm: "xs",
  md: "sm",
  lg: "sm",
  xl: "sm",
};

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  function StatusBadge(
    {
      className,
      tone = "neutral",
      icon,
      dot = false,
      size,
      children,
      ...props
    },
    ref,
  ) {
    const iconName = dot ? false : (icon ?? toneIcons[tone]);
    return (
      <Badge
        ref={ref}
        variant="outline"
        size={size}
        className={cn(toneSurfaceClasses[tone], className)}
        {...props}
      >
        {dot ? (
          <span
            className="size-2xs rounded-full bg-current"
            aria-hidden="true"
          />
        ) : iconName ? (
          <Icon
            name={iconName}
            size={iconSizeByBadgeSize[size ?? "sm"]}
            aria-hidden="true"
          />
        ) : null}
        {children}
      </Badge>
    );
  },
);

StatusBadge.displayName = "StatusBadge";

export { StatusBadge };
