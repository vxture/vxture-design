/**
 * Progress.tsx - 进度条。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Feedback
 *
 * 结构照 shadcn 官方 Progress，取值换成 T2 语义类。轨道语法对齐本仓已有的
 * 用量条（TokenCounter）：`bg-accent` 轨道 + `rounded-4xl` 封头——同一形状的
 * 东西在 DS 内不能有两套画法。填充用位移不用改宽度：宽度过渡会触发布局，
 * 位移只走合成层，这一条承自上游。
 *
 * ⚠ `value` 必须**同时**交给 Root 与位移。上游 shadcn 把它从 props 里解构走
 * 之后只用来算 transform，忘了传回 Root——于是 Radix 认不出取值，整条进度条
 * 对读屏器永远是 `indeterminate`，`aria-valuenow` 一次都发不出去：看得见
 * 「已完成 70%」，听到的却是「正在忙」。位移同样要按 `max` 折算，否则
 * `max={50} value={25}` 会画在 25% 而不是一半。
 */

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../../../utils/cn";

export interface ProgressProps extends React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> {}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  function Progress({ className, value, max = 100, ...props }, ref) {
    // Radix 对越界值与 NaN 一律按「未定值」处理，位移这边跟着它走：认不出的
    // 取值画空条，而不是画出一条越界的色带盖住旁边的东西。
    const ratio =
      typeof value === "number" && Number.isFinite(value) && max > 0
        ? Math.max(0, Math.min(1, value / max))
        : 0;
    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={value}
        max={max}
        className={cn(
          "relative h-xs w-full overflow-hidden rounded-4xl bg-accent",
          className,
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full flex-1 rounded-4xl bg-primary transition-all duration-base ease-standard"
          // 进度是运行时数据不是设计刻度，只能走内联 style。
          style={{ transform: `translateX(-${100 - ratio * 100}%)` }}
        />
      </ProgressPrimitive.Root>
    );
  },
);

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
