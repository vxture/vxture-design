/**
 * Pagination.tsx - 分页（自有实现，非 shadcn 上游件）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Navigation
 *
 * 上游 Pagination 是一组基于 <a href> 的组合件，面向 URL 驱动的分页；工作台里的
 * 分页全是受控回调（`page` + `onPageChange`，配合客户端筛选与 pageSize），两者
 * 的取数模型不同，不是同一个东西。故保留受控 API，只把取值换成 T2 语义类。
 *
 * 视觉基座仍是本仓 Button——分页按钮与页面其他按钮的尺寸、焦点环、禁用态由此
 * 自动一致，不另起一套。
 *
 * 原实现挂了 .vx-pagination（随遗留样式层退役），且间距与字号用的是不跟随
 * 密度 / 字号三档的裸数值。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon } from "../../../icons";
import type { IconName } from "../../../icons";
import { Button } from "../form/Button";
import { SegmentedControl } from "../form/SegmentedControl";

/**
 * 每页条数的取值：一律是具体的条数。
 *
 * 曾有 `"auto"` 档（按可视高度解析行数），owner 2026-09-25 决定全面删除。
 */
export type PageSizeChoice = number;

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  readonly page: number;
  readonly pageCount: number;
  readonly total?: number;
  /** 筛选后的条数：与 `total` 不同时，左侧计数语补"当前筛选 N 条"。 */
  readonly filteredTotal?: number;
  /** 当前选中的每页条数。 */
  readonly pageSize?: PageSizeChoice;
  /** 给了 `onPageSizeChange` 才出每页条数选择器（翻页条左邻）。 */
  readonly pageSizeOptions?: readonly PageSizeChoice[];
  readonly onPageSizeChange?: (pageSize: PageSizeChoice) => void;
  readonly onPageChange: (page: number) => void;
  /**
   * 覆盖左侧计数语。
   *
   * 默认那句「共 N 条记录」覆盖了绝大多数列表，口子只为它说不了的情形留：数的
   * 不是一样东西时（admin 服务套餐页要同时报"N 个方案、M 个套餐"），`total` 与
   * `filteredTotal` 都表达不了。
   */
  readonly countLabel?: React.ReactNode;
  /**
   * 四个翻页按钮（首页 / 上一页 / 下一页 / 末页）的可访问名。按钮只画图标
   * （|< ‹ › >|），这几个名字落在 `aria-label` 与 `title` 上——读屏器念它，悬停
   * 时浮出来，版面上不占字。做 i18n 的消费方照旧传入本地化文案。
   */
  readonly firstLabel?: string;
  readonly previousLabel?: string;
  readonly nextLabel?: string;
  readonly lastLabel?: string;
  /** 每页条数选择器的可访问名。默认「每页条数」。 */
  readonly pageSizeLabel?: string;
  /**
   * 每页条数各档的可访问名模板，`{size}` 是槽位。默认「每页 {size} 条」。
   *
   * 收模板而不是拼串：`每页 N 条` 的语序是中文的，英文得是 `{size} per page`，
   * 件替调用方拼就等于替它定了语序（同 `ConfirmDestructive.titleTemplate`）。
   */
  readonly pageSizeOptionTemplate?: string;
}

const DEFAULT_PAGE_SIZES: readonly PageSizeChoice[] = [10, 20, 50, 100];

function getVisiblePages(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  return Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, index) => start + index,
  );
}

function Pagination({
  className,
  page,
  pageCount,
  total,
  filteredTotal,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageSizeChange,
  onPageChange,
  countLabel,
  firstLabel = "First page",
  previousLabel = "Previous page",
  nextLabel = "Next page",
  lastLabel = "Last page",
  pageSizeLabel = "Rows per page",
  pageSizeOptionTemplate = "{size} per page",
  ...props
}: PaginationProps) {
  const safePageCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safePageCount);
  const pages = getVisiblePages(safePage, safePageCount);

  return (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-between gap-sm",
        className,
      )}
      aria-label="Pagination"
      {...props}
    >
      {/* 左侧计数语（admin 翻页惯例）：总数常驻，筛选生效时补一段。 */}
      <div className="text-body-sm text-muted-foreground">
        {countLabel ??
          (typeof total === "number"
            ? `${total} records${
                typeof filteredTotal === "number" && filteredTotal !== total
                  ? ` / ${filteredTotal} filtered`
                  : ""
              }`
            : `Page ${safePage} of ${safePageCount}`)}
      </div>
      {/* 每页条数与翻页条之间留大距（gap-2xl）：两组都是数字按钮，贴近了
          会读成同一排页码。 */}
      <div className="flex flex-wrap items-center gap-2xl">
        {onPageSizeChange && pageSize !== undefined ? (
          /* 按钮化的每页条数（承旧 PageSizePicker，载体为 SegmentedControl）：
             纯数字、不带标签文字——档位一眼即懂；语义留给 aria-label。 */
          <SegmentedControl
            /* md(32) 而不是 sm(28)：它与右侧翻页按钮同处一行，翻页按钮是
               control-md。差 4px 时两组数字按钮的基线对不齐，一眼能看出来
               （2026-08-04 opera/atlas/router 实测）。 */
            size="md"
            ariaLabel={pageSizeLabel}
            value={pageSize}
            onChange={onPageSizeChange}
            items={pageSizeOptions.map((option) => ({
              value: option,
              label: option,
              ariaLabel: pageSizeOptionTemplate.replaceAll(
                "{size}",
                String(option),
              ),
            }))}
          />
        ) : null}
        {/* 翻页按钮一律只画图标：|< ‹ 页码 › >|。文字版「上一页 / 下一页」在
            中英文下宽度差一倍，把整排页码推来推去；图标四个等宽，页码的位置
            在任何语言下都稳定。名字进 aria-label / title，可访问性不丢。 */}
        <div className="flex items-center gap-2xs">
          <PageStepButton
            icon="caret-line-left"
            label={firstLabel}
            disabled={safePage <= 1}
            onClick={() => onPageChange(1)}
          />
          <PageStepButton
            icon="chevron-left"
            label={previousLabel}
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          />
          {pages.map((item) => (
            <Button
              key={item}
              variant={item === safePage ? "default" : "ghost"}
              size="md"
              aria-current={item === safePage ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ))}
          <PageStepButton
            icon="chevron-right"
            label={nextLabel}
            disabled={safePage >= safePageCount}
            onClick={() => onPageChange(safePage + 1)}
          />
          <PageStepButton
            icon="caret-line-right"
            label={lastLabel}
            disabled={safePage >= safePageCount}
            onClick={() => onPageChange(safePageCount)}
          />
        </div>
      </div>
    </nav>
  );
}

/**
 * 翻页按钮：只画图标，名字进 `aria-label` 与 `title`。
 *
 * `icon-md` 与页码按钮同高（control-md），正方形——四个翻页键等宽，页码不会因为
 * 两端按钮的文字长短被推来推去。outline 与页码的 ghost 区分开：两端是「走」，
 * 中间是「到」。
 */
function PageStepButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon-md"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size="sm" aria-hidden="true" />
    </Button>
  );
}

export { Pagination };
