/**
 * Comparable category series for BarChart. Values and selection have no domain meaning.
 * Plot coordinates are normalized ratios, not a second spacing scale.
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 */
import * as React from "react";
import type { BarChartDatum } from "./BarChart";
import { Button } from "../../base/form/Button";
import { interactive } from "../../../styles/recipes";
import { cn } from "../../../utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../base/overlay/Tooltip";

export interface CategorySeries {
  readonly key: string;
  readonly label: string;
  readonly values: Readonly<Record<string, number | null>>;
  readonly references?: Readonly<Record<string, number | null>>;
}
const INKS = [
  "var(--primary)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--muted-foreground)",
];
interface Props extends React.HTMLAttributes<HTMLDivElement> {
  data: readonly BarChartDatum[];
  series: readonly CategorySeries[];
  variant?: "bar" | "line" | undefined;
  referenceValue?: number | undefined;
  selectedKey?: string | null | undefined;
  onSelectKey?: ((key: string | null) => void) | undefined;
  formatValue: (value: number) => string;
  plotHeight: string;
}
export const CategorySeriesPlot = React.forwardRef<HTMLDivElement, Props>(
  function CategorySeriesPlot(
    {
      data,
      series,
      variant = "bar",
      referenceValue,
      selectedKey,
      onSelectKey,
      formatValue: fmt,
      plotHeight,
      className,
      ...props
    },
    ref,
  ) {
    const [hidden, setHidden] = React.useState<readonly string[]>([]);
    const [active, setActive] = React.useState<string | null>(null);
    const [pinned, setPinned] = React.useState<string | null>(null);
    const selected = selectedKey === undefined ? pinned : selectedKey;
    const visible = series.filter((s) => !hidden.includes(s.key));
    const values = visible.flatMap((s) =>
      data.flatMap((d) => [s.values[d.key], s.references?.[d.key]]),
    );
    const minimum = Math.min(
      0,
      ...values.filter(
        (v): v is number => typeof v === "number" && Number.isFinite(v),
      ),
    );
    const maximum = Math.max(
      referenceValue ?? 0,
      1,
      ...values.filter(
        (v): v is number => typeof v === "number" && Number.isFinite(v),
      ),
    );
    // Eight percent headroom leaves a visible cap above the last target marker.
    const high = maximum + (maximum - minimum) * 0.08;
    const low = minimum < 0 ? minimum - (maximum - minimum) * 0.08 : 0;
    const position = (v: number) => 100 - ((v - low) / (high - low)) * 100;
    const point = data.find((d) => d.key === (active ?? pinned));
    const plotRef = React.useRef<HTMLDivElement>(null);
    function select(key: string | null) {
      setPinned(key);
      onSelectKey?.(key);
    }
    function keyboard(event: React.KeyboardEvent<HTMLDivElement>) {
      if (event.key === "Escape") {
        setActive(null);
        select(null);
        return;
      }
      if (
        !["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "].includes(
          event.key,
        ) ||
        !data.length
      )
        return;
      event.preventDefault();
      const i = Math.max(
        0,
        data.findIndex((d) => d.key === (active ?? pinned)),
      );
      if (event.key === "Enter" || event.key === " ") {
        const key = data[i]!.key;
        select(selected === key ? null : key);
        return;
      }
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? data.length - 1
            : Math.max(
                0,
                Math.min(
                  data.length - 1,
                  i + (event.key === "ArrowLeft" ? -1 : 1),
                ),
              );
      setActive(data[next]!.key);
    }
    return (
      <div
        ref={ref}
        role="group"
        className={cn("flex w-full min-w-0 flex-col gap-sm", className)}
        {...props}
      >
        <div className="flex flex-wrap items-center justify-center gap-xs">
          {series.map((s, i) => (
            <Button
              key={s.key}
              variant="ghost"
              size="sm"
              aria-pressed={!hidden.includes(s.key)}
              className={cn("gap-xs", hidden.includes(s.key) && "opacity-50")}
              onClick={() =>
                setHidden((old) =>
                  old.includes(s.key)
                    ? old.filter((k) => k !== s.key)
                    : [...old, s.key],
                )
              }
            >
              <span
                aria-hidden
                className="size-xs rounded-full"
                style={{ background: INKS[i % INKS.length] }}
              />
              {s.label}
            </Button>
          ))}
        </div>
        <div
          ref={plotRef}
          tabIndex={0}
          role="group"
          onKeyDown={keyboard}
          className={cn(
            "relative flex w-full items-end border-b border-border",
            interactive,
          )}
          style={{ height: plotHeight }}
          onPointerLeave={() => setActive(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActive(null);
              select(null);
            }
          }}
        >
          {[0, 0.5, 1].map((stop) => (
            <div
              key={stop}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border"
              style={{ top: `${stop * 100}%` }}
            >
              <span className="absolute start-0 text-body-small text-muted-foreground tabular-nums">
                {fmt(high - (high - low) * stop)}
              </span>
            </div>
          ))}
          {referenceValue !== undefined ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/30"
              style={{ top: `${position(referenceValue)}%` }}
            />
          ) : null}
          {variant === "line" ? (
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 size-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {visible.map((s) => {
                const i = series.indexOf(s);
                const segments: string[][] = [[]];
                data.forEach((d, index) => {
                  const v = s.values[d.key];
                  if (v == null || !Number.isFinite(v)) {
                    segments.push([]);
                    return;
                  }
                  segments
                    .at(-1)!
                    .push(
                      `${((index + 0.5) / Math.max(1, data.length)) * 100},${position(v)}`,
                    );
                });
                return segments
                  .filter((x) => x.length)
                  .map((points, j) => (
                    <React.Fragment key={`${s.key}-${j}`}>
                      <polyline
                        points={points.join(" ")}
                        fill="none"
                        stroke={INKS[i % INKS.length]}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      {points.length === 1 ? (
                        <circle
                          cx={points[0]!.split(",")[0]}
                          cy={points[0]!.split(",")[1]}
                          r="0.7"
                          fill={INKS[i % INKS.length]}
                        />
                      ) : null}
                    </React.Fragment>
                  ));
              })}
            </svg>
          ) : null}
          {data.map((d) => (
            <button
              type="button"
              tabIndex={-1}
              key={d.key}
              aria-label={`${d.label}: ${visible.map((s) => `${s.label} ${s.values[d.key] == null ? "\u2014" : fmt(s.values[d.key]!)}`).join("; ")}`}
              onPointerEnter={() => setActive(d.key)}
              onClick={(event) => {
                event.stopPropagation();
                plotRef.current?.focus({ preventScroll: true });
                setActive(d.key);
                select(selected === d.key ? null : d.key);
              }}
              className={cn(
                "relative flex h-full min-w-0 flex-1 items-end justify-center gap-xs border-0 bg-transparent px-xs",
                selected === d.key && "bg-primary-muted",
              )}
            >
              {variant === "bar" ? (
                visible.map((s) => {
                  const value = s.values[d.key],
                    r = s.references?.[d.key];
                  const i = series.indexOf(s);
                  return (
                    <span
                      key={s.key}
                      className="relative h-full min-w-0 flex-1 max-w-control-lg"
                    >
                      {value != null && Number.isFinite(value) ? (
                        <span
                          className="absolute inset-x-0 rounded-t-sm"
                          style={{
                            background: INKS[i % INKS.length],
                            top: `${position(Math.max(0, value))}%`,
                            height: `${Math.abs(position(0) - position(value))}%`,
                          }}
                        />
                      ) : null}
                      {r != null && Number.isFinite(r) ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/30"
                          style={{ top: `${position(r)}%` }}
                        />
                      ) : null}
                    </span>
                  );
                })
              ) : (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 start-1/2 border-s border-dashed border-border"
                />
              )}
            </button>
          ))}
          {point ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip open>
                <TooltipTrigger asChild>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-0 size-px"
                    style={{
                      left: `${((data.indexOf(point) + 0.5) / data.length) * 100}%`,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent
                  variant="surface"
                  side="top"
                  className="pointer-events-none"
                >
                  <div className="flex flex-col gap-xs">
                    <strong>{point.label}</strong>
                    {visible.map((s) => (
                      <div
                        key={s.key}
                        className="flex items-baseline justify-between gap-lg"
                      >
                        <span>{s.label}</span>
                        <span className="tabular-nums">
                          {s.values[point.key] == null
                            ? "\u2014"
                            : fmt(s.values[point.key]!)}
                        </span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        <div className="flex text-center text-body-small text-muted-foreground">
          {data.map((d) => (
            <span
              key={d.key}
              className="min-w-0 flex-1 truncate px-xs"
              title={d.label}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    );
  },
);
