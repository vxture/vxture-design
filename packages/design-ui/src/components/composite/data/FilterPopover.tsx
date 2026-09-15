"use client";

/**
 * FilterPopover.tsx - 工具行上「更多筛选」钮 + 贴着它弹出的勾选气泡。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * ## 为什么换掉 FilterPanel
 *
 * 12.9.0 的 `FilterPanel` 是左侧抽屉：遮住半个页面、勾完要点「应用」才看得到结果、
 * 选项一行一个把几十个来源拉成长条。owner 2026-09-15 看过线上后否掉：「太丑了，
 * 不能当作模板，会导致大面积降级」。这一件按那次的要求重做：
 *
 * - **常用的筛选不进来**：类型、分类这类取值少、天天用的维度留在工具行做下拉框
 *   （`NativeSelect`），气泡只收剩下那些——取值多、偶尔才筛的维度。
 * - **贴着按钮弹出**，不是侧边抽屉；非模态，**不遮挡主页面**。
 * - **勾一下就生效**（`onChange` 即时回调），表格在气泡旁边跟着变，看得见。
 *   没有「应用」；「确定」只是收起气泡。
 * - **紧凑**：每个维度的选项是一行多项的网格，**数字跟在名称后面**。
 *
 * 读法与 FilterPanel 相同：维度内任一、维度间都要；读法不同的维度（如标签的
 * 「全部命中」）给 `facet.description`。
 *
 * 文案默认英文（DS 基准语），产品在调用点覆盖。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon } from "../../../icons";
import { Button } from "../../base/form/Button";
import { Checkbox } from "../../base/form/Checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../base/overlay/Popover";

export interface FilterFacetOption {
  readonly value: string;
  readonly label: React.ReactNode;
  /** 这个值命中多少条。给了才显示，跟在名称后面；口径由调用方定。 */
  readonly count?: number;
}

export interface FilterFacet {
  /** 维度键。调用方拿它回到自己的查询参数上。 */
  readonly id: string;
  readonly label: React.ReactNode;
  /** 一句话说明这一维度的特殊读法，例如「全部命中」。默认读法（任一）不用写。 */
  readonly description?: React.ReactNode;
  readonly options: readonly FilterFacetOption[];
}

/** 维度键 → 选中的值。没选的维度可以不出现，也可以是空数组，两者等价。 */
export type FilterValue = Readonly<Record<string, readonly string[]>>;

/** 已选数：跨维度的值个数之和。 */
export function countFilterValue(value: FilterValue): number {
  return Object.values(value).reduce((n, values) => n + values.length, 0);
}

export interface FilterPopoverProps {
  readonly facets: readonly FilterFacet[];
  readonly value: FilterValue;
  /** 每勾 / 取消一项、以及清空时立即回调。调用方据此立即重查。 */
  readonly onChange: (value: FilterValue) => void;
  /** 触发钮文案。默认 `More filters`。 */
  readonly label?: string;
  readonly confirmLabel?: string;
  readonly clearLabel?: string;
  /** 某个维度没有可选值时显示。 */
  readonly emptyLabel?: React.ReactNode;
  /**
   * 每行几项。默认 `auto`：一个维度的选项超过 12 个时排三列、气泡加宽到
   * panel-md，否则两列、气泡 overlay xl。owner 2026-09-15：「候选项应该不止这些，面板可以
   * 向下延伸，如果再多，可以每行 3 条」。三列放进 xl（24rem）会把 `sandbaseai` 这种真实
   * 取值截断，所以三列必须连着加宽。
   */
  readonly columns?: 2 | 3 | "auto";
  /** 气泡与触发钮哪一边对齐。工具行靠右时用 `end`（默认）。 */
  readonly align?: "start" | "end";
  readonly disabled?: boolean;
  readonly className?: string;
}

/** 一个维度的选项多于这么多个时，`auto` 排三列。 */
const AUTO_THREE_COLUMNS_ABOVE = 12;

const GRID_COLUMNS: Record<2 | 3, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
};

export function FilterPopover({
  facets,
  value,
  onChange,
  label = "More filters",
  confirmLabel = "Done",
  clearLabel = "Clear",
  emptyLabel = "No options",
  columns = "auto",
  align = "end",
  disabled = false,
  className,
}: FilterPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const baseId = React.useId();
  const active = countFilterValue(value);
  const columnsOf = (facet: FilterFacet): 2 | 3 =>
    columns !== "auto"
      ? columns
      : facet.options.length > AUTO_THREE_COLUMNS_ABOVE
        ? 3
        : 2;
  const anyThree = facets.some((facet) => columnsOf(facet) === 3);

  const toggle = (facetId: string, optionValue: string, checked: boolean) => {
    const current = value[facetId] ?? [];
    const next = checked
      ? current.includes(optionValue)
        ? current
        : [...current, optionValue]
      : current.filter((v) => v !== optionValue);
    onChange({ ...value, [facetId]: next });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={disabled}
          aria-label={active > 0 ? `${label} (${active})` : label}
          className={cn("gap-xs", className)}
        >
          <Icon name="filter" size="sm" aria-hidden="true" />
          <span>{label}</span>
          {active > 0 ? (
            <span
              data-slot="filter-popover-count"
              className="inline-flex min-w-control-2xs items-center justify-center rounded-full bg-primary px-2xs text-label-sm tabular-nums text-primary-foreground"
            >
              {active}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        width="xl"
        align={align}
        data-slot="filter-popover"
        /* 向下延伸到视口里剩下的高度为止（Radix 算好的可用高度），再多才滚；页脚钉住。
           三列时加宽到 panel-md——cn 认得 container 档，这一条会顶掉默认的 overlay-xl。 */
        className={cn(
          "flex max-h-[var(--radix-popover-content-available-height)] flex-col gap-sm p-md",
          anyThree && "w-panel-md",
        )}
      >
        {/* `pb-sm` 不是装饰：Checkbox 的命中区用绝对定位的伪元素上下各外扩 sm，最后一行会从
            滚动区底边探出去，内容不够高也冒出一条滚动条（2026-09-15 预览面实测 142 / 134）。 */}
        <div className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto pr-2xs pb-sm">
          {facets.map((facet) => {
            const chosen = value[facet.id] ?? [];
            const legendId = `${baseId}-${facet.id}`;
            return (
              <section
                key={facet.id}
                role="group"
                aria-labelledby={legendId}
                data-slot="filter-popover-facet"
                className="flex flex-col gap-xs"
              >
                <div className="flex items-baseline gap-xs">
                  <span id={legendId} className="text-label-md text-foreground">
                    {facet.label}
                  </span>
                  {chosen.length > 0 ? (
                    <span className="text-label-sm tabular-nums text-muted-foreground">
                      {chosen.length}
                    </span>
                  ) : null}
                  {facet.description ? (
                    <span className="text-body-sm text-muted-foreground">
                      {facet.description}
                    </span>
                  ) : null}
                </div>
                {facet.options.length === 0 ? (
                  <span className="text-body-sm text-muted-foreground">
                    {emptyLabel}
                  </span>
                ) : (
                  <ul
                    className={cn(
                      "grid gap-x-md gap-y-2xs",
                      GRID_COLUMNS[columnsOf(facet)],
                    )}
                  >
                    {facet.options.map((option, index) => {
                      const id = `${legendId}-${index}`;
                      return (
                        <li key={option.value} className="min-w-0">
                          <label
                            htmlFor={id}
                            className="flex min-w-0 cursor-pointer items-center gap-xs text-body-sm text-foreground"
                          >
                            <Checkbox
                              id={id}
                              checked={chosen.includes(option.value)}
                              onCheckedChange={(next) =>
                                toggle(facet.id, option.value, next === true)
                              }
                            />
                            <span className="truncate">{option.label}</span>
                            {option.count !== undefined ? (
                              <span className="shrink-0 text-label-sm tabular-nums text-muted-foreground">
                                {option.count}
                              </span>
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-sm border-t border-border pt-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={active === 0}
            onClick={() => onChange({})}
          >
            {clearLabel}
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            {confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
