"use client";

/**
 * FilterPanel.tsx - 勾选式筛选面板 + 工具行上的触发钮。
 *
 * **@deprecated（12.10.0）改用 `FilterPopover`。** owner 2026-09-15 看过线上后否掉这一
 * 形态：「太丑了，不能当作模板，会导致大面积降级」——左侧抽屉遮住半个页面、要点「应用」
 * 才看得到结果、选项一行一个。新件贴着按钮弹出、勾一下就生效、选项网格排。
 * 本件按 050 §2 删组件是 major，所以先标弃用、下一个 major 删除；不要再新用。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * ## 为什么要这一件
 *
 * 工具行右段的筛选组原本是一串 `NativeSelect`：一个维度一个下拉、一次只能选一个值，
 * 维度一多就把工具行挤成两行，而「同时看 A 和 B 两个来源」根本表达不了。
 * owner 2026-09-15 定：搜索框留在工具行，其余筛选收进**左侧弹出的勾选面板**。
 *
 * ## 形态是定死的
 *
 * - **左侧抽屉、`sm` 挡**（平台五个面板预设之一：详情抽屉在右、筛选面板在左）。
 *   不开 `side` / `width`——筛选面板在一个平台里只有一种长相。
 * - **草稿态**：面板里的勾选先落在草稿上，「应用」才交给调用方；关掉面板（Esc、点
 *   遮罩、关闭钮）即丢弃草稿。每勾一下就重查一次，会让一张服务端分页的表在用户还没
 *   选完时来回跳。
 * - **同一维度内是「任一」，维度之间是「都要」**——这是勾选面板的通行读法；调用方
 *   按这个语义去拼查询。
 * - 触发钮带**已选数**：面板收起时，工具行上唯一能看出「现在筛着东西」的就是它。
 *
 * 文案默认英文（DS 基准语），产品在调用点覆盖。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon } from "../../../icons";
import { Button, type ButtonProps } from "../../base/form/Button";
import { Checkbox } from "../../base/form/Checkbox";
import { Label } from "../../base/form/Label";
import { Drawer } from "../../base/overlay/Drawer";

export interface FilterPanelOption {
  readonly value: string;
  readonly label: React.ReactNode;
  /** 这个值命中多少条。给了才显示；口径由调用方定（通常是全量计数）。 */
  readonly count?: number;
}

export interface FilterPanelFacet {
  /** 维度键。调用方拿它回到自己的查询参数上。 */
  readonly id: string;
  readonly label: React.ReactNode;
  /**
   * 一句话说明这一维度的特殊读法——例如标签是「全部命中」而不是面板默认的「任一」。
   * 默认读法不用写。
   */
  readonly description?: React.ReactNode;
  readonly options: readonly FilterPanelOption[];
}

/** 维度键 → 选中的值。没有选的维度可以不出现，也可以是空数组，两者等价。 */
export type FilterPanelValue = Readonly<Record<string, readonly string[]>>;

export interface FilterPanelProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly facets: readonly FilterPanelFacet[];
  /** 当前已生效的筛选。面板每次打开都从它起草。 */
  readonly value: FilterPanelValue;
  /** 点「应用」时交出草稿；面板随即关闭。 */
  readonly onApply: (value: FilterPanelValue) => void;
  readonly title?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly applyLabel?: string;
  readonly clearLabel?: string;
  readonly closeLabel?: string;
  /** 某个维度没有可选值时显示。 */
  readonly emptyLabel?: React.ReactNode;
}

/** 已选数：跨维度的值个数之和。触发钮与调用方的「重置」判断都用它。 */
export function countFilterPanelValue(value: FilterPanelValue): number {
  return Object.values(value).reduce((n, values) => n + values.length, 0);
}

function toggle(
  draft: FilterPanelValue,
  facetId: string,
  optionValue: string,
  checked: boolean,
): FilterPanelValue {
  const current = draft[facetId] ?? [];
  const next = checked
    ? current.includes(optionValue)
      ? current
      : [...current, optionValue]
    : current.filter((v) => v !== optionValue);
  return { ...draft, [facetId]: next };
}

/** @deprecated 12.10.0 起改用 `FilterPopover`，下一个 major 删除。 */
export function FilterPanel({
  open,
  onClose,
  facets,
  value,
  onApply,
  title = "Filters",
  description,
  applyLabel = "Apply",
  clearLabel = "Clear all",
  closeLabel = "Close",
  emptyLabel = "No options",
}: FilterPanelProps) {
  const [draft, setDraft] = React.useState<FilterPanelValue>(value);
  const baseId = React.useId();

  /* 每次打开都从已生效的值起草：上次关掉时丢弃的草稿不该回来。 */
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const selected = countFilterPanelValue(draft);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      width="sm"
      title={title}
      {...(description !== undefined ? { description } : {})}
      closeLabel={closeLabel}
      footer={
        <div className="flex w-full items-center justify-between gap-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraft({})}
            disabled={selected === 0}
          >
            {clearLabel}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {applyLabel}
          </Button>
        </div>
      }
    >
      <div data-slot="filter-panel" className="flex flex-col gap-xl">
        {facets.map((facet) => {
          const chosen = draft[facet.id] ?? [];
          const legendId = `${baseId}-${facet.id}`;
          return (
            <section
              key={facet.id}
              role="group"
              aria-labelledby={legendId}
              data-slot="filter-panel-facet"
              className="flex flex-col gap-sm"
            >
              <div className="flex items-center justify-between gap-sm">
                <span id={legendId} className="text-label-md text-foreground">
                  {facet.label}
                </span>
                {chosen.length > 0 ? (
                  <span className="text-label-sm tabular-nums text-muted-foreground">
                    {chosen.length}
                  </span>
                ) : null}
              </div>
              {facet.description ? (
                <span className="text-body-sm text-muted-foreground">
                  {facet.description}
                </span>
              ) : null}
              {facet.options.length === 0 ? (
                <span className="text-body-sm text-muted-foreground">
                  {emptyLabel}
                </span>
              ) : (
                <ul className="flex flex-col gap-xs">
                  {facet.options.map((option, index) => {
                    const id = `${legendId}-${index}`;
                    const checked = chosen.includes(option.value);
                    return (
                      <li
                        key={option.value}
                        className="flex items-center gap-sm"
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(next) =>
                            setDraft((d) =>
                              toggle(d, facet.id, option.value, next === true),
                            )
                          }
                        />
                        <Label
                          htmlFor={id}
                          className="min-w-0 flex-1 text-body-md"
                        >
                          <span className="truncate">{option.label}</span>
                        </Label>
                        {option.count !== undefined ? (
                          <span className="text-label-sm tabular-nums text-muted-foreground">
                            {option.count}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Drawer>
  );
}

export type FilterPanelTriggerProps = Omit<ButtonProps, "children"> & {
  /** 已生效的筛选个数（`countFilterPanelValue`）。0 不显示角标。 */
  readonly activeCount?: number;
  readonly label?: string;
};

/**
 * 工具行上的「筛选」钮。放进 `FilterBar` 的筛选组槽（`children`），位置随契约排在
 * 重置之后、操作区之前。
 */
/** @deprecated 12.10.0 起改用 `FilterPopover`（自带触发钮），下一个 major 删除。 */
export const FilterPanelTrigger = React.forwardRef<
  HTMLButtonElement,
  FilterPanelTriggerProps
>(function FilterPanelTrigger(
  { activeCount = 0, label = "Filters", className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="md"
      aria-label={activeCount > 0 ? `${label} (${activeCount})` : label}
      className={cn("gap-xs", className)}
      {...(props as ButtonProps)}
    >
      <Icon name="filter" size="sm" aria-hidden="true" />
      <span>{label}</span>
      {activeCount > 0 ? (
        <span
          data-slot="filter-panel-count"
          className="inline-flex min-w-control-2xs items-center justify-center rounded-full bg-primary px-2xs text-label-sm tabular-nums text-primary-foreground"
        >
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
});
