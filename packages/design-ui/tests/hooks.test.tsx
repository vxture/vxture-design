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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useListPagination } from "../src/hooks/useListPagination";
import { useControllableState } from "../src/hooks/useControllableState";
import { useBreakpoint } from "../src/hooks/useBreakpoint";
import { useMounted } from "../src/hooks/useMounted";

const rows = Array.from({ length: 25 }, (_, i) => "row-" + (i + 1));

const PROBE_HTML =
  '<main><table><tbody><tr id="probe"><td>x</td></tr></tbody></table></main>';

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

  /** pageSize 返回的是**选中的档**，不是解析后的行数——它要喂回 Pagination。 */
  it("pageSize 回传的是档本身", () => {
    const { result } = renderHook(() => useListPagination(rows, 20));
    expect(result.current.pageSize).toBe(20);
  });
});

describe("useListPagination · auto 档的高度探测", () => {
  /**
   * 这一节钉的是 2026-08-07 在 opera 维护窗口页实测到的真实故障：
   *
   * 探测拿 `main` 里第一个列表行的高度算「一屏放几行」。而**异步取数的清单页
   * 首帧只有空态那一行**（高度是一屏 EmptyState 的高度），拿它当行高算出来的
   * 档必然砸到地板 MIN_AUTO_ROWS(3)。945px 视口本可放 6 行，实际只出 3 行；
   * 同步喂 mock 的页面碰不到，所以一直没露头。
   *
   * 修法是把 `hasRows` 放进 effect 依赖：数据从无到有的那一帧重量一次。
   */
  const origHeight = window.innerHeight;

  function mountProbe(rowHeight: number, top: number) {
    document.body.innerHTML = PROBE_HTML;
    const tr = document.getElementById("probe") as HTMLElement;
    vi.spyOn(tr, "getBoundingClientRect").mockReturnValue({
      height: rowHeight,
      top,
      bottom: top + rowHeight,
      left: 0,
      right: 0,
      width: 100,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect);
    return tr;
  }

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      value: 945,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerHeight", {
      value: origHeight,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("有真实行时按行高解析：945px 视口 / 56px 行高 → 6 行", () => {
    mountProbe(56, 500);
    // (945 - 500 - 104) / 56 = 6.08 → 6
    const { result } = renderHook(() => useListPagination(rows, "auto"));
    expect(result.current.pageRows).toHaveLength(6);
  });

  /**
   * 空态那一行很高，算出来会砸到地板。这条钉的是**探测规则本身**——它必须
   * 依然砸到地板，因为那是规则的正确结果；真正的修法是数据到了之后重量一次。
   */
  it("只有空态行时砸到地板值 3", () => {
    mountProbe(400, 300);
    const { result } = renderHook(() => useListPagination(rows, "auto"));
    expect(result.current.pageRows).toHaveLength(3);
  });

  /**
   * **这条是那次修复的核心**：异步页首帧量到空态行（3 行地板），数据到达后
   * 必须重量一次。谁把 `hasRows` 从 effect 依赖里拿掉，这里会红——而界面上
   * 只表现为「一屏明明放得下 6 行却只显示 3 行」。
   */
  it("数据从无到有时重量一次，不停在地板值上", () => {
    mountProbe(400, 300);
    const { result, rerender } = renderHook(
      ({ data }: { data: readonly string[] }) =>
        useListPagination(data, "auto"),
      { initialProps: { data: [] as readonly string[] } },
    );
    expect(result.current.pageRows).toHaveLength(0);

    act(() => {
      mountProbe(56, 500);
    });
    rerender({ data: rows });
    expect(result.current.pageRows).toHaveLength(6);
  });

  it("探不到任何行时用兜底 10", () => {
    document.body.innerHTML = "<main></main>";
    const { result } = renderHook(() => useListPagination(rows, "auto"));
    expect(result.current.pageRows).toHaveLength(10);
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
