/**
 * BarChart.tsx - Responsive category plots with a persistent exact-value readout.
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-11-18
 */

import * as React from "react";
import { hairline } from "../../../styles/recipes";
import { cn } from "../../../utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../base/overlay/Tooltip";

// ===== Public contract and plot geometry =====

export interface BarChartDatum {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** Optional context shown with the exact value. */
  readonly description?: string;
}

const PLOT_HEIGHT = {
  compact: "var(--spacing-media-md)",
  default: "var(--spacing-media-lg)",
  tall: "calc(var(--spacing-media-3xl) + var(--spacing-media-xl))",
} as const;

export interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly data: readonly BarChartDatum[];
  readonly formatValue?: (value: number) => string;
  /** Requested label interval. Narrow plots may skip additional labels. */
  readonly labelEvery?: number;
  readonly peakLabel?: string;
  readonly hideAxis?: boolean;
  /** Height of the plot alone. The enclosing card follows its content. */
  readonly plotHeight?: keyof typeof PLOT_HEIGHT;
}

const AXIS_STOPS = [1, 0.5, 0] as const;

function useLabelCapacity() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = React.useState<number>();
  React.useEffect(() => {
    const plot = ref.current;
    if (!plot || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const fontSize = parseFloat(getComputedStyle(plot).fontSize);
      const width = plot.clientWidth;
      if (width > 0 && fontSize > 0) {
        // Allow roughly six text cells per tick; long names get a second line.
        setCapacity(Math.max(1, Math.floor(width / (fontSize * 6))));
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);
  return { ref, capacity };
}

// ===== Chart rendering and interaction =====

const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  function BarChart(
    {
      className,
      data,
      formatValue,
      labelEvery,
      peakLabel,
      hideAxis = false,
      plotHeight = "default",
      ...props
    },
    ref,
  ) {
    const plot = useLabelCapacity();
    const fmt =
      formatValue ?? ((value: number) => value.toLocaleString("en-US"));
    const max = data.reduce((peak, datum) => Math.max(peak, datum.value), 0);
    const length = data.length;
    const requestedInterval =
      labelEvery !== undefined && Number.isFinite(labelEvery)
        ? Math.max(1, Math.floor(labelEvery))
        : length <= 12
          ? 1
          : Math.ceil(length / 6);
    const every = Math.min(
      Math.max(1, length),
      Math.max(
        requestedInterval,
        Math.ceil(length / (plot.capacity ?? Infinity)),
      ),
    );
    const peakIndex = data.findIndex((datum) => datum.value === max);
    const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
    const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
    const hoveredIndex = data.findIndex((datum) => datum.key === hoveredKey);
    const selectedIndex = data.findIndex((datum) => datum.key === selectedKey);
    const activeIndex = hoveredIndex >= 0 ? hoveredIndex : selectedIndex;
    const atPeak = activeIndex < 0;
    const active = data[atPeak ? Math.max(0, peakIndex) : activeIndex];

    function clearSelection() {
      setHoveredKey(null);
      setSelectedKey(null);
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      if (event.key === "Escape") {
        clearSelection();
        return;
      }
      if (length === 0) return;
      const from = activeIndex < 0 ? Math.max(0, peakIndex) : activeIndex;
      let next: number;
      switch (event.key) {
        case "ArrowRight":
          next = Math.min(length - 1, from + 1);
          break;
        case "ArrowLeft":
          next = Math.max(0, from - 1);
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      setHoveredKey(null);
      setSelectedKey(data[next]?.key ?? null);
    }

    const axisInset = hideAxis
      ? undefined
      : "ps-[calc(var(--spacing-media-sm)+var(--space-xs))]";

    return (
      <div
        ref={ref}
        role="group"
        className={cn("flex min-w-0 w-full flex-col gap-xs", className)}
        {...props}
      >
        {active ? (
          <div className="flex items-baseline justify-end gap-xs text-body-small">
            <span className="min-w-0 truncate text-muted-foreground">
              {atPeak && peakLabel ? peakLabel : active.label}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {fmt(active.value)}
            </span>
          </div>
        ) : null}

        <div className={cn("relative", axisInset)}>
          {!hideAxis ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {AXIS_STOPS.map((stop) =>
                max === 0 && stop !== 0 ? null : (
                  <div
                    key={stop}
                    style={{ top: `${(1 - stop) * 100}%` }}
                    className="absolute inset-x-0 flex -translate-y-1/2 items-center gap-xs"
                  >
                    <span className="w-media-sm shrink-0 truncate text-end text-body-small text-muted-foreground tabular-nums">
                      {fmt(max * stop)}
                    </span>
                    {stop !== 0 ? (
                      <span className="h-px flex-1 bg-accent" />
                    ) : null}
                  </div>
                ),
              )}
            </div>
          ) : null}

          <div
            ref={plot.ref}
            role="img"
            aria-label={
              active ? `${active.label}: ${fmt(active.value)}` : undefined
            }
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={clearSelection}
            onPointerLeave={() => setHoveredKey(null)}
            style={{ height: PLOT_HEIGHT[plotHeight] }}
            className={cn(
              "relative flex items-end border-b text-body-small outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hairline.block,
            )}
          >
            {data.map((datum, index) => (
              <div
                key={datum.key}
                title={`${datum.label}: ${fmt(datum.value)}`}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setHoveredKey(datum.key);
                }}
                onClick={() => setSelectedKey(datum.key)}
                className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              >
                {datum.value > 0 && max > 0 ? (
                  <div
                    className={cn(
                      "w-4/5 max-w-control-md rounded-t-sm bg-primary",
                      index === activeIndex && "bg-primary-hover",
                    )}
                    style={{
                      height: `${Math.max(2, (datum.value / max) * 100)}%`,
                    }}
                  />
                ) : (
                  <div className="h-px w-4/5 max-w-control-md bg-accent" />
                )}
                {index === activeIndex ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 start-1/2 border-s border-dashed border-muted-foreground"
                  />
                ) : null}
              </div>
            ))}

            {/* A single anchor follows the active category without adding tab stops. */}
            {active && !atPeak ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip key={active.key} open>
                  <TooltipTrigger asChild>
                    <span
                      aria-hidden="true"
                      style={{
                        insetInlineStart: `${((activeIndex + 0.5) / length) * 100}%`,
                      }}
                      className="pointer-events-none absolute top-0 size-px"
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    variant="surface"
                    className="pointer-events-none"
                  >
                    <div className="flex flex-col gap-2xs">
                      <span className="font-medium wrap-anywhere">
                        {active.label}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {fmt(active.value)}
                      </span>
                      {active.description ? (
                        <span className="text-muted-foreground wrap-anywhere">
                          {active.description}
                        </span>
                      ) : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>

        <div className={axisInset}>
          <div
            className="grid text-body-small text-muted-foreground tabular-nums"
            style={
              length > 0
                ? {
                    gridTemplateColumns: `repeat(${length * 2}, minmax(0, 1fr))`,
                  }
                : undefined
            }
          >
            {data.map((datum, index) => {
              if (index % every !== 0) {
                return <span key={datum.key} className="hidden invisible" />;
              }
              // Span the unused half-slots on both sides; clip the span at plot edges.
              const center = index * 2 + 1;
              const start = Math.max(0, center - every);
              const end = Math.min(length * 2, center + every);
              const alignment =
                center - start < every
                  ? "text-start"
                  : end - center < every
                    ? "text-end"
                    : "text-center";
              return (
                <span
                  key={datum.key}
                  style={{
                    gridColumn: `${start + 1} / ${end + 1}`,
                    gridRow: 1,
                  }}
                  className={cn(
                    "line-clamp-2 min-w-0 wrap-anywhere",
                    alignment,
                  )}
                >
                  {datum.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

BarChart.displayName = "BarChart";

export { BarChart };
