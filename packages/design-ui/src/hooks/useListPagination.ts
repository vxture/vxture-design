"use client";

/**
 * useListPagination.ts - 列表页翻页状态：页码 / 每页条数 / 序号起点。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Hooks
 *
 * 与 `Pagination` 配套：那件负责翻页条长什么样，本 hook 负责它背后的状态与
 * 切片。收进 DS 的依据是产品实据——opera 六个清单页与 console 的成员 / 角色
 * 页用的是同一份实现（2026-08-04 之前各存一份拷贝）。
 *
 * 纯客户端切片。接服务端分页时换掉 `pageRows` 的来源即可，其余返回值不变。
 *
 * 每页条数一律是具体数字，缺省 20。曾有 `"auto"` 档（按可视高度量行高解析行数，
 * 且是缺省值），owner 2026-09-25 决定全面删除。
 */

import { useMemo, useState } from "react";
import type { PageSizeChoice } from "../components/base/navigation/Pagination";

/** 缺省每页条数（owner 2026-09-25）。 */
const DEFAULT_PAGE_SIZE = 20;

export interface UseListPaginationReturn<T> {
  readonly page: number;
  readonly pageCount: number;
  /** 当前每页条数（喂给 `Pagination` 的 pageSize）。 */
  readonly pageSize: PageSizeChoice;
  readonly pageRows: readonly T[];
  /** 序号列起点：跨页递进。 */
  readonly indexStart: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (size: PageSizeChoice) => void;
  /** 筛选条件变化时回第一页。 */
  readonly resetPage: () => void;
}

export function useListPagination<T>(
  filtered: readonly T[],
  initialPageSize: PageSizeChoice = DEFAULT_PAGE_SIZE,
): UseListPaginationReturn<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeChoice>(initialPageSize);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  return {
    page: safePage,
    pageCount,
    pageSize,
    pageRows,
    indexStart: (safePage - 1) * pageSize + 1,
    onPageChange: setPage,
    onPageSizeChange: (size: PageSizeChoice) => {
      setPageSize(size);
      setPage(1);
    },
    resetPage: () => setPage(1),
  };
}
