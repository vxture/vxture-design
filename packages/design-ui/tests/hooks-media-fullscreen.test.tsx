/**
 * useMediaQuery 与 useFullscreen（连同它依赖的 FullscreenProvider）。
 *
 * 这两个在覆盖率里同样是 0%，而 Provider 是**全仓最大的一个 0% 文件**（98 行）。
 * 它们没和上一批放在一起，是因为都需要先造环境：一个要能改的 matchMedia，
 * 一个要 Provider 包起来。
 */

import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "../src/hooks/useMediaQuery";
import { useFullscreen } from "../src/hooks/useFullscreen";
import {
  FullscreenProvider,
  useFullscreenContext,
} from "../src/components/layout/fullscreen/Provider";

/* ── useMediaQuery ────────────────────────────────────────────────────────── */

/**
 * 造一个能改的 matchMedia。
 *
 * 全局 setup 里那个桩是**恒 false**——够让 Radix 构造得出来，但用它测
 * useMediaQuery 等于测一个常量。这里换成能翻转、能通知订阅者的版本。
 */
function installMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  let matches = initial;
  const mql = {
    get matches() {
      return matches;
    },
    media: "",
    onchange: null,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  };
  const spy = vi
    .spyOn(window, "matchMedia")
    .mockImplementation(() => mql as unknown as MediaQueryList);
  return {
    spy,
    listenerCount: () => listeners.size,
    set(next: boolean) {
      matches = next;
      for (const cb of [...listeners]) cb();
    },
  };
}

describe("useMediaQuery", () => {
  afterEach(() => vi.restoreAllMocks());

  it("首帧就返回当前匹配结果，不是先 false 再纠正", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  /** 它的全部意义在这里：媒体条件变了要跟着变，不是只读一次。 */
  it("媒体条件翻转时跟着变", () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
    act(() => mm.set(true));
    expect(result.current).toBe(true);
  });

  /** 卸载不退订就是内存泄漏，而且泄漏不会报错——只会越积越多。 */
  it("卸载时退订", () => {
    const mm = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(mm.listenerCount()).toBe(1);
    unmount();
    expect(mm.listenerCount()).toBe(0);
  });
});

/* ── FullscreenProvider / useFullscreen ───────────────────────────────────── */

function wrapper({ children }: { children: React.ReactNode }) {
  return <FullscreenProvider>{children}</FullscreenProvider>;
}

describe("useFullscreenContext · 用错地方要当场报错", () => {
  /**
   * 不在 Provider 里用就抛——**这比返回一个默认值好**：默认值会让调用方以为
   * 全屏能用，点下去什么都不发生，而错误发生在离病因很远的地方。
   */
  it("不在 Provider 里用会抛出可读的错误", () => {
    // React 会把渲染期抛出的错误打到 console.error，这里静音以免污染输出
    const silence = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useFullscreenContext())).toThrow(
      /FullscreenProvider/,
    );
    silence.mockRestore();
  });
});

describe("useFullscreen · 进入与退出", () => {
  afterEach(() => {
    document.body.style.overflow = "";
    vi.restoreAllMocks();
  });

  it("初始不是全屏，也没有目标", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.targetId).toBeUndefined();
  });

  it("进入后记下 targetId，退出后清掉", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel-a", el));
    expect(result.current.isFullscreen).toBe(true);
    expect(result.current.targetId).toBe("panel-a");

    act(() => result.current.exit());
    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.targetId).toBeUndefined();
  });

  it("toggle 在两态之间来回", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.toggle("panel-a", el));
    expect(result.current.isFullscreen).toBe(true);

    act(() => result.current.toggle("panel-a", el));
    expect(result.current.isFullscreen).toBe(false);
  });

  /**
   * 默认锁滚动：伪全屏铺满视口时，底下那一层还能滚就会露馅——用户以为在滚
   * 全屏内容，实际滚的是被盖住的页面。
   */
  it("默认锁滚动，退出时还回去", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel-a", el));
    expect(document.body.style.overflow).toBe("hidden");

    act(() => result.current.exit());
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  /**
   * **在全屏状态下卸载，也要把滚动还回去。**
   *
   * 这条和上一条不是一回事：上一条走 exit()，这条根本没人调 exit——路由直接跳走、
   * 父组件条件渲染掉，body 上那把 overflow:hidden 就跟着留在了下一个页面上，
   * 表现为「换了一页之后整站滚不动了」，而离病因已经很远。
   *
   * ⚠ 写这条之前 Provider 里的清理 effect 依赖数组是
   * `[state.isFullscreen, state.mode, ...]`——effect 的清理每次依赖变化都跑，
   * 于是它在**退出**时也跑了一遍，反过来把 `exitFullscreen` 里那次 unlockScroll
   * 盖住了：删掉后者，上一条用例照样绿。2026-08-26 由变异测试查出来。
   */
  it("在全屏状态下卸载，滚动锁要解开", () => {
    const { result, unmount } = renderHook(() => useFullscreen(), { wrapper });

    act(() => result.current.enter("panel-a", document.createElement("div")));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  /** 调用方传的 lockScroll 压过 Provider 的默认值。 */
  it("显式 lockScroll: false 时不锁", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel-a", el, { lockScroll: false }));
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("FullscreenProvider · 一个 Provider 管多个目标", () => {
  /**
   * targetId 存在的理由：一页可能有好几处可全屏的面板，谁在全屏由 id 认。
   * 只存一个布尔就分不出「哪一个」，两个面板会同时以为自己在全屏。
   */
  it("换目标时 targetId 跟着换", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const a = document.createElement("div");
    const b = document.createElement("div");

    act(() => result.current.enter("panel-a", a));
    expect(result.current.targetId).toBe("panel-a");

    act(() => result.current.enter("panel-b", b));
    expect(result.current.targetId).toBe("panel-b");
    expect(result.current.isFullscreen).toBe(true);
  });

  it("Provider 照常渲染 children", () => {
    render(
      <FullscreenProvider>
        <p>内容</p>
      </FullscreenProvider>,
    );
    expect(screen.getByText("内容")).toBeInTheDocument();
  });
});
