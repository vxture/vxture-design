/**
 * hooks 的行为回归。
 *
 * 这几个 hook 在覆盖率里全是 0%——而它们**从来不在按「件名」排的清单里**，
 * 因为不是组件。第一次量覆盖率才把它们揪出来。
 *
 * 它们是纯逻辑：没有样式判断、没有浮层时序，测起来最便宜，出错却最难看出来
 * ——状态算错只表现为「页码不对」「断点不对」，一眼看去像数据问题。
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useListPagination } from "../src/hooks/useListPagination";
import { useControllableState } from "../src/hooks/useControllableState";
import { useBreakpoint } from "../src/hooks/useBreakpoint";
import { useMounted } from "../src/hooks/useMounted";

const rows = Array.from({ length: 25 }, (_, i) => "row-" + (i + 1));

describe("useListPagination · 切片与序号", () => {
  it("固定档：按档切片，pageCount 向上取整", () => {
    const { result } = renderHook(() => useListPagination(rows, 10));
    expect(result.current.pageCount).toBe(3);
    expect(result.current.pageRows).toHaveLength(10);
    expect(result.current.pageRows[0]).toBe("row-1");
  });

  /** 序号列**跨页递进**——每页都从 1 开始的话，序号就不是序号了。 */
  it("indexStart 跨页递进", () => {
    const { result } = renderHook(() => useListPagination(rows, 10));
    expect(result.current.indexStart).toBe(1);
    act(() => result.current.onPageChange(2));
    expect(result.current.indexStart).toBe(11);
    expect(result.current.pageRows[0]).toBe("row-11");
    act(() => result.current.onPageChange(3));
    expect(result.current.indexStart).toBe(21);
    expect(result.current.pageRows).toHaveLength(5);
  });

  /** 越界的 page 要夹回去，而不是切出一片空。 */
  it("页码越界时夹回最后一页", () => {
    const { result } = renderHook(() => useListPagination(rows, 10));
    act(() => result.current.onPageChange(99));
    expect(result.current.page).toBe(3);
    expect(result.current.pageRows).toHaveLength(5);
  });

  it("空列表也有一页，不是零页", () => {
    const { result } = renderHook(() => useListPagination([], 10));
    expect(result.current.pageCount).toBe(1);
    expect(result.current.pageRows).toHaveLength(0);
    expect(result.current.indexStart).toBe(1);
  });

  /**
   * 换档要回第一页。
   *
   * ⚠ 断言必须落在 **pageRows** 上，不能只看 page：第一版写的是「25 行，第 3 页，
   * 换成每页 50」——换档后 pageCount 变 1，**越界夹回把缺陷掩盖了**，page 无论
   * 回不回第一页都是 1。变异测试当场戳穿：把 setPage(1) 删掉，用例照样绿。
   *
   * 换成「换到每页 5」：pageCount 变 5，旧的第 3 页**仍然合法**，于是不回第一页
   * 就会停在 row-11 那一批——用户换了个更小的档，看到的却是中间一段。
   */
  it("换每页条数时回第一页（看的是切片，不是页码）", () => {
    const { result } = renderHook(() => useListPagination(rows, 10));
    act(() => result.current.onPageChange(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.onPageSizeChange(5));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(5);
    expect(result.current.pageRows[0]).toBe("row-1");
    expect(result.current.indexStart).toBe(1);
  });

  it("resetPage 回第一页——筛选条件变了要重头看", () => {
    const { result } = renderHook(() => useListPagination(rows, 10));
    act(() => result.current.onPageChange(2));
    act(() => result.current.resetPage());
    expect(result.current.page).toBe(1);
  });

  /** pageSize 原样回传，要喂回 Pagination。 */
  it("pageSize 回传的是档本身", () => {
    const { result } = renderHook(() => useListPagination(rows, 20));
    expect(result.current.pageSize).toBe(20);
  });

  /**
   * 缺省每页 20 条（owner 2026-09-25）。此前缺省是 "auto"（按可视高度量行高），
   * 已全面删除。
   */
  it("不传每页条数时缺省 20", () => {
    const { result } = renderHook(() => useListPagination(rows));
    expect(result.current.pageSize).toBe(20);
    expect(result.current.pageRows).toHaveLength(20);
    expect(result.current.pageCount).toBe(2);
  });
});

describe("useControllableState · 受控与非受控", () => {
  it("给了 value 就是受控：内部不改值，只走 onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: "a", onChange }),
    );
    act(() => result.current[1]("b"));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(result.current[0]).toBe("a");
  });

  it("不给 value 就是非受控：内部改值，同时也走 onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: "a", onChange }),
    );
    act(() => result.current[1]("b"));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(result.current[0]).toBe("b");
  });

  /**
   * 受控时**不许写内部状态**。
   *
   * 这条只在「受控 → 非受控」那一刻才看得见：受控期间 currentValue 只看 value，
   * 内部值被污染了外部也发现不了。第一版没测这个转换，于是把 `if (!isControlled)`
   * 删掉用例照样绿——变异测试戳穿的。
   *
   * 转换本身是真实场景：表单字段从「跟随外部」切到「用户自己编辑」。
   */
  it("受控期间不污染内部状态——撤掉 value 后回到 defaultValue", () => {
    const { result, rerender } = renderHook(
      // `value?: string | undefined` 而不是 `value?: string`：本仓开了
      // exactOptionalPropertyTypes，后者不接受**显式**传 undefined——而这条用例
      // 的整个意思就是「显式撤掉 value」。
      ({ value }: { value?: string | undefined }) =>
        useControllableState({ value, defaultValue: "初始" }),
      { initialProps: { value: "受控值" } as { value?: string | undefined } },
    );
    expect(result.current[0]).toBe("受控值");

    act(() => result.current[1]("受控期间的写入"));
    expect(result.current[0]).toBe("受控值");

    // 撤掉 value → 落回内部状态。若受控期间写过内部状态，这里会拿到那次写入
    rerender({ value: undefined });
    expect(result.current[0]).toBe("初始");
  });

  /** value 为 undefined 才算非受控——空字符串是个合法的受控值。 */
  it("空字符串是合法的受控值，不当成非受控", () => {
    const { result } = renderHook(() =>
      useControllableState({ value: "", defaultValue: "fallback" }),
    );
    expect(result.current[0]).toBe("");
  });
});

describe("useBreakpoint · 与 Tailwind 断点一致", () => {
  const orig = window.innerWidth;
  const setWidth = (w: number) =>
    Object.defineProperty(window, "innerWidth", {
      value: w,
      writable: true,
      configurable: true,
    });
  afterEach(() => setWidth(orig));

  /** 边界取「大于等于」——639 还是 base，640 就进 sm。差一像素就差一档。 */
  it.each([
    [320, "base"],
    [639, "base"],
    [640, "sm"],
    [767, "sm"],
    [768, "md"],
    [1023, "md"],
    [1024, "lg"],
    [1279, "lg"],
    [1280, "xl"],
    [1535, "xl"],
    [1536, "2xl"],
  ])("宽 %ipx → %s", (width, expected) => {
    setWidth(width as number);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe(expected);
  });

  /** isXx 是「该档或更大」，不是「正好这一档」。 */
  it("isXx 是「或更大」，宽屏时低档也为真", () => {
    setWidth(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isSm).toBe(true);
    expect(result.current.isMd).toBe(true);
    expect(result.current.isLg).toBe(true);
    expect(result.current.isXl).toBe(true);
    expect(result.current.is2xl).toBe(false);
  });
});

describe("useMounted · 挂载后为真", () => {
  it("挂载后为真", () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });
});
