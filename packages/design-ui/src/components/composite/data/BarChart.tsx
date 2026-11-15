/**
 * BarChart.tsx - 柱状图。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Pattern
 *
 * Equal category slots align capped bars with responsive axis labels.
 * Charts fill their container and share one plot height and readout alignment.
 * The persistent readout defaults to the peak. Hover, touch and keyboard
 * navigation reveal an exact-value tooltip and a vertical dashed guide.
 * Zero values remain selectable baseline marks, including all-zero datasets.
 * The plot has one tab stop; arrow keys and Home/End select a category.
 * Callers supply localized labels, value formatting and optional context.
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { hairline } from "../../../styles/recipes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../base/overlay/Tooltip";

export interface BarChartDatum {
  /** 行键（React key）。 */
  readonly key: string;
  /** 横轴刻度文本（抽样显示）。 */
  readonly label: string;
  readonly value: number;
  /** Additional context displayed with the exact value in the tooltip. */
  readonly description?: string;
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
      style,
      ...props
    },
    ref,
  ) {
    const chartRef = React.useRef<HTMLDivElement | null>(null);
    const [labelCapacity, setLabelCapacity] = React.useState<number | null>(
      null,
    );
    React.useEffect(() => {
      const chart = chartRef.current;
      if (!chart || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => {
        const plot = chart.querySelector<HTMLElement>('[role="img"]');
        if (!plot) return;
        const computed = getComputedStyle(plot);
        const width =
          plot.clientWidth -
          parseFloat(computed.paddingLeft) -
          parseFloat(computed.paddingRight);
        const fontSize = parseFloat(
          getComputedStyle(chart.querySelector("span") ?? chart).fontSize,
        );
        if (width > 0 && fontSize > 0) {
          // Reserve six text cells per label; longer names wrap onto a second line.
          setLabelCapacity(Math.max(1, Math.floor(width / (fontSize * 6))));
        }
      });
      observer.observe(chart);
      return () => observer.disconnect();
    }, []);
    const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));
    const max = data.reduce((m, d) => Math.max(m, d.value), 0);
    const dense = data.length > 12;
    const every =
      labelEvery ??
      Math.max(
        data.length <= 12 ? 1 : Math.ceil(data.length / 6),
        labelCapacity ? Math.ceil(data.length / labelCapacity) : 1,
      );

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
      if (event.key === "Escape") {
        setCursor(null);
        setHoveredKey(null);
        return;
      }
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
      <TooltipProvider delayDuration={0}>
        <div
          ref={(node) => {
            chartRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          role="group"
          className={cn(
            "mx-auto flex w-full flex-col gap-md px-md sm:px-lg",
            className,
          )}
          style={{
            ...style,
          }}
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
                  <span
                    key={stop}
                    className={cn(
                      "flex items-center gap-md",
                      max === 0 && stop !== 0 && "invisible",
                    )}
                  >
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
              style={{
                height:
                  "calc(var(--spacing-media-3xl) + var(--spacing-media-xl))",
              }}
              role="img"
              aria-label={
                active ? `${active.label}: ${fmt(active.value)}` : undefined
              }
              tabIndex={0}
              onKeyDown={onKeyDown}
              onBlur={() => setCursor(null)}
              onFocus={() => setCursor(peakIndex)}
              onMouseLeave={() => setHoveredKey(null)}
              className={cn(
                "flex w-full items-end border-b outline-none focus-visible:ring-2 focus-visible:ring-ring",
                dense ? "gap-2xs" : "gap-md",
                hairline.block,
                hideAxis ? undefined : "px-media-sm",
              )}
            >
              {data.map((d, i) => (
                <Tooltip key={d.key} open={i === activeIndex && !atPeak}>
                  <TooltipTrigger asChild>
                    <div
                      title={`${d.label}: ${fmt(d.value)}`}
                      onMouseEnter={() => setHoveredKey(d.key)}
                      onPointerDown={(event) => {
                        if (event.pointerType !== "mouse") setCursor(i);
                      }}
                      className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                    >
                      {d.value > 0 && max > 0 ? (
                        <div
                          className={cn(
                            "w-full max-w-control-md rounded-t-sm bg-primary transition-all duration-base ease-standard",
                            // 当前读数的那一根压暗一档,让"读的是哪根"看得见
                            i === activeIndex && !atPeak && "bg-primary-hover",
                          )}
                          // 柱高是运行时数据，只能走内联 style（Progress 同款先例）。
                          style={{
                            height: `${Math.max(2, (d.value / max) * 100)}%`,
                          }}
                        />
                      ) : (
                        <div className="h-px w-full max-w-control-md bg-accent" />
                      )}
                      {i === activeIndex && !atPeak ? (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-muted-foreground"
                        />
                      ) : null}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    variant="surface"
                    className="pointer-events-none px-md py-sm"
                  >
                    <div className="flex flex-col gap-2xs">
                      <span className="font-medium">{d.label}</span>
                      <span className="font-semibold tabular-nums">
                        {fmt(d.value)}
                      </span>
                      {d.description ? (
                        <span className="text-muted-foreground">
                          {d.description}
                        </span>
                      ) : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "flex min-h-media-sm w-full",
              dense ? "gap-2xs" : "gap-md",
              hideAxis ? undefined : "px-media-sm",
            )}
          >
            {data.map((d, i) => (
              <span
                key={d.key}
                className={cn(
                  "relative min-w-0 flex-1 text-center text-body-sm text-muted-foreground tabular-nums",
                  i % every !== 0 && "invisible",
                )}
              >
                <span
                  className="absolute top-0 line-clamp-2 break-words"
                  style={{
                    // Sampled labels can use neighboring unlabeled slots without clipping.
                    width: `calc(${every * 100}% + var(${dense ? "--space-2xs" : "--space-md"}) * ${every - 1})`,
                    left: `calc(${50 - every * 50}% - var(${dense ? "--space-2xs" : "--space-md"}) * ${(every - 1) / 2})`,
                  }}
                >
                  {d.label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </TooltipProvider>
    );
  },
);

BarChart.displayName = "BarChart";

export { BarChart };
