/**
 * BarChart.tsx - 柱状图。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Pattern
 *
 * DS 的第一件数据可视化原语（2026-08-21 owner 定：用量分析各板块"上图下表"，
 * 图为全宽柱状图——按 30 天逐日展开、或按 24 小时展开一天）。只做一件事：
 * 一组 `{label, value}` 按等宽柱子铺满容器宽度，高度按组内最大值归一。
 *
 * 取值全走 T2 语义类：柱体 `bg-primary`（与 Progress 填充同色——同一"量的
 * 表达"在 DS 内不能有两套颜色）、零值柱留 `bg-accent` 基线刻度（有数据的
 * 天与没数据的天要能分开）、基线用 hairline.block（与 DataTable 顶边同规）。
 * 柱高是运行时数据不是设计刻度，只能走内联 style（承自 Progress 的先例）。
 *
 * 横轴标签抽样显示（`labelEvery`，缺省按数据量自动取 ~6 个），未抽中的槽位
 * 以 `invisible` 占位保持网格对齐——标签是刻度不是数据，挤成一排反而不可读。
 *
 * ## 数值怎么读（2026-09-07 owner：「统计分析没有数字？长显示，还是鼠标浮动」）
 *
 * 原来图上一个数字都没有，唯一出口是柱子的原生 `title`——**触屏没有、键盘不可达、
 * 读屏器只拿到 `role="img"`**。所以不是"要不要浮动"的问题：浮动不能是唯一路径。
 * 现在三条路各司其职：
 *
 *   · **纵轴刻度（长显示）**——三档参考线 + 数值。解决"这根有多高"：没有它，同样
 *     形状的图可能是 1 万也可能是 100 万，只能翻到下面的表才知道量级。
 *   · **读数条（长显示 + 悬停/键盘切换）**——默认显示**峰值**那一根，所以图上永远
 *     有一个真数字；鼠标划过或键盘左右键移动时切到那一根。它是真 DOM 文本，读屏器
 *     在浏览模式下读得到，不像 `title` 那样只对鼠标存在。
 *   · **逐柱精确值**——仍在下方配套的表里（"上图下表"不变）。31 根柱子全标数会挤成
 *     一团，而表里本来就有。
 *
 * 键盘：图区是**一个** tab 停靠点（31 个停靠点是灾难），进去后 ← → 逐根移动、
 * Home/End 跳首尾，读数条跟着走。触屏没有悬停，读数条停在峰值——精确值看下方的表。
 *
 * 读屏器的两层角色是**有判据的**：外层 `role="group"` 承调用方传来的 `aria-label`
 * （给整块一个名字），内层图区才是 `role="img"`。外层**不能**是 `img`——那会让整棵
 * 子树变成一张不透明的图，读数条那段真文本反而读不到，正好抵消这次改动的意义。
 * 内层 `img` 的名字取当前读数（`标签: 值`，由调用方的数据生成，不是件里写死的语言），
 * 所以键盘左右移动时读屏器会把新的那一根念出来。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { hairline } from "../../../styles/recipes";

export interface BarChartDatum {
  /** 行键（React key）。 */
  readonly key: string;
  /** 横轴刻度文本（抽样显示）。 */
  readonly label: string;
  readonly value: number;
}

export interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly data: readonly BarChartDatum[];
  /** 纵轴刻度、读数条与悬停 title 的数值格式化（缺省 toLocaleString）。 */
  readonly formatValue?: (value: number) => string;
  /**
   * 每隔几根柱子显示一个横轴标签。缺省自动：≤12 根全显，否则取 ~6 个刻度。
   */
  readonly labelEvery?: number;
  /**
   * 读数条停在峰值时，值前面的那个词（如「峰值」）。**不给就不显示前缀**——
   * DS 零语言假设，一个中文词不能烧死在件里（同 `ConfirmDestructive.titleTemplate`
   * 的判断）。鼠标划到某一根时前缀让位给那根自己的标签。
   */
  readonly peakLabel?: string;
  /** 关掉纵轴刻度与参考线。数据只有两三根、量级本来就一眼能看时可以关。 */
  readonly hideAxis?: boolean;
}

/** 纵轴三档：顶（组内最大）、中、底（0）。 */
const AXIS_STOPS = [1, 0.5, 0] as const;

const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  function BarChart(
    {
      className,
      data,
      formatValue,
      labelEvery,
      peakLabel,
      hideAxis = false,
      ...props
    },
    ref,
  ) {
    const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));
    const max = data.reduce((m, d) => Math.max(m, d.value), 0);
    const every =
      labelEvery ?? (data.length <= 12 ? 1 : Math.ceil(data.length / 6));

    /* 读数条的当前项：鼠标优先，其次键盘位置，都没有就停在峰值——图上永远有一个
       真数字，而不是等人来悬停才出现。 */
    const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
    const [cursor, setCursor] = React.useState<number | null>(null);
    const peakIndex = data.reduce(
      (best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best),
      0,
    );
    const hoveredIndex = hoveredKey
      ? data.findIndex((d) => d.key === hoveredKey)
      : -1;
    const activeIndex =
      hoveredIndex >= 0 ? hoveredIndex : (cursor ?? peakIndex);
    const active = data[activeIndex];
    /* 停在峰值且没人碰过它时，前缀才是「峰值」；被指到某一根时，前缀是那根的标签。 */
    const atPeak = hoveredIndex < 0 && cursor === null;

    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      if (data.length === 0) return;
      const from = cursor ?? peakIndex;
      let next: number | null = null;
      if (event.key === "ArrowRight")
        next = Math.min(data.length - 1, from + 1);
      else if (event.key === "ArrowLeft") next = Math.max(0, from - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = data.length - 1;
      if (next === null) return;
      event.preventDefault();
      setCursor(next);
    }

    return (
      <div
        ref={ref}
        role="group"
        className={cn("flex w-full flex-col gap-xs", className)}
        {...props}
      >
        {/* 读数条：长显示的那个数字。右对齐——它是图的注脚不是标题。 */}
        {active ? (
          <div className="flex items-baseline justify-end gap-xs text-body-sm">
            <span className="min-w-0 truncate text-muted-foreground">
              {atPeak && peakLabel ? peakLabel : active.label}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {fmt(active.value)}
            </span>
          </div>
        ) : null}

        <div className="relative">
          {/* 纵轴刻度 + 参考线。绝对定位铺满图区，不参与柱子的宽度分配；
              `pointer-events-none` 让它不挡悬停。 */}
          {hideAxis ? null : (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex flex-col justify-between"
            >
              {AXIS_STOPS.map((stop) => (
                <span key={stop} className="flex items-center gap-xs">
                  <span className="w-media-sm shrink-0 truncate text-right text-body-sm text-muted-foreground tabular-nums">
                    {fmt(max * stop)}
                  </span>
                  {/* 底档那条线由柱区的 border-b 画，这里只画上面两条 */}
                  <span
                    className={cn(
                      "h-px flex-1",
                      stop === 0 ? "bg-transparent" : "bg-accent",
                    )}
                  />
                </span>
              ))}
            </div>
          )}

          {/* 柱区。左内距给刻度列让位（与刻度列同一档 media-sm，两者因此对齐）。 */}
          <div
            role="img"
            aria-label={
              active ? `${active.label}: ${fmt(active.value)}` : undefined
            }
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setCursor(null)}
            onMouseLeave={() => setHoveredKey(null)}
            className={cn(
              "flex h-media-lg w-full items-end gap-xs border-b outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hairline.block,
              hideAxis ? undefined : "ps-media-sm",
            )}
          >
            {data.map((d, i) => (
              <div
                key={d.key}
                title={`${d.label}: ${fmt(d.value)}`}
                onMouseEnter={() => setHoveredKey(d.key)}
                className="flex h-full flex-1 flex-col justify-end"
              >
                {d.value > 0 && max > 0 ? (
                  <div
                    className={cn(
                      "w-full rounded-t-sm bg-primary transition-all duration-base ease-standard",
                      // 当前读数的那一根压暗一档,让"读的是哪根"看得见
                      i === activeIndex && !atPeak && "bg-primary-hover",
                    )}
                    // 柱高是运行时数据，只能走内联 style（Progress 同款先例）。
                    style={{
                      height: `${Math.max(2, (d.value / max) * 100)}%`,
                    }}
                  />
                ) : (
                  <div className="h-px w-full bg-accent" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "flex w-full gap-xs",
            hideAxis ? undefined : "ps-media-sm",
          )}
        >
          {data.map((d, i) => (
            <span
              key={d.key}
              className={cn(
                "flex-1 overflow-hidden text-center whitespace-nowrap text-body-sm text-muted-foreground tabular-nums",
                i % every !== 0 && "invisible",
              )}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    );
  },
);

BarChart.displayName = "BarChart";

export { BarChart };
